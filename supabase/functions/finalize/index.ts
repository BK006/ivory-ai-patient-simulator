// Edge Function: end a session and evaluate it.
//   POST { session_id } → 202; work continues in the background (EdgeRuntime.waitUntil):
//     1. transcript (+ audio) from ElevenLabs → turns, Storage
//     2. deterministic metrics from the director log (R:Q, % open questions, trust curve, needs)
//     3. rubric evaluation ×3 in parallel (OpenAI, structured output) → median + spread per criterion
//     4. quote verification: every quote must literally appear in the transcript, otherwise dropped
//     5. hidden needs: "discovered" only if unlocked by trust (director log), the required question was
//        asked, AND the patient actually said it – proven by a verified quote from a patient turn.
//        Only discovered needs carry over to a follow-up visit.
//     6. status → evaluated (the browser watches the session row)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@4";
import { ai, db, DIRECTOR_MODEL, eleven, EVAL_MODEL, HttpError, json, normalize, requireUser, serve } from "../_shared/common.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const RUNS = 3;
const Body = z.object({ session_id: z.uuid() });

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

async function storeAudio(sessionId: string, conversationId: string): Promise<string | null> {
  try {
    const res = await eleven(`/v1/convai/conversations/${conversationId}/audio`);
    const path = `${sessionId}.mp3`;
    const { error } = await db().storage
      .from("session-audio")
      .upload(path, await res.arrayBuffer(), { contentType: "audio/mpeg", upsert: true });
    if (error) throw error;
    return path;
  } catch (err) {
    console.error("audio download failed", err);
    return null;
  }
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

const DISCLOSURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["needs"],
  properties: {
    needs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "disclosed", "turn_idx", "quote"],
        properties: {
          id: { type: "string" },
          disclosed: { type: "boolean" },
          turn_idx: { type: "integer" },
          quote: { type: "string" },
        },
      },
    },
  },
};

/**
 * For needs the patient was allowed to reveal, checks whether the patient actually said it.
 * Returns only needs with a quote that literally appears in a PATIENT turn.
 */
async function verifyDisclosures(
  candidates: { id: string; label: string; actor_hint: string }[],
  turns: Turn[],
): Promise<Map<string, { quote: string; t_s: number | null }>> {
  const result = new Map<string, { quote: string; t_s: number | null }>();
  const patientTurns = turns.filter((t) => t.speaker === "patient");
  if (!candidates.length || !patientTurns.length) return result;
  const response = await ai().responses.create({
    model: DIRECTOR_MODEL,
    reasoning: { effort: "low" },
    input: [
      {
        role: "system",
        content: `Sprawdzasz, czy pacjent w rozmowie treningowej FAKTYCZNIE ujawnił podane tematy. Temat jest ujawniony tylko wtedy, gdy pacjent wprost lub jednoznacznie o nim powiedział (sama aluzja, której psycholog nie podjął, to za mało). Dla każdego tematu zwróć disclosed, turn_idx tury PACJENTA i DOSŁOWNY cytat (3–25 słów) z tej tury. Jeśli temat nie został ujawniony: disclosed=false, turn_idx=-1, quote="".`,
      },
      {
        role: "user",
        content: `Tematy:\n${candidates.map((n) => `- id=${n.id}: ${n.label} (${n.actor_hint})`).join("\n")}\n\nTranskrypt:\n${turns
          .map((t) => `[${t.idx}] ${t.speaker === "therapist" ? "PSYCHOLOG" : "PACJENT"}: ${t.text}`)
          .join("\n")}`,
      },
    ],
    text: { format: { type: "json_schema", name: "need_disclosures", strict: true, schema: DISCLOSURE_SCHEMA } },
  });
  const parsed = JSON.parse(response.output_text) as { needs: { id: string; disclosed: boolean; turn_idx: number; quote: string }[] };
  for (const d of parsed.needs) {
    if (!d.disclosed || !candidates.some((c) => c.id === d.id)) continue;
    const idx = locateQuote(patientTurns, d.turn_idx, d.quote);
    if (idx === null) continue; // unverifiable quote → not counted as discovered
    result.set(d.id, { quote: d.quote, t_s: patientTurns.find((t) => t.idx === idx)?.t_start_s ?? null });
  }
  return result;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function evaluate(sessionId: string, conversationId: string, scenarioId: string) {
  const [turns, audioPath] = await Promise.all([fetchTranscript(conversationId), storeAudio(sessionId, conversationId)]);

  await db().from("turns").delete().eq("session_id", sessionId);
  if (turns.length) {
    const { error } = await db().from("turns").insert(turns.map((t) => ({ ...t, session_id: sessionId })));
    if (error) throw error;
  }

  const [{ data: scenario }, { data: events }, { data: needs }, { data: sessionRow }] = await Promise.all([
    db().from("scenarios").select("trust_start, rubric_id").eq("id", scenarioId).single(),
    db()
      .from("director_events")
      .select("therapist_text, tags, trust_before, trust_after, unlocked_need_id, note, t_s, created_at")
      .eq("session_id", sessionId)
      .order("created_at"),
    db().from("hidden_needs").select("id, ord, label, actor_hint, required_tags, missed_hint").eq("scenario_id", scenarioId).order("ord"),
    db().from("sessions").select("trust, carried_need_ids").eq("id", sessionId).single(),
  ]);
  const carried = new Set<string>(sessionRow?.carried_need_ids ?? []);
  const log = (events ?? []) as DirectorEvent[];
  // Follow-up visits start from the trust carried over from the previous visit.
  const trustStart = log[0]?.trust_before ?? sessionRow?.trust ?? scenario!.trust_start;
  const metrics = computeMetrics(turns, log, trustStart);

  // Needs: unlocked by trust (director log); some also require a specific tag at/after unlock;
  // and the patient must have actually disclosed it (verified quote). Carried needs stay discovered.
  type NeedRow = { id: string; ord: number; label: string; actor_hint: string; required_tags: string[]; missed_hint: string };
  const needRows = (needs ?? []) as NeedRow[];
  const candidates = needRows.filter((n) => {
    if (carried.has(n.id)) return false;
    const unlockIdx = log.findIndex((e) => e.unlocked_need_id === n.id);
    return unlockIdx >= 0 &&
      (n.required_tags.length === 0 ||
        log.slice(unlockIdx).some((e) => n.required_tags.some((t) => e.tags.includes(t))));
  });
  const disclosures = await verifyDisclosures(candidates, turns).catch((err) => {
    console.error("disclosure check failed", err);
    return new Map<string, { quote: string; t_s: number | null }>();
  });
  const needsReport = needRows.map((n) => {
    const unlockIdx = log.findIndex((e) => e.unlocked_need_id === n.id);
    const fromPrevious = carried.has(n.id);
    const disclosed = disclosures.get(n.id);
    return {
      id: n.id,
      label: n.label,
      discovered: fromPrevious || Boolean(disclosed),
      from_previous: fromPrevious,
      unlocked: unlockIdx >= 0,
      unlocked_at_s: disclosed?.t_s ?? (unlockIdx >= 0 ? log[unlockIdx].t_s : null),
      quote: disclosed?.quote ?? null,
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

  const transcript = turns
    .map((t) => `[${t.idx}] ${t.speaker === "therapist" ? "PSYCHOLOG" : "PACJENT"}: ${t.text}`)
    .join("\n");
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
  const { error } = await db()
    .from("sessions")
    .update({
      status: "evaluated",
      overall_score: Math.round(((avg - 1) / 3) * 100),
      summary: runs[0].summary,
      audio_path: audioPath,
      metrics: { ...metrics, needs: needsReport, eval_runs: runs.length, rejected_quotes: rejectedQuotes },
    })
    .eq("id", sessionId);
  if (error) throw error;
}
