# HackTribe submission – Ivory (final)

## Project Name
Ivory — session simulator

## Problem
Difficult conversations (distrust, withdrawal, delusions, suicidal thoughts) are learned through practice, but psychology students and early-career psychologists rarely get safe opportunities to practise. Mistakes with real patients have real costs, and supervision or actor role-plays are expensive, infrequent and hard to repeat. Poland's new Act on the Psychologist Profession (January 2026) formalises training standards, increasing the need for scalable, repeatable practice tools.

## Solution
Ivory is a training simulator: a psychologist talks to an AI patient by voice (or by typing) and gets a verifiable report afterwards.

- First visit: you only know the patient's name and age. Your job is to find out what they really need.
- Every patient has one main hidden need and two secondary ones. The patient opens up gradually, according to explicit rules: open questions, accurate reflections and validation make them talk; advice, judgment, rushing or checklist-style questions make them withdraw. Nothing runs between turns, so the voice conversation stays fast.
- After the call, the analysis:
  - tags every psychologist utterance (open question, reflection, validation, advice, judgment, risk question…) and replays the patient's trust curve deterministically from fixed weights,
  - scores how deeply each hidden need was explored: main need up to 60 points, each secondary need up to 20 (e.g. 13/20 if the topic came up but wasn't explored), with what was missing,
  - gives feedback on an 8-criterion rubric with quotes, better alternative phrasings and coaching moments, plus the recording with clickable moments.
- Follow-up visit: the same patient remembers the previous conversation; only what was actually discovered carries over.

Verifiability and control: every quote must appear in the transcript, or it is discarded. Each need is scored 3 times independently (median), and a need counts as discovered only with a verified quote from the patient. Metrics and trust are computed in code, not by the model's opinion. The scoring rule is the same for every patient.

## Challenges
OPEN TASK: ARTIFICIAL INTELLIGENCE

## Idea stage
New idea – built entirely during HackYeah 2026.

## What's done so far and goal of your project
Before the event: only the idea. All code, the database, the voice agent and the design were created during HackYeah.

Built during HackYeah:
- web app (Next.js, "Ivory" design): dashboard, modules, patient card, voice/text session, report, account settings, login,
- Polish ElevenLabs voice agent: one agent, persona and hidden needs as dynamic variables, shared guardrails, a voice per patient,
- post-call analysis (Supabase Edge Functions + OpenAI structured outputs): utterance tagging, deterministic trust curve, partial need scoring (60/20/20) with verified quotes, 8-criterion rubric ×3 with median, coaching moments, recordings in Storage,
- two patients (Marek – insomnia and distrust, Anna – grief and withdrawal) and a follow-up visit with memory of the previous one.

Goal: a working end-to-end prototype ready for a pilot with a university or training centre. Next: supervisor panel with persona and rubric editors, validation with clinical psychologists, more personas and languages.

## Team status
Full team

## Current team size
2

## Needed skills
None. Optional: a clinical psychologist/supervisor to validate personas and the rubric.

## Your video presentation
[YouTube link – unlisted]

## Website
https://probna-sesja.vercel.app

## Code Repository
[GitHub link]

## Instructions on how to open project
1. Open https://probna-sesja.vercel.app in Chrome or Edge on a computer (headphones recommended).
2. Log in: e-mail jury@ivory.demo, password: [password].
3. Optional: Settings → enter your first name, so the patient addresses you correctly (Pan/Pani).
4. Modules → "Pierwsza wizyta" (First visit) → "Rozpocznij symulację" (Start). Allow the microphone, or type in the chat box. Speak Polish as at a first appointment.
5. Say goodbye to the patient or click "Zakończ" → "Zakończ i oceń". After about a minute you get the report: score (needs 60/20/20), trust curve, rubric with quotes, coaching moments, recording.
6. In the report, "Umów kolejną wizytę" (Book a follow-up) – the same patient remembers the previous visit.

Tools and AI used: ElevenLabs Agents (voice: speech recognition, patient LLM, speech synthesis), OpenAI API (post-call analysis and evaluation), Supabase (Postgres, Edge Functions, Storage, Auth), Vercel, Next.js. Claude (Claude Code, Claude Design) was used to build the code and the design.

## Presentation
PDF, up to 10 slides.
