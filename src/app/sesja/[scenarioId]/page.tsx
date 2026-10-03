"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { ClientBrief, LiveCaption, TrustMeter, VoiceControls, VoiceVisualizer, type BriefData, type Speaker } from "@/components/ivory/session";
import { Badge, Button, Dialog, PageHead, SegmentedTabs } from "@/components/ivory/ui";
import { usePatientSession } from "@/hooks/usePatientSession";
import { listScenarios, type ScenarioCard } from "@/lib/queries";
import type { SessionMode } from "@/lib/types";

const MODES = ["Trening", "Egzamin"] as const;

function toBrief(s: ScenarioCard): BriefData {
  return {
    module: s.module,
    name: s.personas.name,
    age: s.personas.age,
    occupation: s.personas.occupation ?? undefined,
    situation: s.personas.vars.historia,
    reason: `${s.briefing.source}: ${s.briefing.reason}`,
    background: [...s.briefing.known, s.briefing.note].filter(Boolean).join(" · "),
    unknown: s.briefing.unknown,
    goal: s.goal ?? undefined,
  };
}

export default function SessionPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = use(params);
  return (
    <ConversationProvider>
      <SessionFlow scenarioId={scenarioId} />
    </ConversationProvider>
  );
}

function SessionFlow({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const [all, setAll] = useState<ScenarioCard[] | null>(null);
  const [mode, setMode] = useState<(typeof MODES)[number]>("Trening");
  const [consent, setConsent] = useState(true);
  const s = usePatientSession();

  useEffect(() => {
    listScenarios().then(setAll).catch(console.error);
  }, []);

  useEffect(() => {
    if (s.phase === "done" && s.sessionId) router.push(`/raporty/${s.sessionId}`);
  }, [s.phase, s.sessionId, router]);

  const scenario = all?.find((x) => x.id === scenarioId);
  if (all && !scenario) {
    return <PageHead eyebrow="Nie znaleziono" title="Ten scenariusz nie istnieje" right={<Button href="/moduly">Moduły</Button>} />;
  }
  if (!scenario) return <div style={{ font: "var(--type-body-s)", color: "var(--text-tertiary)" }}>Ładowanie…</div>;

  const pool = all!.filter((x) => x.module === scenario.module);
  const brief = toBrief(scenario);

  if (s.phase === "idle" || s.phase === "error") {
    const reroll = () => {
      const others = pool.filter((p) => p.id !== scenario.id);
      if (others.length) router.replace(`/sesja/${others[Math.floor(Math.random() * others.length)].id}`);
    };
    return (
      <div style={{ display: "grid", gap: 32, maxWidth: 760 }}>
        <Link href="/moduly" style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
          <ArrowLeft size={16} strokeWidth={1.5} />Moduły
        </Link>
        <PageHead eyebrow={`Moduł · ${scenario.module}`} title="Twój pacjent" />
        <ClientBrief {...brief} />
        <div style={{ display: "grid", gap: 16, padding: 24, background: "var(--surface-raised)", border: "1px solid var(--line-subtle)", borderRadius: "var(--radius-l)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ font: "var(--type-body)", fontWeight: 500 }}>Tryb sesji</span>
              <span style={{ font: "var(--type-body-s)", color: "var(--text-secondary)" }}>
                {mode === "Trening" ? "Widzisz na żywo, jak zmienia się zaufanie pacjenta." : "Wskaźnik zaufania jest ukryty – zobaczysz go dopiero w raporcie."}
              </span>
            </div>
            <SegmentedTabs items={[...MODES]} value={mode} onChange={setMode} />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, font: "var(--type-body-s)", color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--graphite-900)" }} />
            Zgadzam się na nagranie rozmowy na potrzeby raportu. Nagranie i transkrypt są przechowywane 30 dni i możesz je usunąć w każdej chwili. Analizujemy treść wypowiedzi, nie emocje w głosie.
          </label>
        </div>
        {s.error && <span style={{ font: "var(--type-body-s)", color: "var(--negative-text)" }}>{s.error}</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button size="l" disabled={!consent} iconRight={<ArrowRight size={18} strokeWidth={1.5} />}
            onClick={() => s.start(scenario.id, (mode === "Trening" ? "training" : "exam") as SessionMode)}>
            Rozpocznij symulację
          </Button>
          <Button size="l" variant="secondary" iconLeft={<Shuffle size={18} strokeWidth={1.5} />} disabled={pool.length < 2} onClick={reroll}>
            Losuj innego pacjenta
          </Button>
          <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", marginLeft: 8 }}>
            {pool.length} {pool.length === 1 ? "pacjent" : pool.length < 5 ? "pacjentów" : "pacjentów"} w puli
          </span>
        </div>
      </div>
    );
  }

  return <LiveSession session={s} brief={brief} training={mode === "Trening"} />;
}

function LiveSession({ session: s, brief, training }: { session: ReturnType<typeof usePatientSession>; brief: BriefData; training: boolean }) {
  const [captions, setCaptions] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [sec, setSec] = useState(0);
  const [youTalking, setYouTalking] = useState(false);
  const first = brief.name.split(" ")[0];

  useEffect(() => {
    if (s.phase !== "live") return;
    const id = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [s.phase]);

  // Detect the trainee speaking from mic volume (only to animate the visualizer; nothing is stored).
  useEffect(() => {
    if (s.phase !== "live") return;
    const id = setInterval(() => {
      try { setYouTalking(!s.isSpeaking && !s.isMuted && s.getInputVolume() > 0.08); } catch { /* not connected yet */ }
    }, 120);
    return () => clearInterval(id);
  }, [s]);

  const speaker: Speaker = s.isSpeaking ? "client" : youTalking ? "you" : "idle";
  const getOut = s.getOutputVolume;
  const getIn = s.getInputVolume;
  const getLevel = useCallback(() => (speaker === "client" ? getOut() : speaker === "you" ? getIn() : 0), [speaker, getOut, getIn]);

  const last = s.transcript.at(-1);
  const time = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const lastDelta = s.trustHistory.length > 1 ? s.trustHistory.at(-1)!.delta : null;
  const recentUnlock = s.lastUnlockAt != null && Date.now() - s.lastUnlockAt < 8000;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 32, height: "calc(100vh - 64px - 64px)", minHeight: 560 }}>
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 16, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge tone={s.phase === "live" ? "accent" : "neutral"} dot>
            {s.phase === "connecting" ? "Łączenie…" : s.phase === "finishing" ? "Kończenie i ocena…" : "Sesja trwa"}
          </Badge>
          <span style={{ font: "var(--type-mono)", color: "var(--text-tertiary)" }}>{time}</span>
          {s.isMuted && <Badge tone="warm">Mikrofon wyciszony</Badge>}
          {!training && <Badge>Tryb egzaminu</Badge>}
        </div>
        <div style={{ display: "grid", placeItems: "center", alignContent: "center", gap: 32, minHeight: 0 }}>
          <VoiceVisualizer speaker={speaker} getLevel={getLevel} name={brief.name}
            label={s.phase === "connecting" ? "Łączenie z pacjentem…" : s.phase === "finishing" ? "Analizuję rozmowę…" : undefined} size={300} />
          <div style={{ minHeight: 84, display: "grid", placeItems: "start center" }}>
            {captions && last && <LiveCaption key={`${s.transcript.length}-${last.role}`} speaker={last.role === "therapist" ? "you" : "client"} name={first} text={last.text} />}
          </div>
        </div>
        <div style={{ paddingBottom: 8 }}>
          <VoiceControls muted={s.isMuted} onMute={() => s.setMuted(!s.isMuted)} captions={captions} onCaptions={() => setCaptions((x) => !x)} onEnd={() => setConfirmEnd(true)} />
        </div>
      </div>
      <aside style={{ overflowY: "auto", minHeight: 0, display: "grid", gap: 16, alignContent: "start" }}>
        {training && s.trust != null && <TrustMeter trust={s.trust} delta={lastDelta} pulse={recentUnlock} />}
        <ClientBrief compact {...brief} />
        <span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", padding: "0 4px" }}>
          Powiedz „STOP”, żeby wyjść z roli i przerwać ćwiczenie.
        </span>
      </aside>
      <Dialog open={confirmEnd} onClose={() => setConfirmEnd(false)} title="Zakończyć sesję?"
        description="Otrzymasz ocenę od 1 do 100, cytaty z rozmowy i konkretne propozycje lepszych wypowiedzi."
        actions={<>
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Kontynuuj</Button>
          <Button onClick={() => { setConfirmEnd(false); void s.finish(); }}>Zakończ i oceń</Button>
        </>} />
    </div>
  );
}
