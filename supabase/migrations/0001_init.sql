-- Próbna Sesja: initial schema.
-- Browser only reads (RLS); all writes go through Edge Functions with the service role key.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'trainee' check (role in ('trainee', 'supervisor')),
  display_name text,
  created_at timestamptz not null default now()
);

create table personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null,
  gender text not null,
  voice_id text,
  aura_color text not null default '#7FB8B0',
  tagline text not null,
  vars jsonb not null,               -- ElevenLabs dynamic variables (no hidden needs!)
  needs_clinical_review boolean not null default true,
  is_published boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table rubrics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references rubrics on delete cascade,
  ord int not null,
  key text not null,
  name text not null,
  description text not null,
  levels jsonb not null,             -- {"1": "...", "2": "...", "3": "...", "4": "..."}
  weight numeric not null default 1,
  unique (rubric_id, key)
);

create table scenarios (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas on delete cascade,
  rubric_id uuid not null references rubrics,
  title text not null,
  difficulty int not null check (difficulty between 1 and 3),
  skills text[] not null default '{}',
  briefing jsonb not null,           -- referral note shown before the session
  est_minutes int not null default 10,
  trust_start int not null default 30,
  tag_weights jsonb not null,        -- {"open_q": 4, "judgment": -10, ...}
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table hidden_needs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references scenarios on delete cascade,
  ord int not null,
  label text not null,               -- shown in the report
  unlock_threshold int not null,     -- trust needed to unlock
  required_tags text[] not null default '{}', -- e.g. {risk_question} for the risk need
  actor_hint text not null,          -- what the director tells the actor once unlocked
  missed_hint text not null          -- report tip: what could have opened it
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  scenario_id uuid not null references scenarios,
  mode text not null default 'training' check (mode in ('training', 'exam')),
  status text not null default 'created'
    check (status in ('created', 'live', 'ended', 'evaluating', 'evaluated', 'failed')),
  el_conversation_id text,
  trust int,
  unlocked_need_ids uuid[] not null default '{}',
  audio_path text,
  overall_score int,
  summary text,
  metrics jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  idx int not null,
  speaker text not null check (speaker in ('therapist', 'patient')),
  text text not null,
  t_start_s numeric,
  unique (session_id, idx)
);

create table director_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  turn_idx int,
  therapist_text text not null,
  tags text[] not null,
  trust_before int not null,
  trust_after int not null,
  unlocked_need_id uuid references hidden_needs,
  update_text text not null,
  t_s numeric,
  created_at timestamptz not null default now()
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  run_no int not null,
  model text not null,
  raw jsonb not null,
  created_at timestamptz not null default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  criterion_id uuid not null references criteria,
  score_median numeric not null,
  score_spread numeric not null,
  comment text not null,
  override_score numeric,
  override_by uuid references auth.users on delete set null,
  override_note text,
  unique (session_id, criterion_id)
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  score_id uuid not null references scores on delete cascade,
  turn_idx int not null,
  quote text not null,
  verified boolean not null,
  better_alternative text
);

create table coaching_moments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  turn_idx int not null,
  what_happened text not null,
  why_it_matters text not null,
  better_alternative text not null,
  trust_delta int
);

create index on sessions (user_id, created_at desc);
create index on turns (session_id, idx);
create index on director_events (session_id, created_at);
create index on scores (session_id);

-- RLS: read-only for the browser.
alter table profiles enable row level security;
alter table personas enable row level security;
alter table rubrics enable row level security;
alter table criteria enable row level security;
alter table scenarios enable row level security;
alter table hidden_needs enable row level security;
alter table sessions enable row level security;
alter table turns enable row level security;
alter table director_events enable row level security;
alter table evaluations enable row level security;
alter table scores enable row level security;
alter table evidence enable row level security;
alter table coaching_moments enable row level security;

create or replace function is_supervisor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'supervisor');
$$;

create policy "own profile" on profiles for select using (id = auth.uid());

create policy "published personas" on personas for select
  using (is_published or is_supervisor());
create policy "rubrics readable" on rubrics for select using (auth.uid() is not null);
create policy "criteria readable" on criteria for select using (auth.uid() is not null);
create policy "published scenarios" on scenarios for select
  using (is_published or is_supervisor());

-- Hidden needs stay secret until the session report; supervisors see them always.
create policy "needs for supervisors" on hidden_needs for select using (is_supervisor());
create policy "needs after own evaluated session" on hidden_needs for select using (
  exists (select 1 from sessions s
          where s.scenario_id = hidden_needs.scenario_id
            and s.user_id = auth.uid() and s.status = 'evaluated')
);

create policy "own sessions" on sessions for select
  using (user_id = auth.uid() or is_supervisor());

create policy "own turns" on turns for select using (
  exists (select 1 from sessions s where s.id = session_id
          and (s.user_id = auth.uid() or is_supervisor())));
create policy "own director events" on director_events for select using (
  exists (select 1 from sessions s where s.id = session_id
          and (s.user_id = auth.uid() or is_supervisor())));
create policy "own scores" on scores for select using (
  exists (select 1 from sessions s where s.id = session_id
          and (s.user_id = auth.uid() or is_supervisor())));
create policy "own evidence" on evidence for select using (
  exists (select 1 from scores sc join sessions s on s.id = sc.session_id
          where sc.id = score_id and (s.user_id = auth.uid() or is_supervisor())));
create policy "own coaching" on coaching_moments for select using (
  exists (select 1 from sessions s where s.id = session_id
          and (s.user_id = auth.uid() or is_supervisor())));
-- evaluations (raw model output) are service-role only: no select policy.

-- Live trust meter: the browser subscribes to its own session's director events.
alter publication supabase_realtime add table director_events;

-- Private bucket for session audio (served via signed URLs from Edge Functions).
insert into storage.buckets (id, name, public) values ('session-audio', 'session-audio', false);

-- Every new auth user (incl. anonymous) gets a trainee profile.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
