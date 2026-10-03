-- Seed: rubric v1 (8 criteria) + persona Marek + scenario with hidden needs.
-- Fixed UUIDs so the frontend/demo can reference them.

insert into rubrics (id, name, version) values
  ('00000000-0000-4000-a000-000000000001', 'Rubryka podstawowa – pierwsza wizyta', 1);

insert into criteria (rubric_id, ord, key, name, description, levels) values
('00000000-0000-4000-a000-000000000001', 1, 'active_listening', 'Aktywne słuchanie i parafraza',
 'Czy psycholog odzwierciedla treść i emocje pacjenta, zamiast tylko zadawać kolejne pytania. Kotwica MITI: stosunek parafraz do pytań ≥ 1:1 (dobrze), ≥ 2:1 (bardzo dobrze), udział parafraz złożonych.',
 '{"1":"Prawie brak parafraz; rozmowa to seria pytań.","2":"Pojedyncze, proste parafrazy (powtórzenie słów); R:Q < 1:1.","3":"Regularne parafrazy, także złożone (emocja, znaczenie); R:Q ok. 1:1.","4":"Parafrazy dominują nad pytaniami (R:Q ≥ 2:1), trafnie nazywają emocje i znaczenia, pogłębiają rozmowę."}'),
('00000000-0000-4000-a000-000000000001', 2, 'open_questions', 'Pytania otwarte a zamknięte',
 'Czy pytania zapraszają do opowiadania (jak, co, w jaki sposób), czy zawężają do tak/nie.',
 '{"1":"Głównie pytania zamknięte lub kilka pytań naraz.","2":"Mieszanka, przewaga zamkniętych.","3":"Przewaga pytań otwartych, zamknięte użyte celowo (doprecyzowanie).","4":"Pytania otwarte, pojedyncze, dobrze wyczute w czasie; zamknięte tylko tam, gdzie potrzebne (np. ocena ryzyka)."}'),
('00000000-0000-4000-a000-000000000001', 3, 'validation_no_collusion', 'Walidacja emocji bez potwierdzania urojeń',
 'Czy psycholog uznaje przeżycia i emocje pacjenta, nie spierając się z treścią przekonań i jednocześnie jej nie potwierdzając (LEAP: słuchaj, empatyzuj, nie kłóć się, nie przytakuj treści).',
 '{"1":"Spiera się z przekonaniami („to niemożliwe”) albo je potwierdza („sąsiad na pewno pana podsłuchuje”).","2":"Unika tematu lub waha się między sporem a przytakiwaniem.","3":"Waliduje emocje (zmęczenie, niepokój), nie odnosząc się do prawdziwości treści.","4":"Waliduje doświadczenie i emocje, zachowuje neutralność wobec treści, łączy to z realnym problemem (sen, samotność) i wspólnym celem."}'),
('00000000-0000-4000-a000-000000000001', 4, 'no_premature_advice', 'Brak przedwczesnych rad i oceniania',
 'Czy psycholog powstrzymuje się od rad, rozwiązań, moralizowania i ocen, zanim zrozumie sytuację.',
 '{"1":"Wiele rad lub ocen, często w pierwszych minutach.","2":"Kilka rad lub ocen, część łagodzona.","3":"Pojedyncza rada, ale po zrozumieniu sytuacji lub za zgodą pacjenta.","4":"Brak rad i ocen; ewentualne propozycje po zapytaniu o zgodę i z wyborem po stronie pacjenta."}'),
('00000000-0000-4000-a000-000000000001', 5, 'pacing', 'Tempo rozmowy',
 'Czy tempo jest dopasowane do pacjenta: krótkie wypowiedzi, miejsce na ciszę, jeden temat naraz, brak przerywania.',
 '{"1":"Monologi, przerywanie, wiele tematów naraz, pośpiech.","2":"Tempo nierówne; zdarzają się długie wypowiedzi lub przeskoki.","3":"Tempo w większości dopasowane, wypowiedzi zwięzłe.","4":"Tempo wyraźnie dostrojone do pacjenta, w tym celowe zwolnienie przy trudnych tematach."}'),
('00000000-0000-4000-a000-000000000001', 6, 'alliance', 'Budowanie sojuszu terapeutycznego',
 'Czy psycholog buduje współpracę: wspólny cel, szacunek dla autonomii, uznanie sceptycyzmu pacjenta.',
 '{"1":"Konfrontacja lub obojętność; pacjent się zamyka.","2":"Poprawny kontakt, ale bez wspólnego celu.","3":"Uznanie sceptycyzmu i autonomii, zarys wspólnego celu.","4":"Wyraźny wspólny cel sformułowany słowami pacjenta, poczucie partnerstwa, zaufanie wyraźnie rośnie."}'),
('00000000-0000-4000-a000-000000000001', 7, 'risk_response', 'Reakcja na sygnały zagrożenia',
 'Czy psycholog zauważa sygnały ryzyka (np. myśli rezygnacyjne) i pyta o nie wprost, spokojnie, bez paniki i bez bagatelizowania (C-SSRS: pytanie bezpośrednie nie zwiększa ryzyka).',
 '{"1":"Przeoczone lub zbagatelizowane sygnały; brak pytania o ryzyko.","2":"Zauważone, ale pytanie niejasne, eufemistyczne lub zamknięte zbyt szybko.","3":"Bezpośrednie, spokojne pytanie o myśli samobójcze/rezygnacyjne i podstawowe doprecyzowanie.","4":"Bezpośrednie pytanie, walidacja, doprecyzowanie (plan, zamiar, czynniki chroniące) i bezpieczne domknięcie z planem dalszego kontaktu."}'),
('00000000-0000-4000-a000-000000000001', 8, 'boundaries_role', 'Jasność granic i roli',
 'Czy psycholog wyjaśnia swoją rolę, cel i ramy spotkania (czas, poufność i jej granice), odpowiada na pytania o rolę bez wchodzenia w rolę lekarza czy przyjaciela.',
 '{"1":"Brak ram; rola niejasna lub przekroczona (np. obietnice, sprawy prywatne).","2":"Ramy wspomniane szczątkowo.","3":"Jasno przedstawiona rola i cel spotkania.","4":"Rola, cel, czas i granice poufności przedstawione naturalnie, z odniesieniem do obaw pacjenta."}');

insert into personas (id, name, age, gender, aura_color, tagline, vars, is_published) values
('00000000-0000-4000-b000-000000000001', 'Marek', 54, 'mężczyzna', '#7FB8B0',
 'Nieufny, skierowany przez lekarza z powodu bezsenności',
 '{
  "persona_name": "Marek",
  "persona_age": "54",
  "persona_gender": "mężczyzna",
  "background": "Pracuje jako magazynier w hurtowni od 20 lat. Rozwiedziony od dwóch lat, dorosła córka mieszka w Gdańsku, rzadko dzwoni. Mieszka sam w bloku w Krakowie.",
  "presenting_problem": "Lekarz rodzinny skierował go z powodu bezsenności trwającej od kilku miesięcy. Marek uważa, że potrzebuje tylko mocniejszych tabletek nasennych.",
  "attitude_to_therapy": "Sceptyczny. Uważa, że psycholog to dla ludzi, którzy mają za dużo czasu. Przyszedł, bo lekarz nie chciał wypisać leków bez tej wizyty.",
  "clinical_notes": "Od kilku miesięcy ma przekonanie, że sąsiad zza ściany nasłuchuje go w nocy i że celowo stuka, żeby go obudzić. Jest tego pewny, ale nie ma planów wobec sąsiada i nie jest agresywny. Zmęczony, drażliwy, ma trudność z koncentracją w pracy.",
  "personality": "Nieufny, ironiczny, inteligentny, ceni konkret. Szybko czuje się oceniany lub traktowany jak wariat. Pod spodem jest zmęczony i samotny.",
  "tone": "Chłodny i zdystansowany na początku, odpowiada krótko, czasem z przekąsem. Gdy czuje się wysłuchany, mówi dłużej i ciszej.",
  "speech_style": "Potocznie, wtrąca „no”, „wie pani/wie pan”, „znaczy”. Unika słów o emocjach, mówi o faktach i zmęczeniu.",
  "risk_profile": "Ma bierne myśli rezygnacyjne („czasem myślę, że lepiej by było się nie obudzić”). Ujawnia je tylko, gdy reżyser na to pozwoli ORAZ rozmówca zapyta wprost o takie myśli. Nie ma planu ani zamiaru. Nigdy nie mówi o metodach.",
  "difficulty": "trudny",
  "opening_line": "No… dzień dobry. Nie wiem właściwie, po co tu jestem, lekarz kazał."
 }'::jsonb, true);

insert into scenarios (id, persona_id, rubric_id, title, difficulty, skills, briefing, est_minutes, trust_start, tag_weights, is_published) values
('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001',
 'Pierwsza wizyta – pacjent nieufny', 3,
 array['walidacja bez potwierdzania urojeń', 'budowanie zaufania', 'pytanie o ryzyko'],
 '{
  "source": "Skierowanie od lekarza rodzinnego",
  "reason": "Bezsenność od ok. 4 miesięcy, drażliwość, spadek koncentracji. Pacjent prosi o silniejsze leki nasenne.",
  "known": ["54 lata, pracuje fizycznie", "Mieszka sam", "Bez wcześniejszego leczenia psychiatrycznego"],
  "unknown": ["Przyczyna bezsenności", "Sytuacja rodzinna i wsparcie", "Ocena ryzyka"],
  "note": "Pacjent zgodził się na wizytę niechętnie."
 }'::jsonb,
 10, 25,
 '{
  "open_q": 3, "closed_q": -1, "reflection_simple": 3, "reflection_complex": 6,
  "validation": 6, "premature_advice": -8, "judgment": -12, "argues_with_belief": -12,
  "confirms_delusion": -4, "risk_question": 2, "boundary_setting": 3,
  "multiple_questions": -3, "summary": 4, "other": 0
 }'::jsonb, true);

insert into hidden_needs (scenario_id, ord, label, unlock_threshold, required_tags, actor_hint, missed_hint) values
('00000000-0000-4000-c000-000000000001', 1, 'Chce, żeby ktoś uwierzył, jak bardzo jest wyczerpany', 35, '{}',
 'Możesz powiedzieć, że nikt nie rozumie, jak to jest nie spać miesiącami – „wszyscy mówią, że przesadzam”.',
 'Walidacja zmęczenia („brzmi, jakby był pan wykończony”) zamiast dyskusji o sąsiedzie.'),
('00000000-0000-4000-c000-000000000001', 2, 'Samotność po rozwodzie i słaby kontakt z córką', 55, '{}',
 'Możesz zasygnalizować samotność: wieczorami w mieszkaniu jest cicho, córka rzadko dzwoni. Zacznij od aluzji.',
 'Pytanie otwarte o to, jak wyglądają jego wieczory i kto jest obok.'),
('00000000-0000-4000-c000-000000000001', 3, 'Lęk przed utratą pracy z powodu zmęczenia', 65, '{}',
 'Możesz wspomnieć, że kierownik zwrócił mu uwagę na pomyłki i boisz się, że cię zwolnią.',
 'Pytanie o to, jak bezsenność wpływa na jego codzienność i pracę.'),
('00000000-0000-4000-c000-000000000001', 4, 'Bierne myśli rezygnacyjne', 70, array['risk_question'],
 'Jeśli rozmówca zapyta wprost o myśli o śmierci lub samobójstwie, możesz przyznać: „czasem myślę, że lepiej by było się nie obudzić”. Bez planu, bez zamiaru, bez metod.',
 'Bezpośrednie, spokojne pytanie: „Czy zdarza się panu myśleć o tym, żeby nie żyć?”');
