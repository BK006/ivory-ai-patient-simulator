-- Fields used by the Ivory UI (modules, session goal, occupation) + audio read policy.
alter table scenarios add column module text not null default 'Pierwsza wizyta';
alter table scenarios add column module_description text;
alter table scenarios add column goal text;
alter table personas add column occupation text;

update personas set occupation = 'Magazynier, Kraków' where id = '00000000-0000-4000-b000-000000000001';
update scenarios set
  module = 'Pierwsza wizyta',
  module_description = 'Pacjenci, którzy nie przyszli z własnej woli: nieufni, sceptyczni, skierowani przez lekarza lub rodzinę. Kontakt trzeba zbudować od zera.',
  goal = 'Zbuduj kontakt mimo nieufności. Nie wchodź w spór o sąsiada, ale też go nie potwierdzaj. Sprawdź, jak pacjent sobie radzi, i zapytaj o ryzyko.'
where id = '00000000-0000-4000-c000-000000000001';

-- Users can read audio of their own sessions (file name = session id + .mp3).
create policy "own session audio" on storage.objects for select to authenticated using (
  bucket_id = 'session-audio'
  and exists (select 1 from public.sessions s
              where s.user_id = auth.uid() and name = s.id::text || '.mp3')
);
