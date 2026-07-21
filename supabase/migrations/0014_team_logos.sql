-- Transparent team badges. The sync job now passes each team's provider id
-- and badge URL (PNG with alpha) so the app can render "home vs away" crests
-- over the hero banner instead of the cropped collage thumbnail.
--
-- upsert_event gains four optional params; when a badge/id is supplied it is
-- stored on the resolved team (logo_url + external_ids.<provider>), refreshing
-- existing rows in place.

drop function public.upsert_event;

create function public.upsert_event(
  p_provider text,
  p_external_id text,
  p_sport_id text,
  p_league_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_status text,
  p_image_url text,
  p_home_team text,
  p_away_team text,
  p_venue text default null,
  p_venue_image_url text default null,
  p_home_team_ext text default null,
  p_away_team_ext text default null,
  p_home_logo text default null,
  p_away_logo text default null
) returns table (event_id uuid, change_type text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_home_id uuid;
  v_away_id uuid;
  v_event_id uuid;
  v_old_starts_at timestamptz;
  v_old_status text;
  v_change text;
begin
  if p_home_team is not null then
    select id into v_home_id from teams
      where sport_id = p_sport_id and name = p_home_team;
    if v_home_id is null then
      insert into teams (sport_id, league_id, name, logo_url, external_ids)
        values (
          p_sport_id, p_league_id, p_home_team, p_home_logo,
          case when p_home_team_ext is null then '{}'::jsonb
               else jsonb_build_object(p_provider, p_home_team_ext) end
        )
        returning id into v_home_id;
    else
      update teams set
        logo_url = coalesce(p_home_logo, logo_url),
        external_ids = case when p_home_team_ext is null then external_ids
                            else external_ids || jsonb_build_object(p_provider, p_home_team_ext) end
        where id = v_home_id;
    end if;
  end if;

  if p_away_team is not null then
    select id into v_away_id from teams
      where sport_id = p_sport_id and name = p_away_team;
    if v_away_id is null then
      insert into teams (sport_id, league_id, name, logo_url, external_ids)
        values (
          p_sport_id, p_league_id, p_away_team, p_away_logo,
          case when p_away_team_ext is null then '{}'::jsonb
               else jsonb_build_object(p_provider, p_away_team_ext) end
        )
        returning id into v_away_id;
    else
      update teams set
        logo_url = coalesce(p_away_logo, logo_url),
        external_ids = case when p_away_team_ext is null then external_ids
                            else external_ids || jsonb_build_object(p_provider, p_away_team_ext) end
        where id = v_away_id;
    end if;
  end if;

  select id, starts_at, status into v_event_id, v_old_starts_at, v_old_status
    from events
    where external_ids ->> p_provider = p_external_id;

  if v_event_id is null then
    insert into events (
      sport_id, league_id, home_team_id, away_team_id,
      title, starts_at, status, image_url, venue, venue_image_url, external_ids
    ) values (
      p_sport_id, p_league_id, v_home_id, v_away_id,
      p_title, p_starts_at, p_status, p_image_url, p_venue, p_venue_image_url,
      jsonb_build_object(p_provider, p_external_id)
    ) returning id into v_event_id;
  else
    if v_old_status is distinct from p_status then
      v_change := 'status';
    elsif v_old_starts_at is distinct from p_starts_at then
      v_change := 'time';
    end if;

    update events set
      starts_at = p_starts_at,
      status = p_status,
      title = p_title,
      image_url = coalesce(p_image_url, image_url),
      venue = coalesce(p_venue, venue),
      venue_image_url = coalesce(p_venue_image_url, venue_image_url),
      home_team_id = coalesce(v_home_id, home_team_id),
      away_team_id = coalesce(v_away_id, away_team_id),
      updated_at = now()
    where id = v_event_id;
  end if;

  return query select v_event_id, v_change;
end;
$$;

revoke execute on function public.upsert_event from public, anon, authenticated;
