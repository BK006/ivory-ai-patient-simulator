// Edge Function: the signed-in user's settings.
//   POST { display_name, gender } → saves the psychologist's name and gender (k/m) used by the patient
//                                   to address them ({{rozmowca}} in the agent prompt).
// The browser reads its own profile directly (RLS); writes go through here.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@4";
import { db, HttpError, json, requireUser, serve } from "../_shared/common.ts";

const Body = z.object({
  display_name: z.string().trim().min(1).max(60),
  gender: z.enum(["k", "m"]),
});

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const user = await requireUser(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Podaj imię i formę zwracania się.");
  const { error } = await db()
    .from("profiles")
    .upsert({ id: user.id, display_name: parsed.data.display_name, gender: parsed.data.gender });
  if (error) throw error;
  return json({ ok: true, ...parsed.data });
});
