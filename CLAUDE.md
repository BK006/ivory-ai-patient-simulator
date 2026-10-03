@AGENTS.md

# Próbna Sesja – HackYeah 2026 (Artificial Intelligence)

Psychologist talks by VOICE (or text) to an AI playing a difficult patient (ElevenLabs Agents, one agent, persona + hidden needs + opening rules = dynamic variables, voice override, shared guardrails). Nothing runs between turns (no live director – latency). After the call `finalize` tags every therapist utterance, replays trust deterministically, scores each hidden need by depth (main up to 60 pts, two secondary up to 20 pts, verified quotes) and runs the rubric as feedback (OpenAI ×3, median) → report with trust curve, needs with partial points, coaching moments.

- Stack: Next.js 16 (App Router, `src/`), Tailwind v4, Supabase (Postgres + RLS, anon auth, Storage, Realtime), ElevenLabs Agents (`@elevenlabs/react`, WebRTC), OpenAI Responses API with structured outputs, Vercel (frontend only).
- All server logic in `supabase/functions/*` (agent-sync, session-start, finalize; `director` is the old live version, unused). Secrets ONLY in Supabase Edge Function secrets – no server env in the app. The app knows just the public Supabase URL + publishable key.
- Browser never writes to the DB; RLS is read-only for users. Hidden needs travel in the session's dynamic variables (needed by the agent).
- Code and comments in English; all UI text, prompts and report content in Polish.
- Patient prompt source of truth: `supabase/functions/_shared/patient-prompt.ts` (mirrored in `prompts/base-prompt.md`). After changing it, call `agent-sync`.
- Plan and priorities: `PLAN.md`. Demo over completeness: voice → director → report must always work.
