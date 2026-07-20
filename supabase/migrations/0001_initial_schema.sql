-- SportPulse initial schema.
-- Sports event reminders: catalog tables (sports, leagues,
-- teams, channels, events) are world-readable and written only by the
-- service role (Edge Function sync job). User tables are RLS-protected.
-- All timestamps are stored in UTC (timestamptz).

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  country_code text not null default 'TR',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Create a profile automatically when a user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalog: sports, leagues, teams, channels
-- ---------------------------------------------------------------------------

create table public.sports (
  id text primary key, -- stable slug: 'football', 'f1', ...
  name_en text not null,
  name_tr text not null,
  icon text not null default 'trophy',
  sort_order int not null default 0
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sports (id),
  name text not null,
  country_code text, -- null = international
  logo_url text,
  external_ids jsonb not null default '{}'::jsonb
);

create unique index leagues_thesportsdb_idx
  on public.leagues ((external_ids ->> 'thesportsdb'))
  where external_ids ? 'thesportsdb';

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sports (id),
  league_id uuid references public.leagues (id),
  name text not null,
  logo_url text,
  external_ids jsonb not null default '{}'::jsonb
);

create unique index teams_thesportsdb_idx
  on public.teams ((external_ids ->> 'thesportsdb'))
  where external_ids ? 'thesportsdb';

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null,
  logo_url text,
  unique (name, country_code)
);

-- Static league -> channel mapping per country. Free fixture APIs have poor
-- broadcaster data outside the US, so we maintain this mapping ourselves and
-- use it as the default source of channel info for every event of a league.
create table public.league_channels (
  league_id uuid not null references public.leagues (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  country_code text not null,
  primary key (league_id, channel_id, country_code)
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sports (id),
  league_id uuid references public.leagues (id),
  home_team_id uuid references public.teams (id),
  away_team_id uuid references public.teams (id),
  title text not null,
  starts_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'postponed', 'cancelled')),
  image_url text,
  importance int not null default 0,
  external_ids jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);
create unique index events_thesportsdb_idx
  on public.events ((external_ids ->> 'thesportsdb'))
  where external_ids ? 'thesportsdb';
create unique index events_espn_idx
  on public.events ((external_ids ->> 'espn'))
  where external_ids ? 'espn';

-- Event-specific broadcast overrides (e.g. from a provider that does return
-- real per-event broadcaster data). Takes precedence over league_channels.
create table public.event_broadcasts (
  event_id uuid not null references public.events (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  country_code text not null,
  primary key (event_id, channel_id, country_code)
);

-- Catalog tables: anyone signed in can read; only service role writes.
alter table public.sports enable row level security;
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.channels enable row level security;
alter table public.league_channels enable row level security;
alter table public.events enable row level security;
alter table public.event_broadcasts enable row level security;

create policy "Catalog is readable" on public.sports for select using (true);
create policy "Catalog is readable" on public.leagues for select using (true);
create policy "Catalog is readable" on public.teams for select using (true);
create policy "Catalog is readable" on public.channels for select using (true);
create policy "Catalog is readable" on public.league_channels for select using (true);
create policy "Catalog is readable" on public.events for select using (true);
create policy "Catalog is readable" on public.event_broadcasts for select using (true);

-- ---------------------------------------------------------------------------
-- User follows & reminder preferences
-- ---------------------------------------------------------------------------

create table public.user_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('sport', 'league', 'team')),
  sport_id text references public.sports (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (kind = 'sport' and sport_id is not null and league_id is null and team_id is null) or
    (kind = 'league' and league_id is not null and sport_id is null and team_id is null) or
    (kind = 'team' and team_id is not null and sport_id is null and league_id is null)
  )
);

create unique index user_follows_unique_idx
  on public.user_follows (user_id, kind, coalesce(sport_id, ''), coalesce(league_id::text, ''), coalesce(team_id::text, ''));

alter table public.user_follows enable row level security;
create policy "Users manage own follows"
  on public.user_follows for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per user: reminder offsets (minutes before the event) and an
-- optional quiet-hours window (local time) during which reminders are
-- shifted to the end of the window instead of firing.
create table public.user_reminder_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  offsets_minutes int[] not null default '{60}',
  quiet_start time,
  quiet_end time,
  updated_at timestamptz not null default now()
);

alter table public.user_reminder_prefs enable row level security;
create policy "Users manage own reminder prefs"
  on public.user_reminder_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notifications & push tokens
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null default '',
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "Users read own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.push_tokens enable row level security;
create policy "Users manage own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: clients react live to fixture changes (postponements, new times)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.notifications;
