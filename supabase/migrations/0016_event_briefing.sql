-- Cache for the AI event briefing. The event-briefing Edge Function stores the
-- generated summary here so we don't re-run the model (or re-hit the data
-- provider) on every view. TTL is enforced in the function.

alter table public.events
  add column if not exists briefing_cache text,
  add column if not exists briefing_cached_at timestamptz;
