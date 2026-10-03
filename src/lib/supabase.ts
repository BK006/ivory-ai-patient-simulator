"use client";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export class NotSignedInError extends Error {
  constructor() {
    super("Zaloguj się, aby kontynuować.");
  }
}

/** Returns the signed-in user id (email + password login, see /logowanie). */
export async function ensureUser(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.is_anonymous) throw new NotSignedInError();
  return data.session.user.id;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "Nieprawidłowy e-mail lub hasło." : "Nie udało się zalogować. Spróbuj ponownie.");
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
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
