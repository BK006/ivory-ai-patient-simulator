"use client";

// Read-only data access for the UI (RLS limits rows to the signed-in user).

import { ensureUser, supabase } from "./supabase";
import type { CoachingMoment, ScoreRow, Turn } from "./types";

export type ScenarioCard = {
  id: string;
  title: string;
  module: string;
  module_description: string | null;
  goal: string | null;
  skills: string[];
  est_minutes: number;
  briefing: { source: string; reason: string; known: string[]; unknown: string[]; note: string };
  personas: { id: string; name: string; age: number; occupation: string | null; tagline: string; vars: Record<string, string> };
};

export type SessionSummary = {
  id: string;
  status: string;
  kind: "first" | "followup";
  summary: string | null;
  mode: string;
  overall_score: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  scenario_id: string;
  scenarios: { title: string; module: string; personas: { name: string; age: number } };
};

export async function listScenarios(): Promise<ScenarioCard[]> {
  await ensureUser();
  const { data, error } = await supabase
    .from("scenarios")
    .select("id, title, module, module_description, goal, skills, est_minutes, briefing, personas(id, name, age, occupation, tagline, vars)")
    .eq("is_published", true)
    .order("created_at");
  if (error) throw error;
  return data as unknown as ScenarioCard[];
}

export async function getScenario(id: string): Promise<ScenarioCard | null> {
  const all = await listScenarios();
  return all.find((s) => s.id === id) ?? null;
}

export async function listMySessions(): Promise<SessionSummary[]> {
  const uid = await ensureUser();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status, kind, summary, mode, overall_score, started_at, ended_at, created_at, scenario_id, scenarios(title, module, personas(name, age))")
    .eq("user_id", uid)
    .in("status", ["evaluating", "evaluated", "failed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as SessionSummary[];
}

/** Notes the psychologist has from an earlier visit (shown in the follow-up brief). */
export async function loadPreviousVisit(sessionId: string) {
  await ensureUser();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status, summary, metrics, created_at, scenario_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; status: string; summary: string | null; metrics: { needs?: { label: string; discovered: boolean }[] } | null; created_at: string; scenario_id: string } | null;
}

export async function loadReport(sessionId: string) {
  await ensureUser();
  const [session, scores, coaching, turns] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, status, kind, mode, overall_score, summary, metrics, audio_path, started_at, ended_at, created_at, scenario_id, scenarios(title, module, personas(name, age))")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("id, score_median, score_spread, comment, override_score, override_note, criteria(key, name, ord, levels), evidence(id, turn_idx, quote, verified, better_alternative)")
      .eq("session_id", sessionId),
    supabase.from("coaching_moments").select("id, turn_idx, what_happened, why_it_matters, better_alternative, trust_delta").eq("session_id", sessionId).order("turn_idx"),
    supabase.from("turns").select("idx, speaker, text, t_start_s").eq("session_id", sessionId).order("idx"),
  ]);
  if (session.error) throw session.error;
  let audioUrl: string | null = null;
  if (session.data?.audio_path) {
    const { data } = await supabase.storage.from("session-audio").createSignedUrl(session.data.audio_path, 3600);
    audioUrl = data?.signedUrl ?? null;
  }
  const sortedScores = ((scores.data ?? []) as unknown as ScoreRow[]).sort((a, b) => a.criteria.ord - b.criteria.ord);
  return {
    session: session.data,
    scores: sortedScores,
    coaching: (coaching.data ?? []) as CoachingMoment[],
    turns: (turns.data ?? []) as Turn[],
    audioUrl,
  };
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const durationMin = (s: { started_at: string | null; ended_at: string | null }) =>
  s.started_at && s.ended_at ? Math.max(1, Math.round((+new Date(s.ended_at) - +new Date(s.started_at)) / 60000)) : null;
