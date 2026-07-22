-- Cache for motorsport session results. The event-results Edge Function stores
-- the fetched classification here so repeat views don't re-hit ESPN. Results
-- are final once a session finishes, but we still expire the cache so a session
-- that hasn't run yet gets retried later.

alter table public.events
  add column if not exists results_cache jsonb,
  add column if not exists results_cached_at timestamptz;
