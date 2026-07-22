alter table public.events
  add column if not exists standings_cache jsonb,
  add column if not exists standings_cached_at timestamptz;
