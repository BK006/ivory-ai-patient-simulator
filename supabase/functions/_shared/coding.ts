// Coding of the psychologist's utterances (MITI 4.2-like) – shared by the post-call analysis.
// The model only assigns tags; trust is computed from them deterministically (scenario tag_weights).

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

export const MAX_DELTA_PER_TURN = 15;

export const TAG_DEFINITIONS = `- open_q: pytanie otwarte (jak, co, w jaki sposób, opowie pan…), zaprasza do opowiadania.
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

Walidacja emocji przy jednoczesnej neutralności wobec treści urojeniowych NIE jest confirms_delusion.`;
