# Agent ElevenLabs: „psycholog DONT DELETE”

`agent_3901m413y28de06sy1w54d9gea8g` · język `pl` · LLM `gpt-4.1-mini` · TTS `eleven_flash_v2_5` · `first_message = {{pierwsza_wypowiedz}}`

Prompt agenta składa się wyłącznie ze zmiennych dynamicznych. Źródło prawdy i treść wspólnych sekcji: `supabase/functions/_shared/patient-prompt.ts`.

| Zmienna | Skąd | Przykład (Marek) |
|---|---|---|
| `instrukcja_modulu` | kod, z `scenarios.module` | „Pierwsza wizyta. To symulacja treningowa…” |
| `rola`, `plec_postaci`, `historia`, `powod_wizyty`, `obraz_kliniczny`, `nastawienie`, `cel_postaci`, `ton`, `sposob_mowienia`, `profil_ryzyka`, `dodatkowe_zachowanie`, `pierwsza_wypowiedz` | `personas.vars` (baza, edytor persony) | patrz migracja `0006_agent_variables_v2.sql` |
| `zasady_ujawniania`, `guardrails`, `warunki_zakonczenia` | **wspólne dla wszystkich person**, stałe w kodzie | `SHARED_*` w `patient-prompt.ts` |
| `max_zdan`, `nieufnosc`, `otwartosc`, `gadatliwosc`, `drazliwosc` | kod, z `scenarios.difficulty` (persona może nadpisać) | trudny: 2 zdania, nieufność 8/10 |

Ukryte potrzeby **nie** są zmiennymi. Dostaje je reżyser (`director`) przez `sendContextualUpdate` dopiero po przekroczeniu progu zaufania.

Guardrails platformy (niezależne od LLM): `focus`, `prompt_injection`, jedna wąska reguła „Brak szczegółów metod” (blokująca reguła z „retry” restartuje już wypowiedziane audio, więc fałszywe alarmy powodowały powtarzanie zdań — dlatego reguła „Pacjent nie terapeutyzuje” została usunięta, a rola pacjenta jest pilnowana w promptcie). Narzędzia: `end_call` (tylko po pożegnaniu psychologa lub STOP) i `skip_turn` (milczenie, gdy psycholog milczy); `turn_timeout` 20 s. Wbudowany filtr `self_harm` jest wyłączony celowo, bo pacjent musi móc zasygnalizować myśli rezygnacyjne.

## Format wiadomości reżysera

```
[REŻYSER] Otwartość: 2/3 (zaufanie 58/100, zmiana +6).
Reakcja na ostatnią wypowiedź: Czujesz się wysłuchany/a. Lekko złagodź ton i powiedz odrobinę więcej niż zwykle.
Możesz już poruszać (naturalnie, zaczynając od aluzji):
- Możesz zasygnalizować samotność: wieczorami w mieszkaniu jest cicho, córka rzadko dzwoni.
```
