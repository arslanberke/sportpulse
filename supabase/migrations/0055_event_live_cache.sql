-- Short-lived cache for the on-demand match-centre score/events timeline,
-- mirroring lineup_cache (migration 0015). The event-live Edge Function
-- writes the last successful API-Sports response here so switching tabs or
-- reopening the same match doesn't re-hit the free-tier quota. Cache
-- lifetime while the match is live is enforced in the function, not here:
-- a finished match's cache is treated as permanent (the result won't change).

alter table public.events
  add column if not exists live_cache jsonb,
  add column if not exists live_cached_at timestamptz;
