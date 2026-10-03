"use client";

import { callFn, ensureUser, supabase } from "./supabase";

export type Gender = "k" | "m";
export type Profile = { display_name: string | null; gender: Gender | null };

// Polish male names that end in "-a" (most names ending in "-a" are female).
const MALE_A = new Set(["kuba", "barnaba", "bonawentura", "kosma", "jarema", "zawisza", "dyzma", "boryna", "sasza", "misza", "kostia", "nikita", "luca", "andrea"]);

/** Guesses gender from a Polish first name; the user can always override it. */
export function guessGender(name: string): Gender | null {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first.length < 2) return null;
  if (MALE_A.has(first)) return "m";
  return first.endsWith("a") ? "k" : "m";
}

export async function loadProfile(): Promise<Profile> {
  const uid = await ensureUser();
  const { data } = await supabase.from("profiles").select("display_name, gender").eq("id", uid).maybeSingle();
  return { display_name: data?.display_name ?? null, gender: (data?.gender as Gender | null) ?? null };
}

export async function saveProfile(display_name: string, gender: Gender): Promise<void> {
  await callFn("profile", { display_name, gender });
  window.dispatchEvent(new Event("profile-changed"));
}
