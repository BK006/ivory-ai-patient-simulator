@AGENTS.md

# Próbna Sesja – HackYeah 2026 (Artificial Intelligence)

Psychologist talks by VOICE to an AI playing a difficult patient (ElevenLabs Agents, one agent, persona = dynamic variables + voice override, shared guardrails) → a "director" Edge Function (OpenAI) tags each therapist utterance, updates trust deterministically and unlocks hidden needs via contextual updates → after the call `finalize` scores the transcript with a rubric (OpenAI ×3, median, verified quotes) → report with trust curve, needs discovered/missed, coaching moments.

- Stack: Next.js 16 (App Router, `src/`), Tailwind v4, Supabase (Postgres + RLS, anon auth, Storage, Realtime), ElevenLabs Agents (`@elevenlabs/react`, WebRTC), OpenAI Responses API with structured outputs, Vercel (frontend only).
- All server logic in `supabase/functions/*` (agent-sync, session-start, director, finalize). Secrets ONLY in Supabase Edge Function secrets – no server env in the app. The app knows just the public Supabase URL + publishable key.
- Browser never writes to the DB; RLS is read-only for users. Hidden needs are never sent to the browser before evaluation.
- Code and comments in English; all UI text, prompts and report content in Polish.
- Patient prompt source of truth: `supabase/functions/_shared/patient-prompt.ts` (mirrored in `prompts/base-prompt.md`). After changing it, call `agent-sync`.
- Plan and priorities: `PLAN.md`. Demo over completeness: voice → director → report must always work.
- Do not analyse the trainee's emotions from voice (AI Act art. 5(1)(f)) – text content only.
