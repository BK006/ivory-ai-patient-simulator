Zaprojektuj aplikację webową „Próbna Sesja”: platformę treningową, na której psycholog rozmawia GŁOSEM z AI odgrywającym trudnego pacjenta, a po rozmowie dostaje szczegółową, weryfikowalną ocenę. To nie terapia ani diagnoza, tylko trening komunikacji dla studentów psychologii, młodych psychologów i superwizorów. Wszystkie teksty w UI po polsku.

## Kierunek wizualny: „healthcare mind 2.0”
Inspiracja: Neko Health (nekohealth.com), czyli medycyna przyszłości, która jest spokojna, luksusowo prosta i budzi zaufanie, a nie kojarzy się ze szpitalem.
- Dużo powietrza, mało elementów, każdy ekran ma jeden główny cel.
- Tło złamana biel lub ciepła kość słoniowa (np. #F6F4F0), tekst prawie czarny grafitowy (#141414), drugorzędny ciepły szary.
- Jeden akcent: chłodny, świetlisty (np. przygaszony turkus lub szałwia do jasnej mięty), używany oszczędnie: stan aktywny, poziom zaufania, CTA.
- Ekran rozmowy w wersji ciemnej (głęboki grafit lub granat, #0E1116), żeby skupić uwagę jak w gabinecie z przygaszonym światłem.
- Typografia: duży, cienki, elegancki grotesk do nagłówków (np. Inter Display, Söhne lub podobny, weight 300–400, ciasny tracking), czytelny sans do treści. Liczby tabularne.
- Zaokrąglenia duże, ale nie „bąbelkowe” (16–24 px). Cienkie 1-px linie zamiast cieni. Ewentualnie subtelny frosted glass na panelach nad ciemnym tłem.
- Ruch: powolny, oddechowy (easing out, 400–800 ms), nic nie skacze.
- Bez stockowych zdjęć ludzi, bez ikon mózgu, bez kliszy „zielony krzyżyk”.

## Główny motyw graficzny: „aura pacjenta”
Pacjent nie ma twarzy. Reprezentuje go abstrakcyjna, świetlista, miękka forma (orb lub aura z gradientów i delikatnego szumu), która żyje podczas rozmowy:
- pulsuje, kiedy pacjent mówi, i reaguje na amplitudę głosu,
- **odzwierciedla poziom zaufania:** zamknięty pacjent to forma mała, zwarta, chłodna i przygaszona; otwierający się pacjent to forma większa, cieplejsza, miękko rozlana.
Ten sam motyw w miniaturze pojawia się na kartach person i w raporcie.

## Ekrany do zaprojektowania (desktop 1440 + mobile 390 dla ekranów 1, 2, 4)

1. **Start / landing**: duże hasło (np. „Przećwicz najtrudniejszą rozmowę, zanim odbędzie się naprawdę”), podtytuł, CTA „Rozpocznij trening”, 3 kroki (Wybierz pacjenta → Porozmawiaj głosem → Zobacz, co zadziałało), wyraźna ale elegancka informacja: „To trening komunikacji, nie terapia ani diagnoza”.

2. **Wybór scenariusza**: siatka kart pacjentów. Karta: miniatura aury w kolorze persony, imię i wiek („Marek, 54”), jednozdaniowy opis („Nieufny, skierowany przez lekarza z powodu bezsenności”), poziom trudności (3 kropki), tagi umiejętności („walidacja bez potwierdzania urojeń”, „pytanie o ryzyko”), szacowany czas (8–12 min).

3. **Briefing przed sesją**: notatka ze skierowania stylizowana jak dokument kliniczny (powód wizyty, co wiemy, czego nie wiemy). Test mikrofonu (pasek poziomu). Przełącznik trybu: „Trening” (widzisz wskaźnik zaufania) / „Egzamin” (wskaźnik ukryty). Checkbox zgody na nagranie i informacja o retencji 30 dni. CTA „Wejdź do gabinetu”.

4. **Sesja na żywo (ciemny)**: centralnie duża aura pacjenta. Nad nią imię i timer. Pod nią subtelny wskaźnik zaufania 0–100 (cienki łuk lub linia z wartością, płynnie się zmienia, w trybie egzaminu ukryty). Napis stanu: „Marek mówi…” / „Słucham…”. Na dole: wycisz mikrofon, zakończ sesję, oraz wyraźny, ale spokojny przycisk „Wyjdź z roli (STOP)”. Opcjonalny wysuwany panel z transkryptem na żywo (domyślnie zamknięty). Zero rozpraszaczy.

5. **Raport po sesji** (najważniejszy, jasny, „premium medical report”):
   - Nagłówek: wynik ogólny (np. 68/100) + jedno zdanie podsumowania + data i czas trwania.
   - **Wykres zaufania w czasie**: linia przez całą rozmowę z pinezkami w kluczowych momentach (spadki na czerwono-koralowo, wzrosty w kolorze akcentu). Najechanie pokazuje cytat.
   - **Ukryte potrzeby pacjenta**: lista 4 pozycji, odkryte ✓ (z minutą, kiedy padły) / przeoczone (wyszarzone, z podpowiedzią, co mogło je otworzyć).
   - **8 kart kryteriów** (Aktywne słuchanie, Pytania otwarte, Walidacja bez potwierdzania urojeń, Brak przedwczesnych rad, Tempo, Sojusz terapeutyczny, Reakcja na sygnały zagrożenia, Granice i rola): ocena 1–4 jako segmentowany pasek, mała etykieta „rozrzut ±0,3 (3 oceny AI)”, komentarz, 1–2 cytaty z przyciskiem ▶ odtwarzającym fragment audio i znaczkiem „cytat zweryfikowany w transkrypcie”.
   - Metryki liczbowe w małych kafelkach: stosunek parafraz do pytań (np. 1,4 : 1), % pytań otwartych, liczba przedwczesnych rad.
   - **Momenty do coachingu**: 3 karty „Powiedziałeś(-aś) → Reakcja pacjenta (zaufanie −12) → Spróbuj zamiast tego” z lepszym wariantem wypowiedzi.
   - Akcja „Nie zgadzam się z oceną” (dla superwizora: nadpisanie oceny z notatką).
   - CTA „Powtórz scenariusz” i „Porównaj z poprzednią sesją”.

6. **Historia i postęp**: lista sesji (persona, data, wynik, trend), wykres postępu per kryterium w kolejnych sesjach.

7. **Panel superwizora: edytor persony**: formularz w dwóch kolumnach. Pola: imię, wiek, płeć, historia, powód wizyty, osobowość, ton, sposób mówienia, nastawienie do terapii, obraz kliniczny, profil ryzyka, poziom trudności, pierwsze zdanie. Wybór głosu z przyciskiem odsłuchu. Sekcja „Ukryte potrzeby”: lista z progiem zaufania (suwak 0–100) i podpowiedzią dla aktora. Po prawej podgląd karty persony z aurą. Nad całością przypinka „Persona wymaga weryfikacji klinicznej przed użyciem w szkoleniu”.

## Komponenty i stany
Nawigacja: minimalny top bar (logo-wordmark „Próbna Sesja”, Scenariusze, Historia, Panel, avatar). Stany: ładowanie raportu (aura „analizuje”, kolejne kryteria dochodzą jedno po drugim), pusty stan historii, błąd mikrofonu. Dostępność: kontrast AA, focus ringi, nie opieraj znaczenia tylko na kolorze.

Ton tekstów: spokojny, rzeczowy, wspierający, jak dobry superwizor. Bez wykrzykników i bez gamifikacji typu „Brawo! +10 XP”.
