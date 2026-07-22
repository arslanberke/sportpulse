-- Short-lived cache for confirmed lineups. The event-lineup Edge Function
-- stores the last successful provider response here so repeat views of the
-- same match don't re-hit the third-party API (protects the free-tier quota).
-- The function treats entries older than a few minutes as stale and refetches,
-- since official lineups change until kickoff.

alter table public.events
  add column if not exists lineup_cache jsonb,
  add column if not exists lineup_cached_at timestamptz;
