-- The psychologist's name and gender: the patient addresses them correctly (Pan/Pani, vocative).
alter table profiles add column gender text check (gender in ('k', 'm'));
