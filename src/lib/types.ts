export type Persona = {
  id: string;
  name: string;
  age: number;
  gender: string;
  aura_color: string;
  tagline: string;
};

export type Briefing = {
  source: string;
  reason: string;
  known: string[];
  unknown: string[];
  note: string;
};

export type Scenario = {
  id: string;
  title: string;
  skills: string[];
  briefing: Briefing;
  est_minutes: number;
  trust_start: number;
  personas: Persona;
};

export type SessionMode = "training" | "exam";

export type StartResponse = {
  session_id: string;
  signed_url: string;
  dynamic_variables: Record<string, string>;
  overrides: { agent?: { firstMessage?: string }; tts?: { voiceId?: string } };
  trust: number;
};

export type DirectorResponse = {
  trust: number;
  delta: number;
  level: 1 | 2 | 3;
  tags: string[];
  unlocked: boolean;
  update_text: string;
};

export type TranscriptLine = { role: "therapist" | "patient"; text: string; t_s: number };

export type TrustPoint = { t_s: number | null; trust: number; delta: number; tags: string[]; text: string; note: string | null };

export type NeedReport = {
  id: string;
  label: string;
  discovered: boolean;
  unlocked_at_s: number | null;
  missed_hint: string;
};

export type SessionMetrics = {
  questions: number;
  open_questions: number;
  closed_questions: number;
  reflections: number;
  complex_reflections: number;
  rq_ratio: number;
  pct_open_questions: number | null;
  pct_complex_reflections: number | null;
  premature_advice: number;
  judgments: number;
  argues_with_belief: number;
  confirms_delusion: number;
  multiple_questions: number;
  risk_question_asked: boolean;
  therapist_talk_pct: number | null;
  trust_start: number;
  trust_end: number;
  trust_min: number;
  trust_max: number;
  trust_timeline: TrustPoint[];
  needs: NeedReport[];
  eval_runs: number;
  rejected_quotes: number;
};

export type SessionRow = {
  id: string;
  status: "created" | "live" | "ended" | "evaluating" | "evaluated" | "failed";
  mode: SessionMode;
  overall_score: number | null;
  summary: string | null;
  metrics: SessionMetrics | null;
  audio_path: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  scenarios: { title: string; personas: Persona };
};

export type Evidence = { id: string; turn_idx: number; quote: string; verified: boolean; better_alternative: string | null };

export type ScoreRow = {
  id: string;
  score_median: number;
  score_spread: number;
  comment: string;
  override_score: number | null;
  override_note: string | null;
  criteria: { key: string; name: string; ord: number; levels: Record<string, string> };
  evidence: Evidence[];
};

export type CoachingMoment = {
  id: string;
  turn_idx: number;
  what_happened: string;
  why_it_matters: string;
  better_alternative: string;
  trust_delta: number | null;
};

export type Turn = { idx: number; speaker: "therapist" | "patient"; text: string; t_start_s: number | null };
