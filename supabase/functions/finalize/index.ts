// Edge Function: end a session and evaluate it.
//   POST { session_id } → 202; work continues in the background (EdgeRuntime.waitUntil):
//     1. transcript (+ audio) from ElevenLabs → turns, Storage
//     2. post-call coding: every psychologist turn is tagged (OpenAI, one call over the transcript);
//        trust is computed from the tags deterministically (scenario tag_weights, ±15 per turn) and
//        stored in director_events – the trust curve and metrics (R:Q, % open questions) come from it
//     3. rubric evaluation ×3 in parallel (OpenAI, structured output) → median + spread per criterion
//     4. quote verification: every quote must literally appear in the transcript, otherwise dropped
//     5. hidden needs: how deeply each one was explored, 0–100 % (3 runs, median). Above 0 % needs a
//        verified quote; 50 %+ (= discovered, carries over to a follow-up) needs a quote from the PATIENT.
//     6. score: universal rule – main need up to 60 pts + two secondary needs up to 20 pts each,
//        proportional to the depth (e.g. 65 % of a secondary need = 13/20); the rubric median stays
//        as feedback (metrics.rubric_score)
//     7. status → evaluated (the browser watches the session row)
//   POST { session_id, action: "audio" } → retries storing the recording of an evaluated session
//     (ElevenLabs serves the audio only some time after the call; the report asks for it when missing).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@4";
import { MAX_DELTA_PER_TURN, TAG_DEFINITIONS, TAGS } from "../_shared/coding.ts";
import { ai, db, DIRECTOR_MODEL, eleven, EVAL_MODEL, HttpError, json, normalize, requireUser, serve } from "../_shared/common.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const RUNS = 3;
const Body = z.object({ session_id: z.uuid(), action: z.literal("audio").optional() });

type Turn = { idx: number; speaker: "therapist" | "patient"; text: string; t_start_s: number | null };
type DirectorEvent = {
  therapist_text: string;
  tags: string[];
  trust_before: number;
  trust_after: number;
  unlocked_need_id: string | null;
  note: string | null;
  t_s: number | null;
  created_at: string;
};
type Criterion = { id: string; key: string; name: string; description: string; levels: Record<string, string>; weight: number };
type EvalResult = {
  summary: string;
  criteria: { key: string; score: number; comment: string; evidence: { turn_idx: number; quote: string; better_alternative: string }[] }[];
  coaching_moments: { turn_idx: number; what_happened: string; why_it_matters: string; better_alternative: string }[];
};

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const user = await requireUser(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Nieprawidłowe dane.");

  const { data: session, error } = await db()
    .from("sessions")
    .select("id, user_id, status, el_conversation_id, scenario_id")
    .eq("id", parsed.data.session_id)
    .maybeSingle();
  if (error) throw error;
  if (!session || session.user_id !== user.id) throw new HttpError(404, "Nie znaleziono sesji.");
  if (parsed.data.action === "audio") {
    if (!session.el_conversation_id) return json({ audio_path: null });
    const audioPath = await storeAudio(session.id, session.el_conversation_id, 1);
    if (audioPath) await db().from("sessions").update({ audio_path: audioPath }).eq("id", session.id);
    return json({ audio_path: audioPath });
  }
  if (!["created", "live", "ended", "failed"].includes(session.status)) return json({ status: session.status }, 202);
  if (!session.el_conversation_id) throw new HttpError(409, "Rozmowa nie została rozpoczęta.");

  await db().from("sessions").update({ status: "evaluating", ended_at: new Date().toISOString() }).eq("id", session.id);

  EdgeRuntime.waitUntil(
    evaluate(session.id, session.el_conversation_id, session.scenario_id).catch(async (err) => {
      console.error("finalize failed", session.id, err);
      await db().from("sessions").update({ status: "failed" }).eq("id", session.id);
    }),
  );
  return json({ status: "evaluating" }, 202);
});

async function fetchTranscript(conversationId: string): Promise<Turn[]> {
  // ElevenLabs finishes post-processing a few seconds after the call ends.
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await eleven(`/v1/convai/conversations/${conversationId}`);
    const conv = await res.json();
    if (conv.status === "done" || conv.status === "failed" || attempt === 19) {
      // deno-lint-ignore no-explicit-any
      const items = (conv.transcript ?? []) as any[];
      return items
        .filter((m) => typeof m.message === "string" && m.message.trim())
        .map((m, idx) => ({
          idx,
          speaker: m.role === "user" ? "therapist" : "patient",
          text: m.message.trim(),
          t_start_s: typeof m.time_in_call_secs === "number" ? m.time_in_call_secs : null,
        }));
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return [];
}

async function storeAudio(sessionId: string, conversationId: string, attempts = 12): Promise<string | null> {
  // The recording becomes available some seconds after the transcript – 404 until then.
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await eleven(`/v1/convai/conversations/${conversationId}/audio`);
      const path = `${sessionId}.mp3`;
      const { error } = await db().storage
        .from("session-audio")
        .upload(path, await res.arrayBuffer(), { contentType: "audio/mpeg", upsert: true });
      if (error) throw error;
      return path;
    } catch (err) {
      if (attempt === attempts - 1) console.error("audio download failed", err);
      else await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return null;
}

function computeMetrics(turns: Turn[], events: DirectorEvent[], trustStart: number) {
  const count = (tag: string) => events.filter((e) => e.tags.includes(tag)).length;
  const open = count("open_q");
  const closed = count("closed_q");
  const simple = count("reflection_simple");
  const complex = count("reflection_complex");
  const questions = open + closed;
  const reflections = simple + complex;
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const therapistWords = turns.filter((t) => t.speaker === "therapist").reduce((n, t) => n + words(t.text), 0);
  const totalWords = turns.reduce((n, t) => n + words(t.text), 0);
  const trusts = [trustStart, ...events.map((e) => e.trust_after)];
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    questions,
    open_questions: open,
    closed_questions: closed,
    reflections,
    complex_reflections: complex,
    rq_ratio: round2(questions ? reflections / questions : reflections),
    pct_open_questions: questions ? Math.round((open / questions) * 100) : null,
    pct_complex_reflections: reflections ? Math.round((complex / reflections) * 100) : null,
    premature_advice: count("premature_advice"),
    judgments: count("judgment"),
    argues_with_belief: count("argues_with_belief"),
    confirms_delusion: count("confirms_delusion"),
    multiple_questions: count("multiple_questions"),
    risk_question_asked: count("risk_question") > 0,
    therapist_talk_pct: totalWords ? Math.round((therapistWords / totalWords) * 100) : null,
    trust_start: trustStart,
    trust_end: trusts[trusts.length - 1],
    trust_min: Math.min(...trusts),
    trust_max: Math.max(...trusts),
    trust_timeline: events.map((e) => ({
      t_s: e.t_s,
      trust: e.trust_after,
      delta: e.trust_after - e.trust_before,
      tags: e.tags,
      text: e.therapist_text,
      note: e.note,
    })),
  };
}

function buildPrompt(criteria: Criterion[]): string {
  return `Jesteś doświadczonym superwizorem psychologów. Oceniasz rozmowę TRENINGOWĄ psychologa z symulowanym pacjentem według rubryki. Oceniasz wyłącznie PSYCHOLOGA, wyłącznie na podstawie transkryptu i podanych metryk (metryki są policzone deterministycznie – traktuj je jako fakty).

Rubryka (skala 1–4, opisy poziomów są wiążące):
${criteria
  .map(
    (c) =>
      `## ${c.key} – ${c.name}\n${c.description}\n${Object.entries(c.levels)
        .map(([lvl, d]) => `${lvl}: ${d}`)
        .join("\n")}`,
  )
  .join("\n\n")}

Zasady:
- Dla każdego kryterium: score (1–4), comment (2–3 zdania po polsku, konkretnie, życzliwie, jak dobry superwizor), evidence: 1–2 dowody.
- evidence.turn_idx to numer tury z transkryptu, evidence.quote to DOSŁOWNY fragment tej tury (przepisz dokładnie, bez zmian, 3–25 słów). Cytaty niedosłowne zostaną odrzucone.
- evidence.better_alternative: jeśli cytat pokazuje błąd – lepsza wersja wypowiedzi psychologa po polsku; jeśli pokazuje coś dobrego – pusty string.
- Jeśli kryterium nie miało okazji wystąpić (np. brak sygnałów ryzyka), oceń to, co było możliwe, i napisz to w komentarzu.
- coaching_moments: 2–4 najważniejsze momenty (turn_idx tury psychologa), co się stało, dlaczego to ważne, lepsza wypowiedź.
- summary: 1–2 zdania podsumowania po polsku, zaczynając od mocnej strony.
- Nie oceniaj emocji ani głosu psychologa, tylko treść wypowiedzi.`;
}

function evalSchema(keys: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "criteria", "coaching_moments"],
    properties: {
      summary: { type: "string" },
      criteria: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "score", "comment", "evidence"],
          properties: {
            key: { type: "string", enum: keys },
            score: { type: "integer" },
            comment: { type: "string" },
            evidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["turn_idx", "quote", "better_alternative"],
                properties: {
                  turn_idx: { type: "integer" },
                  quote: { type: "string" },
                  better_alternative: { type: "string" },
                },
              },
            },
          },
        },
      },
      coaching_moments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["turn_idx", "what_happened", "why_it_matters", "better_alternative"],
          properties: {
            turn_idx: { type: "integer" },
            what_happened: { type: "string" },
            why_it_matters: { type: "string" },
            better_alternative: { type: "string" },
          },
        },
      },
    },
  };
}

/** Returns the turn index where the quote literally appears (preferring the claimed one), or null. */
function locateQuote(turns: Turn[], claimedIdx: number, quote: string): number | null {
  const q = normalize(quote);
  if (q.length < 3) return null;
  const claimed = turns.find((t) => t.idx === claimedIdx);
  if (claimed && normalize(claimed.text).includes(q)) return claimed.idx;
  return turns.find((t) => normalize(t.text).includes(q))?.idx ?? null;
}

const CODING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["turns"],
  properties: {
    turns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["turn_idx", "tags", "note"],
        properties: {
          turn_idx: { type: "integer" },
          tags: { type: "array", items: { type: "string", enum: TAGS } },
          note: { type: "string" },
        },
      },
    },
  },
};

const isSpeech = (text: string) => /\p{L}/u.test(text);

/** Tags every psychologist turn of the transcript in one call. */
async function codeTherapistTurns(turns: Turn[]): Promise<Map<number, { tags: string[]; note: string }>> {
  const result = new Map<number, { tags: string[]; note: string }>();
  if (!turns.some((t) => t.speaker === "therapist" && isSpeech(t.text))) return result;
  const response = await ai().responses.create({
    model: DIRECTOR_MODEL,
    reasoning: { effort: "low" },
    input: [
      {
        role: "system",
        content: `Kodujesz wypowiedzi psychologa w rozmowie treningowej z pacjentem (wzorowane na MITI 4.2). Dla KAŻDEJ tury PSYCHOLOGA z transkryptu zwróć turn_idx, wszystkie pasujące tagi (z uwzględnieniem tego, co pacjent powiedział tuż przed) i note – jedno krótkie zdanie po polsku, co zrobił psycholog.\n\n${TAG_DEFINITIONS}`,
      },
      { role: "user", content: transcriptText(turns) },
    ],
    text: { format: { type: "json_schema", name: "therapist_coding", strict: true, schema: CODING_SCHEMA } },
  });
  const parsed = JSON.parse(response.output_text) as { turns: { turn_idx: number; tags: string[]; note: string }[] };
  for (const t of parsed.turns) result.set(t.turn_idx, { tags: [...new Set(t.tags)], note: t.note });
  return result;
}

type NeedRow = { id: string; ord: number; label: string; actor_hint: string; required_tags: string[]; missed_hint: string; points: number; unlock_threshold: number };

/** Replays the conversation: trust after every psychologist turn and when each need became available. */
function trustLog(turns: Turn[], coded: Map<number, { tags: string[]; note: string }>, weights: Record<string, number>, trustStart: number, needs: NeedRow[], carried: Set<string>) {
  const unlocked = new Set(carried);
  let trust = trustStart;
  const base = Date.now();
  return turns
    .filter((t) => t.speaker === "therapist" && isSpeech(t.text))
    .map((t, i): DirectorEvent & { turn_idx: number } => {
      const c = coded.get(t.idx);
      const tags = c?.tags.length ? c.tags : ["other"];
      const raw = tags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0);
      const delta = Math.max(-MAX_DELTA_PER_TURN, Math.min(MAX_DELTA_PER_TURN, raw));
      const before = trust;
      trust = Math.max(0, Math.min(100, trust + delta));
      // At most one need per turn becomes available, in disclosure order.
      const next = needs.find((n) => !unlocked.has(n.id) && trust >= n.unlock_threshold);
      if (next) unlocked.add(next.id);
      return {
        turn_idx: t.idx,
        therapist_text: t.text,
        tags,
        trust_before: before,
        trust_after: trust,
        unlocked_need_id: next?.id ?? null,
        note: c?.note ?? null,
        t_s: t.t_start_s,
        created_at: new Date(base + i).toISOString(),
      };
    });
}

const NEEDS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["needs"],
  properties: {
    needs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "depth", "turn_idx", "quote", "reason"],
        properties: {
          id: { type: "string" },
          depth: { type: "integer" },
          turn_idx: { type: "integer" },
          quote: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

type NeedAssessment = { depth: number; quote: string | null; t_s: number | null; reason: string };

/**
 * How deeply each hidden need was explored, 0–100 (median of 3 runs). Verified in code:
 * above 0 requires a quote that literally appears in the transcript; 50+ requires it from the patient.
 */
async function assessNeeds(needs: NeedRow[], turns: Turn[]): Promise<Map<string, NeedAssessment>> {
  const result = new Map<string, NeedAssessment>();
  if (!needs.length || !turns.length) return result;
  const prompt = `Oceniasz, jak głęboko psycholog wybadał ukryte potrzeby pacjenta w rozmowie treningowej. Dla każdej potrzeby zwróć depth 0–100:
- 0: temat w ogóle się nie pojawił.
- 1–30: psycholog zbliżył się do tematu albo pacjent rzucił aluzję, ale nikt jej nie podjął.
- 31–49: temat padł, ale tylko powierzchownie – pacjent nie powiedział o nim wprost.
- 50–70: pacjent wprost o tym powiedział, psycholog częściowo dopytał.
- 71–100: pacjent wprost o tym powiedział, a psycholog to pogłębił: dopytał, odzwierciedlił emocję, zrozumiał znaczenie dla pacjenta.
turn_idx i quote: najważniejszy dowód – DOSŁOWNY cytat (3–25 słów) z jednej tury; przy depth ≥ 50 musi to być tura PACJENTA. Przy depth 0: turn_idx=-1, quote="". reason: jedno zdanie po polsku, czego zabrakło do 100 albo co zadecydowało.`;
  const settled = await Promise.allSettled(
    Array.from({ length: RUNS }, () =>
      ai().responses.create({
        model: DIRECTOR_MODEL,
        reasoning: { effort: "medium" },
        input: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `Potrzeby:\n${needs.map((n) => `- id=${n.id}: ${n.label} (${n.actor_hint})`).join("\n")}\n\nTranskrypt:\n${transcriptText(turns)}`,
          },
        ],
        text: { format: { type: "json_schema", name: "need_depth", strict: true, schema: NEEDS_SCHEMA } },
      }),
    ),
  );
  const runs = settled.flatMap((s) =>
    s.status === "fulfilled" ? [(JSON.parse(s.value.output_text) as { needs: { id: string; depth: number; turn_idx: number; quote: string; reason: string }[] }).needs] : [],
  );
  const patientTurns = turns.filter((t) => t.speaker === "patient");
  for (const n of needs) {
    const verified = runs.flatMap((run) => {
      const a = run.find((x) => x.id === n.id);
      if (!a) return [];
      let depth = Math.max(0, Math.min(100, Math.round(a.depth)));
      const idx = depth > 0 ? locateQuote(turns, a.turn_idx, a.quote) : null;
      if (idx === null) depth = 0; // unverifiable evidence → nothing counted
      else if (depth >= 50 && locateQuote(patientTurns, a.turn_idx, a.quote) === null) depth = 40; // the patient never said it
      return [{ depth, quote: depth > 0 ? a.quote : null, t_s: idx === null ? null : turns.find((t) => t.idx === idx)?.t_start_s ?? null, reason: a.reason }];
    });
    if (!verified.length) continue;
    const med = median(verified.map((v) => v.depth));
    const rep = verified.reduce((best, v) => (Math.abs(v.depth - med) < Math.abs(best.depth - med) ? v : best));
    result.set(n.id, { ...rep, depth: Math.round(med) });
  }
  return result;
}

function transcriptText(turns: Turn[]): string {
  return turns.map((t) => `[${t.idx}] ${t.speaker === "therapist" ? "PSYCHOLOG" : "PACJENT"}: ${t.text}`).join("\n");
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function evaluate(sessionId: string, conversationId: string, scenarioId: string) {
  // Audio is fetched alongside the evaluation and only awaited at the end – it may take a while.
  const audioPromise = storeAudio(sessionId, conversationId);
  const turns = await fetchTranscript(conversationId);

  await db().from("turns").delete().eq("session_id", sessionId);
  if (turns.length) {
    const { error } = await db().from("turns").insert(turns.map((t) => ({ ...t, session_id: sessionId })));
    if (error) throw error;
  }

  const [{ data: scenario }, { data: needs }, { data: sessionRow }, coded] = await Promise.all([
    db().from("scenarios").select("trust_start, rubric_id, tag_weights").eq("id", scenarioId).single(),
    db().from("hidden_needs").select("id, ord, label, actor_hint, required_tags, missed_hint, points, unlock_threshold").eq("scenario_id", scenarioId).order("ord"),
    db().from("sessions").select("trust, carried_need_ids").eq("id", sessionId).single(),
    codeTherapistTurns(turns),
  ]);
  const carried = new Set<string>(sessionRow?.carried_need_ids ?? []);
  const needRows = (needs ?? []) as NeedRow[];
  // session.trust holds the starting trust (follow-ups start from the previous visit's trust).
  const trustStart = sessionRow?.trust ?? scenario!.trust_start;
  const log = trustLog(turns, coded, scenario!.tag_weights as Record<string, number>, trustStart, needRows, carried);
  await db().from("director_events").delete().eq("session_id", sessionId);
  if (log.length) {
    const { error } = await db().from("director_events").insert(log.map((e) => ({ ...e, session_id: sessionId, update_text: "" })));
    if (error) throw error;
  }
  const metrics = computeMetrics(turns, log, trustStart);

  // Needs: depth of exploration with verified quotes; some (risk) also require a specific question.
  // Carried needs were already discovered on the previous visit and count in full.
  const assessed = await assessNeeds(needRows.filter((n) => !carried.has(n.id)), turns).catch((err) => {
    console.error("needs assessment failed", err);
    return new Map<string, NeedAssessment>();
  });
  const needsReport = needRows.map((n) => {
    const unlockIdx = log.findIndex((e) => e.unlocked_need_id === n.id);
    const fromPrevious = carried.has(n.id);
    const a = assessed.get(n.id);
    const tagOk = n.required_tags.length === 0 || log.some((e) => n.required_tags.some((t) => e.tags.includes(t)));
    const depth = fromPrevious ? 100 : tagOk ? a?.depth ?? 0 : Math.min(a?.depth ?? 0, 40);
    return {
      id: n.id,
      label: n.label,
      points: n.points,
      depth,
      earned: Math.round((n.points * depth) / 100),
      discovered: depth >= 50,
      from_previous: fromPrevious,
      unlocked: fromPrevious || unlockIdx >= 0,
      unlocked_at_s: a?.t_s ?? (unlockIdx >= 0 ? log[unlockIdx].t_s : null),
      quote: a?.quote ?? null,
      reason: fromPrevious ? null : a?.reason ?? null,
      missed_hint: n.missed_hint,
    };
  });

  const { data: criteriaRows } = await db()
    .from("criteria")
    .select("id, key, name, description, levels, weight")
    .eq("rubric_id", scenario!.rubric_id)
    .order("ord");
  const criteria = (criteriaRows ?? []) as Criterion[];
  const keys = criteria.map((c) => c.key);

  const transcript = transcriptText(turns);
  const facts = JSON.stringify({ ...metrics, trust_timeline: undefined, needs: needsReport.map(({ label, discovered }) => ({ label, discovered })) });

  const settled = await Promise.allSettled(
    Array.from({ length: RUNS }, () =>
      ai().responses.create({
        model: EVAL_MODEL,
        reasoning: { effort: "medium" },
        input: [
          { role: "system", content: buildPrompt(criteria) },
          { role: "user", content: `Metryki:\n${facts}\n\nTranskrypt:\n${transcript || "(pusty)"}` },
        ],
        text: { format: { type: "json_schema", name: "session_evaluation", strict: true, schema: evalSchema(keys) } },
      }),
    ),
  );
  const runs: EvalResult[] = [];
  for (const [i, s] of settled.entries()) {
    if (s.status !== "fulfilled") {
      console.error("eval run failed", i, s.reason);
      continue;
    }
    const parsed = JSON.parse(s.value.output_text) as EvalResult;
    runs.push(parsed);
    await db().from("evaluations").insert({ session_id: sessionId, run_no: i + 1, model: EVAL_MODEL, raw: parsed });
  }
  if (!runs.length) throw new Error("all evaluation runs failed");

  await db().from("scores").delete().eq("session_id", sessionId);
  await db().from("coaching_moments").delete().eq("session_id", sessionId);

  let rejectedQuotes = 0;
  let weighted = 0;
  let weightSum = 0;
  for (const c of criteria) {
    const perRun = runs
      .map((r) => r.criteria.find((x) => x.key === c.key))
      .filter((x): x is EvalResult["criteria"][number] => Boolean(x))
      .map((x) => ({ ...x, score: Math.min(4, Math.max(1, Math.round(x.score))) }));
    if (!perRun.length) continue;
    const scores = perRun.map((x) => x.score);
    const med = median(scores);
    // Comment and evidence come from the run closest to the median.
    const rep = perRun.reduce((best, x) => (Math.abs(x.score - med) < Math.abs(best.score - med) ? x : best));
    weighted += med * c.weight;
    weightSum += c.weight;

    const { data: score, error } = await db()
      .from("scores")
      .insert({
        session_id: sessionId,
        criterion_id: c.id,
        score_median: med,
        score_spread: Math.max(...scores) - Math.min(...scores),
        comment: rep.comment,
      })
      .select("id")
      .single();
    if (error) throw error;

    const evidence = rep.evidence.flatMap((e) => {
      const idx = locateQuote(turns, e.turn_idx, e.quote);
      if (idx === null) {
        rejectedQuotes++;
        return [];
      }
      return [{ score_id: score.id, turn_idx: idx, quote: e.quote, verified: true, better_alternative: e.better_alternative || null }];
    });
    if (evidence.length) {
      const { error: evErr } = await db().from("evidence").insert(evidence);
      if (evErr) throw evErr;
    }
  }

  const byText = new Map(log.map((e) => [normalize(e.therapist_text), e]));
  const coaching = runs[0].coaching_moments
    .filter((m) => turns.some((t) => t.idx === m.turn_idx))
    .map((m) => {
      const turn = turns.find((t) => t.idx === m.turn_idx)!;
      const ev = byText.get(normalize(turn.text));
      return {
        session_id: sessionId,
        turn_idx: m.turn_idx,
        what_happened: m.what_happened,
        why_it_matters: m.why_it_matters,
        better_alternative: m.better_alternative,
        trust_delta: ev ? ev.trust_after - ev.trust_before : null,
      };
    });
  if (coaching.length) {
    const { error } = await db().from("coaching_moments").insert(coaching);
    if (error) throw error;
  }

  const avg = weightSum ? weighted / weightSum : 1;
  const rubricScore = Math.round(((avg - 1) / 3) * 100);
  const needsScore = Math.min(100, needsReport.reduce((sum, n) => sum + n.earned, 0));
  const scoredByNeeds = needsReport.some((n) => n.points > 0);
  const { error } = await db()
    .from("sessions")
    .update({
      status: "evaluated",
      trust: metrics.trust_end,
      overall_score: scoredByNeeds ? needsScore : rubricScore,
      summary: runs[0].summary,
      audio_path: await audioPromise,
      metrics: { ...metrics, needs: needsReport, rubric_score: rubricScore, eval_runs: runs.length, rejected_quotes: rejectedQuotes },
    })
    .eq("id", sessionId);
  if (error) throw error;
}
