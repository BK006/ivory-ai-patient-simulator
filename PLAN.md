# Próbna Sesja – plan implementacji (HackYeah 2026, Artificial Intelligence)

> Start: **sob 3.10, 11:00** (regulamin błędnie podaje 11 PM). Oddanie: zakładamy **nd 4.10, 11:00**. Potwierdzić na Discordzie!
> Celujemy w wysyłkę o 10:00.
> Jeśli cokolwiek przenosimy z AgentSunrise (kod, prompty, rubryka), zgłaszamy to w opisie projektu jako element istniejący przed hackathonem.

---

## 1. Stack i podział odpowiedzialności

| Warstwa | Narzędzie | Rola |
|---|---|---|
| Frontend | **Next.js 16 (App Router) na Vercel** | Tylko UI, bez sekretów i bez lokalnego env poza publicznym URL/anon key |
| API | **Supabase Edge Functions** | `session-start`, `director`, `finalize`; sekrety tylko w Supabase secrets |
| Baza, auth, pliki | **Supabase** | Postgres + RLS, anon auth, Storage (audio sesji) |
| Głos (aktor) | **ElevenLabs Agents** (WebRTC, `@elevenlabs/react`) | STT, LLM pacjenta, TTS, turn-taking, guardrails platformy |
| Reżyser (stan pacjenta) | **OpenAI API**, mały model + structured outputs | Taguje każdą wypowiedź psychologa i aktualizuje zaufanie |
| Ocena | **OpenAI API**, duży model + structured outputs | Rubryka, cytaty, lepsze warianty wypowiedzi |

Zasada: **przeglądarka nigdy nie pisze do bazy i nie zna kluczy.** Wszystkie zapisy idą przez Edge Functions z service role key.
Klucz ElevenLabs służy tylko do wydania tokenu rozmowy (`get_webrtc_token`) po stronie serwera.

### Sekrety (Supabase Edge Function secrets, nie .env)
```
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
OPENAI_API_KEY=
OPENAI_DIRECTOR_MODEL=      # mały i szybki, np. gpt-5.4-mini; sprawdzić w H0
OPENAI_EVAL_MODEL=          # duży, np. gpt-5.5; sprawdzić w H0
```

---

## 2. Architektura: aktor, reżyser, oceniający

```
 Psycholog (mikrofon)
      │ WebRTC
      ▼
 ElevenLabs Agent  ── „AKTOR” ─────────────────────────────────────────┐
  • jeden agent, prompt = WSPÓLNE guardrails + {{dynamic_variables}}     │
  • głos per persona (override tts.voice_id)                            │
      │ onMessage (transkrypt wypowiedzi psychologa)                    │
      ▼                                                                 │
 edge fn `director`  ── „REŻYSER” (OpenAI mini, structured outputs)          │
  • tagi wypowiedzi: open_q / closed_q / reflection_simple /            │
    reflection_complex / validation / premature_advice / judgment /     │
    confirms_delusion / risk_question / boundary_setting / other        │
  • Δzaufania = SUMA(wagi tagów ze scenariusza)  ← deterministyczne      │
  • próg zaufania → odblokowanie ukrytej potrzeby                       │
  • zapis do director_events                                            │
      │ tekst [REŻYSER]                                                 │
      └──► sendContextualUpdate() ──────────────────────────────────────┘
                     (wpływa na kolejną odpowiedź pacjenta)

 Koniec rozmowy → edge fn `finalize`
  1. GET transcript z ElevenLabs (tury + time_in_call_secs) → turns
  2. GET audio → Supabase Storage (retencja 30 dni)
  3. metryki deterministyczne z tagów reżysera (R:Q, % pytań otwartych…)
  4. ocena rubryką: OpenAI ×3 równolegle → mediana + rozrzut
  5. weryfikacja cytatów: dosłowne dopasowanie do turns, inaczej odrzuć
  6. odkryte / przeoczone potrzeby = log reżysera (nie opinia modelu)
```

**Kluczowa decyzja:** ukryte potrzeby **nie trafiają do promptu aktora** na starcie.
Aktor zna tylko powierzchowną historię i dostaje kolejną potrzebę dopiero od reżysera, gdy zaufanie przekroczy próg. Dzięki temu:
- pacjent fizycznie nie może za wcześnie wszystkiego wyznać (typowy problem LLM-pacjentów: są zbyt współpracujący),
- „co odkryłeś / co przeoczyłeś” da się zweryfikować w logu,
- ukryte potrzeby nie wyciekają w dynamic variables widocznych w przeglądarce.

Opóźnienie: reżyser reaguje na turę N, a efekt widać od tury N+1. W rozmowie terapeutycznej to naturalne. Nie blokujemy na tym aktora.

---

## 3. Prompt = wspólne guardrails + dynamic variables

Plik: [`prompts/base-prompt.md`](prompts/base-prompt.md). To jeden agent ElevenLabs dla wszystkich person.

| Zmienna | Przykład | Uwagi |
|---|---|---|
| `persona_name` | Marek | |
| `persona_age` | 54 | |
| `persona_gender` | mężczyzna | Ważne dla polskiej odmiany („byłem/byłam”) |
| `background` | Magazynier, rozwiedziony od 2 lat, mieszka sam… | Tylko fakty powierzchowne |
| `presenting_problem` | Skierowany przez lekarza rodzinnego z powodu bezsenności | |
| `personality` | Nieufny, ironiczny, inteligentny, łatwo czuje się oceniany | |
| `tone` | Chłodny, zdystansowany, krótkie odpowiedzi; ociepla się powoli | |
| `speech_style` | Potoczny, wtrącenia „no”, „wie pani”, unika słów o emocjach | |
| `attitude_to_therapy` | „To strata czasu, przyszedłem, bo lekarz kazał” | |
| `clinical_notes` | Łagodne myśli prześladowcze: sąsiad „nasłuchuje”… | Z opisu klinicznego, bez stereotypu groźności |
| `risk_profile` | Bierne myśli „lepiej byłoby nie budzić się”; ujawnia tylko zapytany wprost, przy zaufaniu ≥ 70 | Bez metod i szczegółów |
| `difficulty` | trudny | łatwy / średni / trudny, zmienia progi i wagi |
| `opening_line` | „No… dzień dobry. Nie wiem właściwie, po co tu jestem.” | Używane jako `first_message` |

Głos ustawiamy przez override `tts.voice_id` per persona. Overridy trzeba włączyć w ustawieniach bezpieczeństwa agenta.

### Guardrails na dwóch warstwach
1. **W prompcie (wspólne):** zostań w roli, nie dawaj porad, zero metod samookaleczenia, brak przemocy jako cechy osoby z psychozą, wyjście z roli tylko na `STOP`.
2. **Platforma ElevenLabs (`platform_settings.guardrails`):**
   - `focus` i `prompt_injection`: włączone.
   - **Uwaga:** filtr treści `self_harm` przy domyślnym progu zablokuje grę pacjenta z myślami samobójczymi. Ustawiamy wysoki próg albo wyłączamy go i zastępujemy regułą custom poniżej. Testujemy w H0.
   - Reguła custom „Brak szczegółów metod”: blokuje opisy metod, środków i planów samookaleczenia lub samobójstwa (`trigger_action: retry`).
   - Reguła custom „Pacjent nie terapeutyzuje”: blokuje, gdy agent zaczyna doradzać jak terapeuta albo wychodzi z roli asystenta AI.
   - `privacy`: retencja minimalna, audio pobieramy do własnego Storage.

---

## 4. Baza (Supabase)

```sql
personas        (id, name, age, gender, voice_id, avatar_url, vars jsonb, is_published, created_by)
scenarios       (id, persona_id, title, difficulty, briefing, trust_start, tag_weights jsonb, rubric_id)
hidden_needs    (id, scenario_id, ord, label, unlock_threshold, actor_hint, required_tags text[])
rubrics         (id, name, version)
criteria        (id, rubric_id, key, name, description, levels jsonb /* 1..4 z opisami */, weight)
sessions        (id, user_id, scenario_id, el_conversation_id, status, started_at, ended_at, audio_path, mode /* trening|egzamin */)
turns           (id, session_id, idx, speaker /* therapist|patient */, text, t_start_s)
director_events (id, session_id, turn_idx, tags text[], trust_before, trust_after, unlocked_need_id, update_text)
evaluations     (id, session_id, run_no, model, raw jsonb, created_at)
scores          (id, session_id, criterion_id, score_median, score_spread, comment, override_score, override_by, override_note)
evidence        (id, score_id, turn_idx, quote, verified bool, better_alternative)
coaching_moments(id, session_id, turn_idx, what_happened, why_it_matters, better_alternative, trust_delta)
```
RLS: trenujący widzi tylko swoje sesje. Superwizor (`profiles.role`) widzi swoją grupę i edytuje persony, scenariusze i rubryki.
Retencja: cron albo funkcja usuwająca audio po 30 dniach. „Usuń konto” kasuje wszystko kaskadowo.

---

## 5. Rubryka v1 (8 kryteriów, poziomy 1–4)

| Klucz | Kryterium | Źródło / kotwica |
|---|---|---|
| `active_listening` | Aktywne słuchanie i parafraza | MITI: R:Q ≥ 1:1 (OK), ≥ 2:1 (dobrze); % parafraz złożonych |
| `open_questions` | Pytania otwarte a zamknięte | % pytań otwartych z tagów reżysera |
| `validation_no_collusion` | Walidacja emocji bez potwierdzania urojeń | LEAP (Amador): słuchaj, empatia, bez sporu i bez przytakiwania treści |
| `no_premature_advice` | Brak przedwczesnych rad i oceniania | Liczba tagów `premature_advice` i `judgment` |
| `pacing` | Tempo rozmowy | Długość wypowiedzi, przerywanie, liczba tematów naraz |
| `alliance` | Budowanie sojuszu terapeutycznego | Trajektoria zaufania + jakościowo |
| `risk_response` | Reakcja na sygnały zagrożenia | Czy padło bezpośrednie pytanie (C-SSRS) i jaka była reakcja |
| `boundaries_role` | Jasność granic i roli | Kontrakt, poufność, czas, cel spotkania |

Każdy poziom ma opis tekstowy w `criteria.levels`. Oceniający dostaje pełne opisy i musi wskazać `turn_idx` i dosłowny cytat.
Metryki liczbowe wyliczamy w kodzie i podajemy modelowi jako fakty, nie do zgadywania.

---

## 6. Ekrany

1. **Start**: hasło, disclaimer („trening komunikacji, nie terapia ani diagnoza”), CTA.
2. **Wybór scenariusza**: karty person (awatar, poziom, czego uczy).
3. **Briefing**: skierowanie / notatka z rejestracji, test mikrofonu, wybór trybu (trening = widoczny wskaźnik zaufania, egzamin = ukryty), zgoda na nagranie.
4. **Sesja na żywo**: orb / fala głosu pacjenta, timer, wskaźnik zaufania (tryb trening), przycisk **„Wyjdź z roli / STOP”**, opcjonalnie transkrypt na żywo.
5. **Raport** (najważniejszy ekran dla jury):
   - wynik ogólny + 8 kart kryteriów (ocena, rozrzut, komentarz, cytaty → klik odtwarza audio od `t_start_s`),
   - **wykres zaufania w czasie** z pinezkami momentów do coachingu,
   - ukryte potrzeby: odkryte ✔ / przeoczone ✖ (z logu reżysera),
   - momenty do coachingu: „Powiedziałeś X → pacjent się wycofał (−12) → spróbuj Y”,
   - „Nie zgadzam się z oceną”: superwizor nadpisuje ocenę z notatką.
6. **Historia i postęp**: lista sesji, wykres wyników per kryterium.
7. **Panel superwizora**: edytor persony (pola = dynamic variables, wybór i odsłuch głosu), ukryte potrzeby z progami, wagi tagów, edytor rubryki.

Wszystkie teksty UI po polsku. Design: spokojny, kliniczny, ale ciepły (nie „szpitalny”).

---

## 7. Persony na demo

1. **Marek, 54 (główna, dopracowana)**: nieufny, skierowany przez lekarza z powodu bezsenności, łagodne myśli prześladowcze wobec sąsiada. Nie jest groźny.
   Ukryte potrzeby: (1) chce, żeby ktoś uwierzył, że naprawdę nie śpi, (2) samotność po rozwodzie, (3) lęk przed utratą pracy, (4) bierne myśli rezygnacyjne, ujawniane tylko zapytany wprost przy zaufaniu ≥ 70.
   Uczy: walidacji bez potwierdzania urojeń, budowania zaufania, pytania o ryzyko.
2. **Ola, 19 (jeśli zostanie czas)**: studentka, wycofana, odpowiada monosylabami, przyszła, bo „mama kazała”. Uczy tolerowania ciszy i pytań otwartych.

Scenariusz demo na scenie (nagrany wcześniej jako zapas):
- **Runda A, „źle”**: rady, ocenianie, „ale przecież sąsiad nie może pana podsłuchiwać”. Zaufanie spada, Marek się zamyka.
- **Runda B, „dobrze”**: parafrazy, walidacja, pytanie o sen. Zaufanie rośnie, Marek mówi o samotności, padają pytanie o ryzyko i bezpieczne zamknięcie.
- **Raport A i B obok siebie.**

---

## 8. Harmonogram (24 h)

Role zakładają 2–4 osoby: **F** = frontend/design, **V** = voice/ElevenLabs, **B** = backend/AI, **P** = persony/rubryka/pitch.

| Godz. | Co | Kto |
|---|---|---|
| **13:15–14:30 · H0 spike** | Repo, Next 16 (przeczytać `node_modules/next/dist/docs`), Vercel, Supabase. Agent ElevenLabs z base promptem. **Testy ryzyk:** (a) jakość polskiego głosu i ASR, (b) `sendContextualUpdate` zmienia zachowanie, (c) guardrail `self_harm` vs persona, (d) nazwy modeli OpenAI. | wszyscy |
| 14:30–17:00 | Pętla głosowa end-to-end: briefing → start sesji (token z `edge fn `session-start``) → rozmowa → koniec → zapis transkryptu do `turns`. | V + B |
| 14:30–17:00 | Schemat bazy + seed Marka. Design system, layout, ekran wyboru i briefingu. | B / F |
| 14:30–17:00 | Persona Marek: vars, ukryte potrzeby, progi, wagi tagów. Rubryka z opisami poziomów. | P |
| 17:00–20:00 | `edge fn `director``: tagowanie, zaufanie, odblokowania, contextual updates, `director_events`. Wskaźnik zaufania na żywo. | B + V |
| 17:00–20:00 | Ekran sesji na żywo (orb, timer, STOP, wskaźnik). | F |
| 20:00–24:00 | `/finalize`: metryki, ocena ×3, mediana, weryfikacja cytatów, coaching moments, audio do Storage. | B |
| 20:00–24:00 | Raport: karty kryteriów, cytaty z odtwarzaniem, wykres zaufania, potrzeby, coaching. | F |
| 00:00–03:00 | Panel superwizora (edytor persony + ukryte potrzeby), nadpisywanie ocen, historia. | F + B |
| 00:00–03:00 | Strojenie Marka: 10+ rozmów testowych, czy nie jest za miły, czy progi działają. Testy guardrails (ElevenLabs agent tests). | V + P |
| *zmiany snu* | Po 2–3 h na osobę, rotacyjnie, między 01:00 a 06:00 | |
| 03:00–06:00 | Ola (opcjonalnie), wykres postępu, polish UI, empty i loading states, mobile check. | kto nie śpi |
| **06:00 FEATURE FREEZE** | Od teraz tylko bugfixy. | |
| 06:00–08:00 | Nagranie demo A/B (zapas wideo), screenshoty, deploy produkcyjny, seed danych do historii. | V + F |
| 08:00–09:30 | 10 slajdów PDF, opis projektu, sekcja „użyte AI i zasoby”, README z architekturą. Slajdy można zacząć wcześniej, równolegle (P). | P + wszyscy |
| 09:30–10:00 | Próba pitchu, **wysyłka na platformę**. | wszyscy |
| 10:00–11:00 | Bufor. | |

### Must-have / nice-to-have
**Must:** 1 persona, głos PL, reżyser + wskaźnik zaufania, raport z cytatami (zweryfikowanymi) i wykresem, coaching moments, edytor persony, disclaimer i STOP, nagranie zapasowe.
**Nice:** druga persona, historia i postęp, edytor rubryki, nadpisywanie ocen, tryb egzaminu, eksport PDF raportu.
**Wycinamy jako pierwsze:** edytor rubryki (seed w SQL), druga persona, eksport PDF.

---

## 9. Slajdy (max 10)

1. Problem: trudne rozmowy ćwiczy się na prawdziwych pacjentach.
2. Rozwiązanie w jednym zdaniu + screenshot.
3. Demo (wideo lub na żywo): runda A i B.
4. Raport: cytaty, wykres zaufania, coaching.
5. Architektura: aktor, reżyser, oceniający.
6. Jak weryfikować AI: zweryfikowane cytaty, mediana z 3 ocen, log reżysera, nadpisanie oceny przez superwizora.
7. Odpowiedzialne AI: guardrails, brak metod, brak stereotypów, **brak analizy emocji z głosu (AI Act art. 5)**, RODO i retencja.
8. Dla kogo i dlaczego teraz: uczelnie, ośrodki, linie kryzysowe; nowa ustawa o zawodzie psychologa.
9. Ograniczenia i walidacja: pilotaż z uczelnią, rubryka do weryfikacji przez ekspertów.
10. Zespół + użyte narzędzia i AI (ujawnienie).

---

## 10. Ryzyka i plan B

| Ryzyko | Plan B |
|---|---|
| Polski głos ElevenLabs brzmi sztucznie | Inny głos z biblioteki PL / Voice Design; `eleven_v4_turbo` vs `flash_v2_5` |
| `sendContextualUpdate` słabo steruje | Dodatkowo klient-tool `get_patient_state` wołany przez aktora co turę |
| Model wychodzi z roli przy temacie ryzyka | Gotowe kwestie w `risk_profile`, reguła custom z `retry`, inny LLM agenta |
| Wi-Fi na sali | Nagranie demo + hotspot z telefonu |
| Ocena trwa za długo | Streaming: metryki deterministyczne od razu, karty dochodzą po kolei |
| Ocena niestabilna | Temperatura 0, ×3, mediana, rozrzut widoczny w UI |
