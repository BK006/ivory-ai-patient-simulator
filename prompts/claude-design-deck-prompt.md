Przygotuj deck prezentacji (PDF, **maksymalnie 10 slajdów**, 16:9) dla projektu **Ivory — symulator sesji** na hackathon HackYeah 2026, kategoria **Artificial Intelligence**. Wszystkie teksty po polsku. Deck idzie do zgłoszenia (ocenia komisja mentorów) i do pitchu finałowego przed jury, więc musi się bronić zarówno czytany samodzielnie, jak i jako tło dla mówcy.

## Kryteria oceny (deck ma je wprost adresować)
- Idea i innowacyjność — 30%
- Związek z kategorią (rola AI, jak komponenty współpracują, jak użytkownik weryfikuje wyniki i zachowuje kontrolę, możliwości i ograniczenia) — 20%
- Praktyczna użyteczność — 20%
- Design — 20%
- Kompletność i gotowość do wdrożenia — 10%

## Styl wizualny: design system „Ivory” (ten sam co w aplikacji)
- Tło złamana biel `#F6F4F0`, karty `#FFFFFF`, cienkie linie `#E4E0D8` zamiast cieni.
- Tekst grafitowy `#141414`, drugorzędny `#67625A`, trzeciorzędny `#8A847A`.
- Jeden akcent: mięta `#63BFA7` (ciemniejsza do tekstu `#206356`). Koral `#CF6950` tylko dla negatywnych zmian, zawsze z liczbą lub znakiem.
- Typografia: Geist. Nagłówki duże i cienkie (weight 300, ciasny tracking), liczby tabularne, bardzo dużo powietrza.
- Zaokrąglenia 20–24 px, żadnych stockowych zdjęć ludzi, żadnych ikon mózgu ani zielonych krzyży. Spokojny, kliniczny, ale ciepły klimat („healthcare mind 2.0”, inspiracja Neko Health).
- Jeden pomysł na slajd. Maks. ~30 słów tekstu głównego na slajd (poza slajdem architektury).

## Slajdy

**1. Tytuł**
„Ivory — przećwicz najtrudniejszą rozmowę, zanim odbędzie się naprawdę.” Podtytuł: symulator sesji, w którym psycholog rozmawia głosem z AI odgrywającym trudnego pacjenta i dostaje weryfikowalną ocenę. Kategoria Artificial Intelligence · HackYeah 2026 · [nazwa zespołu]. W tle subtelny motyw wizualizera głosu (okrąg z promieniście ułożonych kresek, jak w aplikacji).

**2. Problem**
Umiejętności rozmowy w trudnych sytuacjach (nieufność, wycofanie, urojenia, ryzyko samobójcze) zdobywa się praktyką, a początkujący psychologowie i studenci mają mało bezpiecznych okazji. Błąd z prawdziwym pacjentem ma realną cenę. Superwizja i ćwiczenia z aktorami są drogie, rzadkie i trudne do powtórzenia. Pokaż to jako 3 krótkie fakty-karty.

**3. Rozwiązanie — jak to działa dla użytkownika**
Trzy kroki w poziomie: (1) Wybierz moduł — na pierwszej wizycie nic nie wiesz o pacjencie, (2) Porozmawiaj głosem — pacjent reaguje na Twój styl, (3) Zobacz, co zadziałało — ocena z cytatami i lepszymi wariantami wypowiedzi. Plus czwarty element: Kolejna wizyta — ten sam pacjent pamięta poprzednią rozmowę.

**4. Demo / screeny**
Kompozycja 2–3 zrzutów ekranu aplikacji (miejsca na screenshoty z podpisami): ekran rozmowy głosowej ze wskaźnikiem zaufania pacjenta, raport z wykresem zaufania w czasie, lista ukrytych potrzeb (odkryte / przeoczone). Podpis: „Ta sama rozmowa — dwa podejścia: rada i ocenianie → pacjent się zamyka; walidacja i pytania otwarte → pacjent mówi o tym, co naprawdę go boli.”

**5. Innowacja: pacjent z ukrytym stanem (aktor + reżyser)**
Kluczowa różnica wobec „chatbota udającego pacjenta”: pacjent ma ukryty stan — poziom zaufania 0–100 i ukryte potrzeby z progami. Reżyser (osobny model) po każdej wypowiedzi psychologa rozpoznaje technikę (pytanie otwarte, parafraza, walidacja, przedwczesna rada, ocenianie, pytanie o ryzyko), deterministycznie zmienia zaufanie i dopiero po przekroczeniu progu pozwala pacjentowi ujawnić kolejną potrzebę. Efekt: pacjent nie zwierza się „na zawołanie” — szczerość trzeba zdobyć. Wizualizacja: krzywa zaufania z pinezkami „nowa potrzeba odblokowana”.

**6. Architektura i rola AI**
Czytelny diagram przepływu:
Przeglądarka (Next.js) → **ElevenLabs Agents** (głos: rozpoznawanie mowy, LLM pacjenta, synteza głosu; jeden agent, persona = zmienne dynamiczne, wspólne guardrails) ⇄ **Reżyser** (Supabase Edge Function + OpenAI, structured outputs: tagowanie wypowiedzi → zaufanie → odblokowanie potrzeb → kontekst do agenta) → po rozmowie **Ocena** (Edge Function: transkrypt i audio z ElevenLabs → metryki liczone w kodzie → rubryka 8 kryteriów oceniana 3× niezależnie przez OpenAI → mediana) → **Raport**. Dane: Supabase (Postgres z RLS, Storage na nagrania). Sekrety tylko po stronie serwera.

**7. Jak użytkownik weryfikuje AI i zachowuje kontrolę**
Cztery karty:
- Cytaty weryfikowane: każdy cytat w ocenie musi dosłownie występować w transkrypcie, inaczej jest odrzucany; kliknięcie odtwarza fragment nagrania.
- Mediana z 3 ocen + widoczny rozrzut, metryki (np. stosunek parafraz do pytań, % pytań otwartych) liczone deterministycznie, nie „z opinii modelu”.
- Odkryte potrzeby pochodzą z logu stanu pacjenta, a nie z oceny LLM.
- Superwizor może nadpisać ocenę; rubryka i persony są konfigurowalne i wymagają weryfikacji klinicznej.

**8. Odpowiedzialne AI**
- To trening komunikacji, nie terapia ani diagnoza — komunikat widoczny w aplikacji.
- Pacjent nigdy nie podaje metod samookaleczenia (guardrail promptu + niezależny guardrail platformy); ryzyko jest sygnalizowane tak, by uczyć rozpoznawania.
- Persony bez stereotypów (osoba z myślami prześladowczymi nie jest przedstawiana jako groźna).
- Nagrania z retencją 30 dni, zgoda przed sesją.

**9. Dla kogo i wdrożenie**
Odbiorcy: studenci psychologii, psycholodzy na początku praktyki, superwizorzy i trenerzy, uczelnie, ośrodki szkoleniowe, linie wsparcia kryzysowego. Dlaczego teraz: nowa ustawa o zawodzie psychologa (2026) formalizuje zawód i standardy kształcenia. Model: licencja dla uczelni / ośrodka, panel superwizora z własnymi personami i rubryką. Stan prototypu: działa pełna ścieżka — moduł → rozmowa głosowa → reżyser → ocena → raport → kolejna wizyta.

**10. Ograniczenia, dalsze kroki i zespół**
Ograniczenia: brak potwierdzonej skuteczności szkoleniowej, rubryka i persony wymagają walidacji przez psychologów i superwizorów, jakość zależy od rozpoznawania mowy. Dalej: pilotaż z uczelnią, większa biblioteka person, panel superwizora, wersje językowe, integracja z platformami e-learningowymi. Na dole: zespół [imiona] i ujawnienie użytych narzędzi: ElevenLabs Agents, OpenAI API, Supabase, Vercel, Next.js; narzędzia AI użyte przy tworzeniu (Claude).

## Wymagania techniczne
- Format 16:9, eksport do PDF, czcionki osadzone.
- Na slajdzie 4 zostaw wyraźne ramki na zrzuty ekranu (podmienię na prawdziwe).
- Numer slajdu i „Ivory” w stopce, małym tekstem trzeciorzędnym.
- Kontrast min. AA; znaczenie nigdy nie tylko kolorem (zawsze liczba, znak lub etykieta).
