// Edge Function: start a training session.
//   POST { scenario_id, mode, previous_session_id? } → creates the session, returns a signed WebSocket URL
//                                                 + dynamic variables + voice override.
//     With previous_session_id it is a follow-up visit: the previous transcript and summary go to the
//     agent as {{poprzednia_wizyta}}; trust and DISCOVERED hidden needs carry over (unexplored ones don't).
// WebSocket (not WebRTC): over LiveKit the conversation_initiation_client_data was not delivered,
// so the agent never received its variables and stayed silent.
//   POST { action: "bind", session_id, conversation_id } → links the ElevenLabs conversation, marks live
// Hidden needs are never sent to the browser here; the director feeds them to the actor later.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@4";
import { db, eleven, getConfig, HttpError, json, requireUser, serve } from "../_shared/common.ts";
import { buildPatientVariables } from "../_shared/patient-prompt.ts";

const MAX_PREVIOUS_CHARS = 6000;

const StartBody = z.object({
  scenario_id: z.guid(), // seeded ids are not RFC-variant UUIDs
  mode: z.enum(["training", "exam"]).default("training"),
  previous_session_id: z.uuid().optional(),
});

/** Previous visit as the patient remembers it: date, summary and the dialogue (latest part if long). */
async function previousVisitContext(sessionId: string, userId: string, scenarioId: string) {
  const { data: prev, error } = await db()
    .from("sessions")
    .select("id, user_id, scenario_id, status, summary, trust, metrics, created_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!prev || prev.user_id !== userId || prev.scenario_id !== scenarioId) throw new HttpError(404, "Nie znaleziono poprzedniej wizyty.");
  if (prev.status !== "evaluated") throw new HttpError(409, "Poprzednia wizyta nie jest jeszcze oceniona.");

  const { data: turns } = await db().from("turns").select("speaker, text").eq("session_id", prev.id).order("idx");
  let dialogue = (turns ?? []).map((t) => `${t.speaker === "therapist" ? "Psycholog" : "Ty"}: ${t.text}`).join("\n");
  if (dialogue.length > MAX_PREVIOUS_CHARS) dialogue = `(…początek rozmowy pominięty…)\n${dialogue.slice(-MAX_PREVIOUS_CHARS)}`;
  const date = new Date(prev.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
  const text = [
    `Spotkaliście się ${date}.`,
    prev.summary ? `Jak przebiegła tamta rozmowa (notatka): ${prev.summary}` : "",
    dialogue ? `Zapis tamtej rozmowy:\n${dialogue}` : "Z tamtej rozmowy nie zachował się zapis.",
  ].filter(Boolean).join("\n\n");
  return { prev, text };
}
const BindBody = z.object({
  action: z.literal("bind"),
  session_id: z.uuid(),
  conversation_id: z.string().min(1).max(200),
});

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const user = await requireUser(req);
  const raw = await req.json().catch(() => null);

  const bind = BindBody.safeParse(raw);
  if (bind.success) {
    const { error, count } = await db()
      .from("sessions")
      .update({ el_conversation_id: bind.data.conversation_id, status: "live", started_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", bind.data.session_id)
      .eq("user_id", user.id)
      .eq("status", "created");
    if (error) throw error;
    if (!count) throw new HttpError(404, "Nie znaleziono sesji.");
    return json({ ok: true });
  }

  const start = StartBody.safeParse(raw);
  if (!start.success) throw new HttpError(400, "Nieprawidłowe dane.");

  const { data: scenario, error: scErr } = await db()
    .from("scenarios")
    .select("id, title, module, trust_start, is_published, personas(id, name, voice_id, vars)")
    .eq("id", start.data.scenario_id)
    .maybeSingle();
  if (scErr) throw scErr;
  if (!scenario?.is_published) throw new HttpError(404, "Nie znaleziono scenariusza.");
  // deno-lint-ignore no-explicit-any
  const persona = scenario.personas as any;

  const agentId = await getConfig("agent_id");
  if (!agentId) throw new HttpError(503, "Agent pacjenta nie jest skonfigurowany.");

  const followup = start.data.previous_session_id
    ? await previousVisitContext(start.data.previous_session_id, user.id, scenario.id)
    : null;
  // Only needs the patient actually disclosed carry over; unexplored ones must be discovered again.
  const prevNeeds = ((followup?.prev.metrics as { needs?: { id: string; discovered: boolean }[] } | null)?.needs) ?? [];
  const carried: string[] = prevNeeds.filter((n) => n.discovered).map((n) => n.id);
  // Some warmth is lost between visits, but the alliance mostly carries over.
  const trustStart = followup ? Math.max(scenario.trust_start, (followup.prev.trust ?? scenario.trust_start) - 5) : scenario.trust_start;

  const urlRes = await eleven(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);
  const { signed_url } = await urlRes.json();

  const { data: session, error } = await db()
    .from("sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      mode: start.data.mode,
      kind: followup ? "followup" : "first",
      previous_session_id: followup?.prev.id ?? null,
      trust: trustStart,
      unlocked_need_ids: carried,
      carried_need_ids: carried,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: profile } = await db().from("profiles").select("display_name, gender").eq("id", user.id).maybeSingle();
  const vars = buildPatientVariables(persona.vars as Record<string, string>, {
    kind: followup ? "followup" : "first",
    previousVisit: followup?.text,
    psychologist: { name: profile?.display_name, gender: profile?.gender },
  });
  return json({
    session_id: session.id,
    signed_url,
    dynamic_variables: vars,
    overrides: {
      agent: { firstMessage: vars.pierwsza_wypowiedz },
      ...(persona.voice_id ? { tts: { voiceId: persona.voice_id } } : {}),
    },
    trust: trustStart,
  });
});
