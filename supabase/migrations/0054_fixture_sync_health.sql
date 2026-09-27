create table public.fixture_sync_health (
  league_id uuid primary key references public.leagues(id),
  run_id uuid not null,
  status text not null check (status in ('running', 'ok', 'empty', 'limited', 'degraded', 'failed')),
  last_attempt_at timestamptz not null,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  window_start timestamptz,
  window_end timestamptz,
  source text,
  received_count integer not null default 0 check (received_count >= 0),
  written_count integer not null default 0 check (written_count >= 0),
  issue_count integer not null default 0 check (issue_count >= 0)
);

alter table public.fixture_sync_health enable row level security;
revoke all on public.fixture_sync_health from public, anon, authenticated;
grant select on public.fixture_sync_health to authenticated;
grant select, insert, update on public.fixture_sync_health to service_role;
create policy "authenticated read fixture health" on public.fixture_sync_health
  for select to authenticated using (true);

create or replace function public.begin_fixture_sync(p_league_id uuid, p_run_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  acquired boolean := false;
begin
  insert into public.fixture_sync_health (league_id, run_id, status, last_attempt_at)
  values (p_league_id, p_run_id, 'running', now())
  on conflict (league_id) do update
    set run_id = excluded.run_id, status = 'running', last_attempt_at = now()
    where fixture_sync_health.status <> 'running'
       or fixture_sync_health.last_attempt_at < now() - interval '3 minutes'
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;

revoke execute on function public.begin_fixture_sync(uuid, uuid) from public, anon, authenticated;
grant execute on function public.begin_fixture_sync(uuid, uuid) to service_role;
