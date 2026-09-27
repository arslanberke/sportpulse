create table public.provider_issues (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  job text not null,
  league_id uuid not null references public.leagues(id),
  source text not null,
  kind text not null check (kind in ('http', 'request')),
  http_status integer check (http_status between 100 and 599),
  observed_at timestamptz not null default now(),
  unique (run_id, league_id, source, kind, http_status)
);

create index provider_issues_observed_idx on public.provider_issues (observed_at desc);

alter table public.provider_issues enable row level security;
revoke all on public.provider_issues from public, anon, authenticated;
grant select, insert on public.provider_issues to service_role;
grant usage, select on sequence public.provider_issues_id_seq to service_role;
