// Edge Function: start a training session.
//   POST { scenario_id, mode }                 → creates the session, returns a WebRTC conversation
//                                                 token + dynamic variables + voice override
//   POST { action: "bind", session_id, conversation_id } → links the ElevenLabs conversation, marks live
// Hidden needs are never sent to the browser here; the director feeds them to the actor later.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@4";
import { db, eleven, getConfig, HttpError, json, requireUser, serve } from "../_shared/common.ts";

const StartBody = z.object({
  scenario_id: z.uuid(),
  mode: z.enum(["training", "exam"]).default("training"),
});
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
    .select("id, title, trust_start, is_published, personas(id, name, voice_id, vars)")
    .eq("id", start.data.scenario_id)
    .maybeSingle();
  if (scErr) throw scErr;
  if (!scenario?.is_published) throw new HttpError(404, "Nie znaleziono scenariusza.");
  // deno-lint-ignore no-explicit-any
  const persona = scenario.personas as any;

  const agentId = await getConfig("agent_id");
  if (!agentId) throw new HttpError(503, "Agent pacjenta nie jest skonfigurowany.");

  const tokenRes = await eleven(`/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`);
  const { token } = await tokenRes.json();

  const { data: session, error } = await db()
    .from("sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      mode: start.data.mode,
      trust: scenario.trust_start,
    })
    .select("id")
    .single();
  if (error) throw error;

  const vars = persona.vars as Record<string, string>;
  return json({
    session_id: session.id,
    conversation_token: token,
    dynamic_variables: vars,
    overrides: {
      agent: { firstMessage: vars.opening_line },
      ...(persona.voice_id ? { tts: { voiceId: persona.voice_id } } : {}),
    },
    trust: scenario.trust_start,
  });
});
