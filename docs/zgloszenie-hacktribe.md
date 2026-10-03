# Zgłoszenie HackTribe – Ivory (draft do 20:00, edycja do jutra 11:00)

## Project Name
Ivory — symulator sesji

## Published
Zaznaczone (organizatorzy: na tym etapie bez znaczenia).

## Problem
Umiejętność rozmowy z pacjentem w trudnych sytuacjach – nieufność, wycofanie, urojenia, myśli samobójcze – zdobywa się praktyką. Studenci psychologii i psycholodzy na początku praktyki mają jednak bardzo mało bezpiecznych okazji do ćwiczeń: błąd w rozmowie z prawdziwym pacjentem ma realną cenę, a superwizja i ćwiczenia z aktorami lub z kolegami są drogie, rzadkie i trudne do powtórzenia w tym samym scenariuszu.

Problem rośnie: ustawa o zawodzie psychologa z 23 stycznia 2026 r. formalizuje zawód i standardy kształcenia, więc uczelnie i ośrodki szkoleniowe będą potrzebować skalowalnych narzędzi do ćwiczenia kompetencji rozmowy – takich, które da się powtarzać i obiektywnie oceniać.

## Solution
Ivory to platforma treningowa, na której psycholog rozmawia GŁOSEM z AI odgrywającym trudnego pacjenta, a po rozmowie dostaje szczegółową, weryfikowalną ocenę.

- Pierwsza wizyta: psycholog zna tylko imię i wiek pacjenta – sam musi wybadać, z czym pacjent przychodzi i czego potrzebuje.
- Pacjent ma ukryty stan: poziom zaufania i ukryte potrzeby. Osobny model („reżyser”) po każdej wypowiedzi psychologa rozpoznaje technikę (pytanie otwarte, parafraza, walidacja, przedwczesna rada, ocenianie, pytanie o ryzyko) i zmienia zaufanie. Pacjent ujawnia kolejną potrzebę dopiero, gdy psycholog na to zapracuje – nie zwierza się „na zawołanie”.
- Raport: wynik 0–100, 8 kryteriów (m.in. aktywne słuchanie, walidacja emocji bez potwierdzania urojeń, reakcja na sygnały zagrożenia) z cytatami z rozmowy i lepszymi wariantami wypowiedzi, wykres zaufania w czasie, odkryte i przeoczone potrzeby, nagranie z momentami do odsłuchania.
- Kolejna wizyta: ten sam pacjent pamięta poprzednią rozmowę; przechodzi tylko to, co psycholog faktycznie z niego wydobył.

Weryfikowalność i kontrola: każdy cytat w ocenie musi dosłownie występować w transkrypcie (inaczej jest odrzucany), ocena to mediana z 3 niezależnych ocen z widocznym rozrzutem, metryki są liczone deterministycznie, a „odkryta potrzeba” wymaga zweryfikowanego cytatu pacjenta.

Odpowiedzialne AI: to trening komunikacji, nie terapia ani diagnoza; pacjent nigdy nie podaje metod samookaleczenia (guardrail promptu + niezależny guardrail platformy); persony bez stereotypów; analizujemy treść wypowiedzi, nie emocje z głosu (AI Act art. 5).

Korzyści: nieograniczona liczba bezpiecznych powtórek, natychmiastowa i powtarzalna informacja zwrotna, mniejsze obciążenie superwizorów.

## Challenges
OPEN TASK: ARTIFICIAL INTELLIGENCE

## Cover image
Zrzut ekranu raportu (wykres zaufania + ukryte potrzeby) albo ekran rozmowy głosowej z wizualizerem – 16:9, styl Ivory.

## Idea stage
New idea (projekt zbudowany w całości podczas HackYeah 2026). Jeśli w liście nie ma takiej opcji, wybierz najbliższą i dopisz to w polu poniżej.

## What's done so far and goal of your project
Przed wydarzeniem: tylko pomysł. Cały kod, baza, agent głosowy i design powstały podczas HackYeah. Zespół ma wcześniejsze doświadczenie z trenerami rozmów głosowych AI w innej branży (know-how, bez przenoszenia kodu).

Zrobione podczas HackYeah:
- aplikacja webowa (Next.js) z designem „Ivory”: pulpit postępów, moduły, karta pacjenta, rozmowa głosowa, raport,
- agent głosowy ElevenLabs po polsku: jeden agent, persona przekazywana w zmiennych dynamicznych, wspólne guardrails, różne głosy per pacjent,
- „reżyser” (Supabase Edge Function + OpenAI): tagowanie wypowiedzi, deterministyczny wskaźnik zaufania, odblokowywanie ukrytych potrzeb w trakcie rozmowy,
- ocena po rozmowie: transkrypt i audio z ElevenLabs, metryki, rubryka 8 kryteriów oceniana 3× z medianą, weryfikacja cytatów, weryfikacja ujawnionych potrzeb, momenty do coachingu,
- dwa moduły: pierwsza wizyta (2 pacjentów: Marek – bezsenność i nieufność, Anna – żałoba i wycofanie) oraz kolejna wizyta z pamięcią poprzedniej rozmowy,
- baza Supabase z RLS, anonimowe logowanie, nagrania w Storage, wdrożenie na Vercel.

Cel: działający prototyp pełnej ścieżki (wybór pacjenta → rozmowa głosowa → raport z cytatami → kolejna wizyta), gotowy do pilotażu z uczelnią lub ośrodkiem szkoleniowym. Dalej: panel superwizora z edytorem person i rubryki, walidacja rubryki przez psychologów, więcej person, wersje językowe.

## Team status
Full team

## Current team size
2

## Needed skills
Brak (pełny zespół). Opcjonalnie: Expert in specific Task – psycholog/superwizor do walidacji person i rubryki.

## Skills comment
Zespół jest kompletny. Chętnie przyjmiemy konsultację psychologa klinicznego lub superwizora, który zweryfikuje persony i rubrykę oceny.

## Your video presentation (Public or Listed YouTube link)
[do uzupełnienia – nagranie ekranu: rozmowa z pacjentem + raport, 1–2 min, YouTube „Niepubliczny”]

## Website
https://probna-sesja.vercel.app

## Code Repository
[do uzupełnienia – link do GitHuba po wypchnięciu repo]

## Instructions on how to open project
1. Otwórz https://probna-sesja.vercel.app w Chrome lub Edge na komputerze (najlepiej ze słuchawkami).
2. Konto tworzy się automatycznie (logowanie anonimowe) – bez rejestracji.
3. Moduły → „Pierwsza wizyta” → pojawi się losowy pacjent (znasz tylko imię i wiek).
4. „Rozpocznij symulację” i zezwól na mikrofon. Rozmawiaj po polsku jak na pierwszej wizycie; w trybie „Trening” widzisz na żywo zaufanie pacjenta.
5. „Zakończ” → „Zakończ i oceń”. Po ok. minucie pojawi się raport: wynik, 8 kryteriów z cytatami (klik = odsłuch), wykres zaufania, odkryte/przeoczone potrzeby, momenty do coachingu.
6. W raporcie „Umów kolejną wizytę” – ten sam pacjent pamięta poprzednią rozmowę.

Uruchomienie lokalne: `npm install` → `npm run dev`. Backend działa w Supabase Edge Functions (klucze ElevenLabs i OpenAI tylko w Supabase secrets); schemat bazy w `supabase/migrations/`.

Użyte narzędzia i AI (ujawnienie): ElevenLabs Agents (głos, STT/TTS, LLM pacjenta), OpenAI API (reżyser i ocena), Supabase, Vercel, Next.js; przy tworzeniu kodu i designu korzystaliśmy z Claude (Claude Code, Claude Design).

## Presentation
PDF, max 10 slajdów, max 10 MB – z Claude Design (prompt: `prompts/claude-design-deck-prompt.md`).
