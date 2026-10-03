-- Server-only key/value config (e.g. ElevenLabs agent id). No RLS policy → service role only.
create table app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;

-- Short coder note per therapist turn (shown in the report timeline).
alter table director_events add column note text;

-- hidden_needs.required_tags: tags that must be seen at/after unlock for the need to count
-- as "discovered" in the report (e.g. the risk need needs a direct risk question).
-- Unlocking for the actor depends on trust alone, so the patient is ready before the question.
comment on column hidden_needs.required_tags is 'Tags required (at/after unlock) to count the need as discovered';
