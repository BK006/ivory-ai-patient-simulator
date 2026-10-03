// Edge Function: the "director" – keeps the simulated patient's hidden state.
//   POST { session_id, therapist_text, patient_text?, t_s? }
//     1. tags the therapist's utterance (OpenAI, structured output)
//     2. trust += sum(scenario.tag_weights[tag]), clamped per turn and to 0..100 (deterministic)
//     3. unlocks at most one hidden need whose threshold is reached
//     4. returns the [REŻYSER] text the browser forwards via sendContextualUpdate
// Every step is logged in director_events – the report's "discovered needs" come from this log.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@4";
import { ai, db, DIRECTOR_MODEL, HttpError, json, requireUser, serve } from "../_shared/common.ts";

export const TAGS = [
  "open_q",
  "closed_q",
  "multiple_questions",
  "reflection_simple",
  "reflection_complex",
  "summary",
  "validation",
  "premature_advice",
  "judgment",
  "argues_with_belief",
  "confirms_delusion",
  "risk_question",
  "boundary_setting",
  "other",
] as const;

const MAX_DELTA_PER_TURN = 15;

const SYSTEM_PROMPT = `Kodujesz wypowiedzi psychologa w rozmowie treningowej z pacjentem (wzorowane na MITI 4.2). Dostajesz ostatnią wypowiedź pacjenta i odpowiedź psychologa. Zwróć wszystkie pasujące tagi dla wypowiedzi PSYCHOLOGA:

- open_q: pytanie otwarte (jak, co, w jaki sposób, opowie pan…), zaprasza do opowiadania.
- closed_q: pytanie zamknięte (tak/nie, konkretny fakt).
- multiple_questions: dwa lub więcej pytań w jednej wypowiedzi.
- reflection_simple: parafraza powtarzająca treść pacjenta niemal jego słowami.
- reflection_complex: parafraza dodająca znaczenie lub emocję, której pacjent wprost nie nazwał.
- summary: zebranie kilku wątków pacjenta w podsumowanie.
- validation: uznanie emocji lub przeżyć pacjenta jako zrozumiałych („to musi być wyczerpujące”).
- premature_advice: rada, rozwiązanie, sugestia działania bez pytania o zgodę i przed zrozumieniem sytuacji.
- judgment: ocenianie, moralizowanie, bagatelizowanie, sarkazm, etykietowanie pacjenta.
- argues_with_belief: podważanie lub dyskutowanie z przekonaniem pacjenta („to niemożliwe, żeby sąsiad…”).
- confirms_delusion: potwierdzanie treści przekonania urojeniowego jako prawdy („na pewno pana podsłuchuje”).
- risk_question: bezpośrednie pytanie o myśli samobójcze, rezygnacyjne lub samookaleczenie.
- boundary_setting: wyjaśnienie roli, celu, czasu lub poufności spotkania.
- other: nic z powyższych (powitanie, small talk, techniczne).

Walidacja emocji przy jednoczesnej neutralności wobec treści urojeń NIE jest confirms_delusion.
note: jedno krótkie zdanie po polsku, co zrobił psycholog (do raportu).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tags", "note"],
  properties: {
    tags: { type: "array", items: { type: "string", enum: TAGS } },
    note: { type: "string" },
  },
};

const Body = z.object({
  session_id: z.uuid(),
  therapist_text: z.string().trim().min(1).max(4000),
  patient_text: z.string().max(4000).optional(),
  t_s: z.number().nonnegative().optional(),
});

function openness(trust: number): number {
  return trust < 40 ? 1 : trust < 65 ? 2 : 3;
}

function reactionHint(tags: Set<string>): string {
  if (tags.has("judgment") || tags.has("argues_with_belief"))
    return "Ta wypowiedź zabrzmiała dla ciebie oceniająco albo jakby ktoś ci nie wierzył. Wycofaj się, odpowiadaj krócej, możesz okazać irytację.";
  if (tags.has("premature_advice"))
    return "Dostajesz radę, o którą nie prosiłeś/aś. Zareaguj sceptycznie („łatwo powiedzieć”) i nie mów nic nowego.";
  if (tags.has("confirms_delusion"))
    return "Rozmówca przytaknął twoim przekonaniom. Poczuj chwilową ulgę, ale nie zdradzaj nic więcej niż dotąd.";
  if (tags.has("multiple_questions")) return "Padło kilka pytań naraz. Odpowiedz tylko na jedno, najkrócej.";
  if (tags.has("validation") || tags.has("reflection_complex") || tags.has("summary"))
    return "Czujesz się wysłuchany/a. Lekko złagodź ton i powiedz odrobinę więcej niż zwykle.";
  if (tags.has("closed_q")) return "Pytanie zamknięte – odpowiedz krótko, bez rozwijania.";
  return "Reaguj zgodnie ze swoim poziomem otwartości.";
}

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const user = await requireUser(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Nieprawidłowe dane.");
  const { session_id, therapist_text, patient_text, t_s } = parsed.data;

  const { data: session, error } = await db()
    .from("sessions")
    .select("id, user_id, status, trust, unlocked_need_ids, scenario_id, scenarios(tag_weights, trust_start)")
    .eq("id", session_id)
    .maybeSingle();
  if (error) throw error;
  if (!session || session.user_id !== user.id) throw new HttpError(404, "Nie znaleziono sesji.");
  if (!["created", "live"].includes(session.status)) throw new HttpError(409, "Sesja jest zakończona.");
  // deno-lint-ignore no-explicit-any
  const scenario = session.scenarios as any;
  const weights = scenario.tag_weights as Record<string, number>;

  const response = await ai().responses.create({
    model: DIRECTOR_MODEL,
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Pacjent: ${patient_text?.trim() || "(początek rozmowy)"}\nPsycholog: ${therapist_text}`,
      },
    ],
    text: { format: { type: "json_schema", name: "therapist_turn_tags", strict: true, schema: SCHEMA } },
  });
  const coded = JSON.parse(response.output_text) as { tags: string[]; note: string };
  const tags = [...new Set(coded.tags.length ? coded.tags : ["other"])];
  const tagSet = new Set(tags);

  const trustBefore = session.trust ?? scenario.trust_start;
  const rawDelta = tags.reduce((sum, t) => sum + (weights[t] ?? 0), 0);
  const delta = Math.max(-MAX_DELTA_PER_TURN, Math.min(MAX_DELTA_PER_TURN, rawDelta));
  const trustAfter = Math.max(0, Math.min(100, trustBefore + delta));

  const { data: needs, error: needsErr } = await db()
    .from("hidden_needs")
    .select("id, ord, unlock_threshold, actor_hint")
    .eq("scenario_id", session.scenario_id)
    .order("ord");
  if (needsErr) throw needsErr;

  const unlocked = new Set<string>(session.unlocked_need_ids ?? []);
  // One unlock per turn keeps disclosure gradual even after a big jump in trust.
  const newlyUnlocked = needs.find((n) => !unlocked.has(n.id) && trustAfter >= n.unlock_threshold);
  if (newlyUnlocked) unlocked.add(newlyUnlocked.id);

  const allowed = needs.filter((n) => unlocked.has(n.id));
  const lines = [
    `[REŻYSER] Otwartość: ${openness(trustAfter)}/3 (zaufanie ${trustAfter}/100, zmiana ${delta >= 0 ? "+" : ""}${delta}).`,
    `Reakcja na ostatnią wypowiedź: ${reactionHint(tagSet)}`,
    allowed.length
      ? `Możesz już poruszać (naturalnie, zaczynając od aluzji):\n${allowed.map((n) => `- ${n.actor_hint}`).join("\n")}`
      : "Nie ujawniaj jeszcze niczego ponad to, co wynika z twojej historii.",
  ];
  if (newlyUnlocked) lines.push("Nowy temat odblokowany – możesz go zasygnalizować w najbliższej odpowiedzi.");
  const updateText = lines.join("\n");

  const [{ error: evErr }, { error: upErr }] = await Promise.all([
    db().from("director_events").insert({
      session_id,
      therapist_text,
      tags,
      trust_before: trustBefore,
      trust_after: trustAfter,
      unlocked_need_id: newlyUnlocked?.id ?? null,
      update_text: updateText,
      note: coded.note,
      t_s: t_s ?? null,
    }),
    db().from("sessions").update({ trust: trustAfter, unlocked_need_ids: [...unlocked] }).eq("id", session_id),
  ]);
  if (evErr) throw evErr;
  if (upErr) throw upErr;

  return json({
    trust: trustAfter,
    delta,
    level: openness(trustAfter),
    tags,
    unlocked: Boolean(newlyUnlocked),
    update_text: updateText,
  });
});
