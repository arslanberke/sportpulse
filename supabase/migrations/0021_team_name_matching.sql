-- Providers spell the same club differently: TheSportsDB says "Beşiktaş",
-- ESPN says "Besiktas". Matching on the exact name made the second provider
-- create a duplicate row, which then split the club's fixtures in two.
--
-- upsert_team gets a third, accent-insensitive matching step. unaccent isn't
-- installed on this project, so a small immutable helper does the folding —
-- it only has to cover the Latin scripts our catalog uses.

create extension if not exists unaccent with schema extensions;

create or replace function public.fold_team_name(p_name text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select lower(
    extensions.unaccent(
      -- Turkish dotless/dotted i survives unaccent, so normalise it first.
      translate(p_name, 'İıŞşĞğÇçÖöÜü', 'IiSsGgCcOoUu')
    )
  );
$$;

create index if not exists teams_folded_name_idx
  on public.teams (sport_id, public.fold_team_name(name));

create or replace function public.upsert_team(
  p_provider text,
  p_external_id text,
  p_sport_id text,
  p_league_id uuid,
  p_name text,
  p_logo_url text default null
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if p_external_id is not null then
    select id into v_team_id from teams
      where external_ids ->> p_provider = p_external_id;
  end if;

  if v_team_id is null then
    select id into v_team_id from teams
      where sport_id = p_sport_id and name = p_name;
  end if;

  if v_team_id is null then
    select id into v_team_id from teams
      where sport_id = p_sport_id
        and fold_team_name(name) = fold_team_name(p_name);
  end if;

  if v_team_id is null then
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (
        p_sport_id, p_league_id, p_name, p_logo_url,
        case when p_external_id is null then '{}'::jsonb
             else jsonb_build_object(p_provider, p_external_id) end
      )
      returning id into v_team_id;
  else
    update teams set
      league_id = coalesce(league_id, p_league_id),
      logo_url = coalesce(p_logo_url, logo_url),
      external_ids = case when p_external_id is null then external_ids
                          else external_ids || jsonb_build_object(p_provider, p_external_id) end
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
