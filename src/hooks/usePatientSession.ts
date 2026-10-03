"use client";

// Core session loop: start → live voice call → director after every therapist turn → finalize.
// Must be used inside <ConversationProvider>.

import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef, useState } from "react";
import { callFn } from "@/lib/supabase";
import type { DirectorResponse, SessionMode, StartResponse, TranscriptLine } from "@/lib/types";

export type Phase = "idle" | "connecting" | "live" | "finishing" | "done" | "error";

export type TrustSample = { t_s: number; trust: number; delta: number };

export function usePatientSession() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trust, setTrust] = useState<number | null>(null);
  const [trustHistory, setTrustHistory] = useState<TrustSample[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [lastUnlockAt, setLastUnlockAt] = useState<number | null>(null);

  const sessionRef = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const lastPatientText = useRef<string>("");
  const lastAgentAt = useRef(0);
  const lastAgentResponseId = useRef<string | undefined>(undefined);
  const directorQueue = useRef<Promise<void>>(Promise.resolve());
  const finishing = useRef(false);
  /** Last typed message – the server may echo it back as a user transcript; don't count it twice. */
  const lastTyped = useRef<{ text: string; at: number } | null>(null);

  const elapsed = () => (startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      startedAt.current = Date.now();
      setPhase("live");
      const id = sessionRef.current;
      if (id) {
        callFn("session-start", { action: "bind", session_id: id, conversation_id: conversationId }).catch((err) =>
          console.error("bind failed", err),
        );
      }
    },
    onMessage: (msg) => {
      const text = msg.message?.trim();
      if (!text) return;
      const t_s = elapsed();
      if (msg.role === "agent") {
        lastPatientText.current = text;
        // Streamed parts of one response share response_id – replace instead of appending.
        // A new response right after the previous one with no therapist turn in between is a
        // regenerated reply (guardrail retry / interruption) – replace it too, so it isn't shown twice.
        const quickRedo = Date.now() - lastAgentAt.current < 6000;
        lastAgentAt.current = Date.now();
        setTranscript((lines) => {
          if (lines.at(-1)?.role === "patient" && ((msg.response_id && msg.response_id === lastAgentResponseId.current) || quickRedo)) {
            return [...lines.slice(0, -1), { role: "patient", text, t_s: lines.at(-1)!.t_s }];
          }
          return [...lines, { role: "patient", text, t_s }];
        });
        lastAgentResponseId.current = msg.response_id;
        return;
      }
      // Silence/noise arrives as "..." – not a therapist turn, don't score it.
      if (!/\p{L}/u.test(text)) return;
      const typed = lastTyped.current;
      if (typed && typed.text === text && Date.now() - typed.at < 15000) {
        lastTyped.current = null;
        return;
      }
      setTranscript((lines) => [...lines, { role: "therapist", text, t_s }]);
      enqueueDirector(text, lastPatientText.current, t_s);
    },
    onDisconnect: () => {
      // The patient may end the call itself (end_call after the goodbye) – evaluate anyway.
      void finish();
    },
    onError: (message) => {
      console.error("conversation error", message);
      setError("Połączenie z pacjentem zostało przerwane.");
    },
  });

  const sendUpdate = conversation.sendContextualUpdate;

  const enqueueDirector = (therapistText: string, patientText: string, t_s: number) => {
    const id = sessionRef.current;
    if (!id) return;
    directorQueue.current = directorQueue.current.then(async () => {
      try {
        const res = await callFn<DirectorResponse>("director", {
          session_id: id,
          therapist_text: therapistText,
          patient_text: patientText || undefined,
          t_s,
        });
        setTrust(res.trust);
        setTrustHistory((h) => [...h, { t_s, trust: res.trust, delta: res.delta }]);
        if (res.unlocked) setLastUnlockAt(Date.now());
        if (!finishing.current) sendUpdate(res.update_text);
      } catch (err) {
        console.error("director failed", err);
      }
    });
  };

  const start = useCallback(
    async (scenarioId: string, mode: SessionMode, previousSessionId?: string) => {
      setError(null);
      setTranscript([]);
      setTrustHistory([]);
      finishing.current = false;
      setPhase("connecting");
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const res = await callFn<StartResponse>("session-start", {
          scenario_id: scenarioId,
          mode,
          ...(previousSessionId ? { previous_session_id: previousSessionId } : {}),
        });
        sessionRef.current = res.session_id;
        setSessionId(res.session_id);
        setTrust(res.trust);
        setTrustHistory([{ t_s: 0, trust: res.trust, delta: 0 }]);
        conversation.startSession({
          signedUrl: res.signed_url,
          connectionType: "websocket",
          dynamicVariables: res.dynamic_variables,
          overrides: res.overrides,
        });
      } catch (err) {
        setPhase("error");
        setError(
          err instanceof DOMException
            ? "Potrzebujemy dostępu do mikrofonu, żeby rozpocząć rozmowę."
            : err instanceof Error
              ? err.message
              : "Nie udało się rozpocząć sesji.",
        );
      }
    },
    [conversation],
  );

  /** Ends the call, waits for pending director turns, then starts the evaluation. */
  const finish = useCallback(async (): Promise<string | null> => {
    const id = sessionRef.current;
    if (!id || finishing.current) return id;
    finishing.current = true;
    setPhase("finishing");
    try {
      conversation.endSession();
    } catch { /* already disconnected */ }
    await directorQueue.current;
    try {
      await callFn("finalize", { session_id: id });
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Nie udało się zakończyć sesji.");
    }
    return id;
  }, [conversation]);

  /** Typed alternative to speaking: goes to the patient and through the director like a voice turn. */
  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || phase !== "live") return;
      const t_s = elapsed();
      lastTyped.current = { text, at: Date.now() };
      conversation.sendUserMessage(text);
      setTranscript((lines) => [...lines, { role: "therapist", text, t_s }]);
      enqueueDirector(text, lastPatientText.current, t_s);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversation, phase],
  );

  return {
    phase,
    error,
    sessionId,
    trust,
    trustHistory,
    transcript,
    lastUnlockAt,
    isSpeaking: conversation.isSpeaking,
    isMuted: conversation.isMuted,
    setMuted: conversation.setMuted,
    getOutputVolume: conversation.getOutputVolume,
    getInputVolume: conversation.getInputVolume,
    start,
    finish,
    sendText,
  };
}
