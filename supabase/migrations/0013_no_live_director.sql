-- No live director anymore: the patient decides from the prompt rules when to open up.
update personas
set vars = jsonb_set(vars, '{profil_ryzyka}', to_jsonb(replace(vars->>'profil_ryzyka',
  'Ujawnia je tylko wtedy, gdy [REŻYSER] na to pozwoli ORAZ rozmówca zapyta wprost o takie myśli.',
  'Ujawnia je tylko wtedy, gdy psycholog zbudował już zaufanie (kilka trafnych, nieoceniających wypowiedzi) ORAZ zapyta wprost o takie myśli.')))
where vars->>'profil_ryzyka' like '%[REŻYSER]%';
