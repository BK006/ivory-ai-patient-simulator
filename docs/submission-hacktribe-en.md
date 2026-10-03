# HackTribe submission – Ivory (draft by 20:00, editable until 11:00 tomorrow)

## Project Name
Ivory — session simulator

## Published
Checked (organizers: it doesn't matter at this stage).

## Problem
The ability to talk to a patient in difficult situations – distrust, withdrawal, delusions, suicidal thoughts – is learned through practice. Yet psychology students and early-career psychologists have very few safe opportunities to practise: a mistake with a real patient has a real cost, while supervision and role-plays with actors or peers are expensive, infrequent and hard to repeat in the same scenario.

The need is growing: Poland's Act on the Psychologist Profession of 23 January 2026 formalises the profession and its training standards, so universities and training centres will need scalable tools for practising conversation skills – tools that can be repeated and assessed objectively.

## Solution
Ivory is a training platform where a psychologist talks BY VOICE to an AI playing a difficult patient and, after the conversation, receives detailed, verifiable feedback.

- First visit: the psychologist knows only the patient's name and age – they have to find out what the patient comes with and what they need.
- The patient has a hidden state: a trust level and hidden needs. A separate model (the "director") recognises the technique behind every psychologist utterance (open question, reflection, validation, premature advice, judgment, risk question) and adjusts trust. The patient reveals the next need only once the psychologist has earned it – no confessions on demand.
- Report: a 0–100 score, 8 criteria (e.g. active listening, validating emotions without confirming delusions, responding to risk signals) with quotes from the conversation and better alternative phrasings, a trust-over-time chart, discovered and missed needs, and the recording with moments you can replay.
- Follow-up visit: the same patient remembers the previous conversation; only what the psychologist actually drew out carries over.

Verifiability and control: every quote in the evaluation must appear verbatim in the transcript (otherwise it is discarded), the score is the median of 3 independent evaluations with the spread shown, metrics are computed deterministically, and a "discovered need" requires a verified patient quote.

Responsible AI: this is communication training, not therapy or diagnosis; the patient never gives self-harm methods (prompt guardrail + independent platform guardrail); personas avoid stereotypes; we analyse what is said, not emotions in the voice (EU AI Act, Art. 5).

Benefits: unlimited safe repetitions, instant and consistent feedback, less load on supervisors.

## Challenges
OPEN TASK: ARTIFICIAL INTELLIGENCE

## Cover image
Screenshot of the report (trust chart + hidden needs) or of the voice session with the visualiser – 16:9, Ivory style.

## Idea stage
New idea (built entirely during HackYeah 2026). If there is no such option, pick the closest one and state it in the field below.

## What's done so far and goal of your project
Before the event: only the idea. All code, the database, the voice agent and the design were created during HackYeah. The team has prior experience building AI voice conversation trainers in another industry (know-how only, no code reused).

Built during HackYeah:
- web app (Next.js) with the "Ivory" design: progress dashboard, modules, patient card, voice session, report,
- Polish-language ElevenLabs voice agent: a single agent, the persona passed as dynamic variables, shared guardrails, a different voice per patient,
- the "director" (Supabase Edge Function + OpenAI): utterance tagging, deterministic trust meter, unlocking hidden needs during the conversation,
- post-call evaluation: transcript and audio from ElevenLabs, metrics, an 8-criterion rubric scored 3× with the median, quote verification, verification of disclosed needs, coaching moments,
- two modules: first visit (2 patients: Marek – insomnia and distrust, Anna – grief and withdrawal) and a follow-up visit that remembers the previous conversation,
- Supabase database with RLS, anonymous sign-in, recordings in Storage, deployment on Vercel.

Goal: a working prototype of the full path (choose a patient → voice conversation → report with quotes → follow-up visit), ready for a pilot with a university or training centre. Next: a supervisor panel with persona and rubric editors, rubric validation by psychologists, more personas, other languages.

## Team status
Full team

## Current team size
2

## Needed skills
None (full team). Optional: Expert in specific Task – a psychologist/supervisor to validate personas and the rubric.

## Skills comment
The team is complete. We would welcome a consultation with a clinical psychologist or supervisor to validate the personas and the evaluation rubric.

## Your video presentation (Public or Listed YouTube link)
[to add – screen recording: conversation with a patient + report, 1–2 min, YouTube "Unlisted"]

## Website
https://probna-sesja.vercel.app

## Code Repository
[to add – GitHub link once the repo is pushed]

## Instructions on how to open project
1. Open https://probna-sesja.vercel.app in Chrome or Edge on a computer (headphones recommended).
2. An account is created automatically (anonymous sign-in) – no registration.
3. Modules → "Pierwsza wizyta" (First visit) → a random patient appears (you only know name and age).
4. Click "Rozpocznij symulację" (Start simulation) and allow the microphone. Speak Polish as in a first appointment; in "Trening" mode you see the patient's trust live.
5. "Zakończ" → "Zakończ i oceń" (End and evaluate). After about a minute the report appears: score, 8 criteria with quotes (click = replay), trust chart, discovered/missed needs, coaching moments.
6. In the report, "Umów kolejną wizytę" (Book a follow-up visit) – the same patient remembers the previous conversation.

Running locally: `npm install` → `npm run dev`. The backend runs on Supabase Edge Functions (ElevenLabs and OpenAI keys only in Supabase secrets); the database schema is in `supabase/migrations/`.

Tools and AI used (disclosure): ElevenLabs Agents (voice, STT/TTS, patient LLM), OpenAI API (director and evaluation), Supabase, Vercel, Next.js; Claude (Claude Code, Claude Design) was used while building the code and design.

## Presentation
PDF, max 10 slides, max 10 MB – from Claude Design (prompt: `prompts/claude-design-deck-prompt.md`).
