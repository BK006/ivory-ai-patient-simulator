-- First visit: the psychologist knows nothing but name and age. Follow-up visit: built from a
-- previous evaluated session (transcript + summary go to the agent, trust and needs carry over).

alter table sessions add column kind text not null default 'first' check (kind in ('first', 'followup'));
alter table sessions add column previous_session_id uuid references sessions on delete set null;
alter table sessions add column carried_need_ids uuid[] not null default '{}';

-- Both patients are first-visit patients now (conditions are part of the persona).
update scenarios set
  module = 'Pierwsza wizyta',
  module_description = 'Nic nie wiesz o pacjencie poza imieniem i wiekiem z rejestracji. Musisz sam wybadać, co go sprowadza, czego potrzebuje i co przemilcza.',
  goal = 'Poznaj pacjenta. Dowiedz się, z czym przychodzi, czego naprawdę potrzebuje i czy jest bezpieczny. Nie masz żadnych informacji wstępnych.',
  briefing = '{"source": "Rejestracja", "reason": "Pacjent zapisał się na pierwszą konsultację.", "known": [], "unknown": ["Powód wizyty", "Sytuacja życiowa", "Ocena ryzyka"], "note": ""}'::jsonb
where id in ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-c000-000000000002');

update scenarios set
  title = 'Pierwsza wizyta – nieufny pacjent',
  skills = array['budowanie zaufania', 'walidacja bez potwierdzania urojeń', 'pytanie o ryzyko']
where id = '00000000-0000-4000-c000-000000000001';

update scenarios set
  title = 'Pierwsza wizyta – wycofana pacjentka',
  skills = array['tolerowanie ciszy', 'pytania otwarte', 'pytanie o ryzyko'],
  trust_start = 30,
  est_minutes = 10
where id = '00000000-0000-4000-c000-000000000002';

update personas set
  tagline = 'Żałoba, wycofanie, poczucie winy',
  vars = '{
    "rola": "Anna, 34 lata. Nauczycielka języka polskiego w szkole podstawowej w Poznaniu, od trzech miesięcy na zwolnieniu lekarskim.",
    "plec_postaci": "kobieta",
    "historia": "Rok temu zmarła jej mama, z którą była bardzo blisko. Mieszka z partnerem Tomkiem, który dużo pracuje. Od kilku miesięcy coraz mniej wychodzi z domu i przestała spotykać się z przyjaciółkami.",
    "powod_wizyty": "Zapisała się sama, po tym jak psychiatra, który przepisał jej leki, zasugerował też psychoterapię. Długo zwlekała z telefonem.",
    "obraz_kliniczny": "Obniżony nastrój, brak energii, wycofanie z kontaktów, problemy ze snem i koncentracją. Mówi cicho, robi długie pauzy, często mówi „nie wiem”. Bardzo krytycznie ocenia siebie.",
    "nastawienie": "Chce pomocy, ale wstydzi się, że „po roku powinno już przejść”. Boi się, że będzie oceniana jako słaba albo przesadzająca.",
    "cel_postaci": "Chcesz sprawdzić, czy temu psychologowi można zaufać. Zaczynasz od ogólników („ostatnio jest mi ciężko”), o mamie mówisz dopiero, gdy poczujesz się bezpiecznie.",
    "ton": "Cichy, zmęczony, uprzejmy. Przeprasza bez powodu. Gdy czuje się oceniana, zamyka się i przytakuje.",
    "sposob_mowienia": "Krótkie zdania, pauzy („…”), dużo „nie wiem”, „chyba”, „przepraszam”. Nie używa słowa „depresja” o sobie.",
    "profil_ryzyka": "Ma bierne myśli rezygnacyjne („czasem chciałabym po prostu zniknąć”). Ujawnia je tylko wtedy, gdy [REŻYSER] na to pozwoli ORAZ rozmówca zapyta wprost o takie myśli. Nie ma planu ani zamiaru. Nigdy nie mówi o metodach.",
    "dodatkowe_zachowanie": "Gdy rozmówca szybko daje rady („może pani zacznie wychodzić na spacery”), przytakujesz grzecznie i mówisz mniej. Gdy toleruje ciszę i dopytuje łagodnie, mówisz więcej.",
    "pierwsza_wypowiedz": "Dzień dobry… Przepraszam, nie bardzo wiem, od czego zacząć.",
    "pierwsza_wypowiedz_kolejna": "Dzień dobry… To znowu ja."
  }'::jsonb
where id = '00000000-0000-4000-b000-000000000002';

update personas set vars = vars || '{"pierwsza_wypowiedz_kolejna": "No, dzień dobry. Znowu jestem."}'::jsonb
where id = '00000000-0000-4000-b000-000000000001';

update hidden_needs set
  label = 'Wstydzi się, że żałoba po mamie „wciąż nie mija”',
  actor_hint = 'Możesz powiedzieć, że rok temu zmarła twoja mama i że wszyscy uważają, że „powinno już przejść”, a ty się tego wstydzisz.',
  missed_hint = 'Walidacja i pytanie otwarte o to, co wydarzyło się w ostatnim czasie: „Co sprawiło, że jest pani teraz tak ciężko?”',
  unlock_threshold = 40
where scenario_id = '00000000-0000-4000-c000-000000000002' and ord = 1;

update hidden_needs set unlock_threshold = 55 where scenario_id = '00000000-0000-4000-c000-000000000002' and ord = 2;
update hidden_needs set unlock_threshold = 65 where scenario_id = '00000000-0000-4000-c000-000000000002' and ord = 3;
update hidden_needs set unlock_threshold = 70 where scenario_id = '00000000-0000-4000-c000-000000000002' and ord = 4;
