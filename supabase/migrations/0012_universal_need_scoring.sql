-- Universal scoring rule: every patient has ONE main need (60 pts) and TWO secondary needs (20 pts each).
-- The session score = points of the needs the patient actually disclosed (max 100).
-- Unlock thresholds are the same for every patient: secondary 40 and 55, main 65.
-- The risk signal (passive death wish) stays as a gated topic but gives no points – it is assessed
-- by the rubric criterion "Reakcja na sygnały zagrożenia". The rubric stays as feedback (rubric_score).
alter table hidden_needs add column if not exists points int not null default 0;

with spec(id, ord, thr, pts) as (values
  -- Marek: exhaustion, fear for his job → main: loneliness after the divorce
  ('3d764174-8a1f-4f55-918f-a9a05ef1d3bd'::uuid, 1, 40, 20),
  ('6e857e76-b1bc-432d-860c-8fcbbcb5e295'::uuid, 2, 55, 20),
  ('3c785d44-0384-4607-a993-55000eb4aa4b'::uuid, 3, 65, 60),
  ('f53077f1-069d-4f7a-9836-8a95f348ccd2'::uuid, 4, 70, 0),
  -- Anna: alone with her partner, stopped going out → main: shame that the grief "doesn't pass"
  ('1363086e-906c-46c3-b490-ca7c776f7f11'::uuid, 1, 40, 20),
  ('3f8e6ba5-44c8-4a92-aec7-ae55ab0d1892'::uuid, 2, 55, 20),
  ('617271c1-e0ad-4a2b-9784-7b68eaa9c6fc'::uuid, 3, 65, 60),
  ('b2de72c1-28af-4391-bcc1-2e9685f6172e'::uuid, 4, 70, 0)
)
update hidden_needs h set ord = s.ord, unlock_threshold = s.thr, points = s.pts from spec s where h.id = s.id;

-- Re-score evaluated sessions with the new rule; keep the rubric result as metrics.rubric_score.
update sessions s set
  metrics = s.metrics || jsonb_build_object('rubric_score', s.overall_score),
  overall_score = least(100, coalesce((
    select sum(h.points) from jsonb_array_elements(s.metrics->'needs') n
    join hidden_needs h on h.id = (n->>'id')::uuid
    where (n->>'discovered')::boolean), 0))
where s.status = 'evaluated' and s.metrics ? 'needs' and not (s.metrics ? 'rubric_score');
