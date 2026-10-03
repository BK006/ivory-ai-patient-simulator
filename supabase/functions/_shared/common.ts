// Shared helpers for all Edge Functions.
// Secrets (ELEVENLABS_API_KEY, OPENAI_API_KEY, optional model overrides) live only in
// Supabase Edge Function secrets. The service key comes from the platform.
// Auth: the browser signs in anonymously and sends its access token as `Authorization: Bearer`;
// verify_jwt is off and the token is checked here with auth.getUser.

import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@7";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    const first = Object.values(keys)[0];
    if (first) return first;
  } catch { /* fall through */ }
  throw new Error("Missing service key");
}

let admin: SupabaseClient | undefined;
export function db(): SupabaseClient {
  admin ??= createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Brak sesji użytkownika.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sesja wygasła. Odśwież stronę.");
  return data.user;
}

export async function isSupervisor(userId: string): Promise<boolean> {
  const { data } = await db().from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "supervisor";
}

let openai: OpenAI | undefined;
export function ai(): OpenAI {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new HttpError(503, "OpenAI nie jest skonfigurowane.");
  openai ??= new OpenAI({ apiKey });
  return openai;
}

export const DIRECTOR_MODEL = Deno.env.get("OPENAI_DIRECTOR_MODEL") || "gpt-5.4-mini";
export const EVAL_MODEL = Deno.env.get("OPENAI_EVAL_MODEL") || "gpt-6-luna";

const EL_BASE = "https://api.elevenlabs.io";

export async function eleven(path: string, init: RequestInit = {}): Promise<Response> {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) throw new HttpError(503, "ElevenLabs nie jest skonfigurowane.");
  const res = await fetch(`${EL_BASE}${path}`, {
    ...init,
    headers: { "xi-api-key": key, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`ElevenLabs ${init.method ?? "GET"} ${path} → ${res.status}`, body);
    throw new HttpError(502, `ElevenLabs error ${res.status}`);
  }
  return res;
}

export async function getConfig(key: string): Promise<string | null> {
  const { data } = await db().from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const { error } = await db().from("app_config").upsert({ key, value });
  if (error) throw error;
}

/** Wraps a handler with CORS preflight and uniform error responses. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: "Coś poszło nie tak. Spróbuj ponownie." }, 500);
    }
  });
}

/** Lowercase, strip diacritics-insensitive punctuation and collapse whitespace for quote matching. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[„”"'’‘«»….,!?;:()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
