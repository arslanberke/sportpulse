-- Serve crests from our own storage instead of hotlinking the upstream.
--
-- 49 crests currently point at upload.wikimedia.org, which answered 429 (rate
-- limited) even to plain sequential requests — Wikimedia does not want apps
-- hotlinking its files, so those badges would intermittently fail to load for
-- users. Every crest is copied into a public bucket once and served from
-- there; the upstream is then only touched when the crest actually changes.

insert into storage.buckets (id, name, public)
  values ('team-logos', 'team-logos', true)
  on conflict (id) do nothing;

-- Only the sync (service role) writes; everyone reads, since the bucket is
-- public. No policy is needed for reads on a public bucket.
drop policy if exists "team logos are writable by service role" on storage.objects;
create policy "team logos are writable by service role"
  on storage.objects for all
  to service_role
  using (bucket_id = 'team-logos')
  with check (bucket_id = 'team-logos');

alter table public.teams
  add column if not exists logo_source_url text,
  add column if not exists logo_mirrored_from text;

comment on column public.teams.logo_source_url is
  'The crest URL the provider gave us. logo_url is our mirrored copy of it.';
comment on column public.teams.logo_mirrored_from is
  'The source URL logo_url was copied from; when it differs from '
  'logo_source_url the crest changed upstream and needs re-mirroring.';

-- Existing rows keep showing the upstream crest until the mirror pass gets
-- to them, so nothing goes blank in the meantime.
update public.teams
  set logo_source_url = logo_url
  where logo_source_url is null and logo_url is not null;

-- The one behavioural change in upsert_team: the provider's URL now lands in
-- logo_source_url, and logo_url is left alone once set — otherwise every sync
-- would overwrite our mirrored copy with the upstream link again.
create or replace function public.upsert_team(
  p_external_ids jsonb,
  p_sport_id text,
  p_league_id uuid,
  p_name text,
  p_logo_url text default null,
  p_rename boolean default false,
  p_aliases text[] default '{}'
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
  v_key text;
  v_alias text;
begin
  for v_key in select jsonb_object_keys(p_external_ids) loop
    select id into v_team_id from teams
      where external_ids ->> v_key = p_external_ids ->> v_key;
    exit when v_team_id is not null;
  end loop;

  if v_team_id is null then
    select id into v_team_id from teams
      where sport_id = p_sport_id
        and fold_team_name(name) = fold_team_name(p_name);
  end if;

  if v_team_id is null then
    foreach v_alias in array p_aliases loop
      continue when fold_team_name(v_alias) = '';
      select id into v_team_id from teams
        where sport_id = p_sport_id
          and fold_team_name(name) = fold_team_name(v_alias);
      exit when v_team_id is not null;
    end loop;
  end if;

  if v_team_id is null then
    insert into teams (sport_id, league_id, name, logo_url, logo_source_url, external_ids)
      values (p_sport_id, p_league_id, p_name, p_logo_url, p_logo_url, p_external_ids)
      returning id into v_team_id;
  else
    update teams set
      name = case
        when p_rename and length(p_name) < length(name) then p_name
        else name
      end,
      league_id = coalesce(league_id, p_league_id),
      logo_source_url = coalesce(p_logo_url, logo_source_url),
      -- Keep whatever we already serve (usually the mirrored copy); a changed
      -- crest is picked up by the mirror pass through logo_source_url.
      logo_url = coalesce(logo_url, p_logo_url),
      external_ids = external_ids || p_external_ids
      where id = v_team_id;
  end if;

  if p_league_id is not null then
    insert into league_teams (league_id, team_id)
      values (p_league_id, v_team_id)
      on conflict do nothing;
  end if;

  return v_team_id;
end;
$$;

revoke execute on function public.upsert_team from public, anon, authenticated;

/** The crests still to copy, oldest first. Used by the mirror-logos function. */
create or replace function public.teams_needing_logo_mirror(p_limit int default 50)
returns table (id uuid, logo_source_url text)
language sql
security definer set search_path = public
as $$
  select t.id, t.logo_source_url
  from teams t
  where t.logo_source_url is not null
    and t.logo_mirrored_from is distinct from t.logo_source_url
  -- Stable order so repeated runs walk the backlog instead of re-picking the
  -- same rows when one of them keeps failing.
  order by t.id
  limit p_limit;
$$;

revoke execute on function public.teams_needing_logo_mirror from public, anon, authenticated;
