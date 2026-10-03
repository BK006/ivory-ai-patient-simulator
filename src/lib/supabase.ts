"use client";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let pending: Promise<string> | null = null;

/** Returns the current user id, signing in anonymously on first visit. */
export function ensureUser(): Promise<string> {
  pending ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error || !signed.user) throw error ?? new Error("Anonymous sign-in failed");
    return signed.user.id;
  })().catch((err) => {
    pending = null;
    throw err;
  });
  return pending;
}

/** Calls an Edge Function with the user's access token; throws with the Polish error message. */
export async function callFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  await ensureUser();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = "Coś poszło nie tak. Spróbuj ponownie.";
    try {
      const payload = await (error as { context?: Response }).context?.json();
      if (payload?.error) message = payload.error;
    } catch { /* keep default */ }
    throw new Error(message);
  }
  return data as T;
}
