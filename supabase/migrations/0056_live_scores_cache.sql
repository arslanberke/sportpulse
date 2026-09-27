-- Shared cache for the aggregated "which matches are live right now" feed
-- (single `fixtures?live=all` call, api-sports-live.ts / the live-scores
-- Edge Function). One row for the whole app: every user pressing "Canlı"
-- reads the same recent snapshot instead of each triggering their own
-- request, which would burn through the free-tier's 100/day quota in
-- minutes. The Edge Function refetches only when this row is older than its
-- own TTL.

create table if not exists public.live_scores_cache (
  id boolean primary key default true,
  payload jsonb not null,
  cached_at timestamptz not null,
  constraint live_scores_cache_singleton check (id)
);

alter table public.live_scores_cache enable row level security;

create policy "live_scores_cache_select_authenticated"
  on public.live_scores_cache for select
  to authenticated
  using (true);
