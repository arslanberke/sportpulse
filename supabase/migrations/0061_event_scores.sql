-- Result fields are intentionally separate from `events.status`: the existing
-- status drives reminder cancellation/postponement and is constrained to
-- scheduled/postponed/cancelled. Team season history needs score + provider
-- match state without changing that established reminder contract.

alter table public.events
  add column if not exists home_score int,
  add column if not exists away_score int,
  add column if not exists result_status text;

comment on column public.events.result_status is
  'Provider match state for history/live display (notstarted/live/finished etc.); independent of reminder status.';
