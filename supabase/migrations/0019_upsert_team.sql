-- Season squads.
--
-- Until now a team only appeared in the catalog as a side effect of syncing a
-- fixture, so a league between seasons (or one whose next match is further out
-- than the sync window) showed an empty team list — even though the clubs
-- taking part are known well before the fixture list is published.
--
-- sync-teams pulls a league's member clubs straight from the provider and
-- calls this to fill the catalog. Matching is by provider id first, then by
-- name within the sport, so rows already created by upsert_event are enriched
-- rather than duplicated.

create function public.upsert_team(
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
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (
        p_sport_id, p_league_id, p_name, p_logo_url,
        case when p_external_id is null then '{}'::jsonb
             else jsonb_build_object(p_provider, p_external_id) end
      )
      returning id into v_team_id;
  else
    update teams set
      -- The league is only filled in, never moved: a team can play in more
      -- than one competition and the first one found stays its home.
      league_id = coalesce(league_id, p_league_id),
      logo_url = coalesce(p_logo_url, logo_url),
      external_ids = case when p_external_id is null then external_ids
                          else external_ids || jsonb_build_object(p_provider, p_external_id) end
      where id = v_team_id;
  end if;

  return v_team_id;
end;
$$;

revoke execute on function public.upsert_team from public, anon, authenticated;
