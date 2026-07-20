-- Atomic upsert used by the sync-events Edge Function: resolves/creates the
-- teams by name, then inserts or updates the event keyed on the provider's
-- external id. Postponements and new kick-off times UPDATE the row, so
-- Supabase Realtime notifies clients to reschedule local reminders.

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
  p_away_team text
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_home_id uuid;
  v_away_id uuid;
  v_event_id uuid;
begin
  if p_home_team is not null then
    select id into v_home_id from teams
      where sport_id = p_sport_id and name = p_home_team;
    if v_home_id is null then
      insert into teams (sport_id, league_id, name)
        values (p_sport_id, p_league_id, p_home_team)
        returning id into v_home_id;
    end if;
  end if;

  if p_away_team is not null then
    select id into v_away_id from teams
      where sport_id = p_sport_id and name = p_away_team;
    if v_away_id is null then
      insert into teams (sport_id, league_id, name)
        values (p_sport_id, p_league_id, p_away_team)
        returning id into v_away_id;
    end if;
  end if;

  select id into v_event_id from events
    where external_ids ->> p_provider = p_external_id;

  if v_event_id is null then
    insert into events (
      sport_id, league_id, home_team_id, away_team_id,
      title, starts_at, status, image_url, external_ids
    ) values (
      p_sport_id, p_league_id, v_home_id, v_away_id,
      p_title, p_starts_at, p_status, p_image_url,
      jsonb_build_object(p_provider, p_external_id)
    ) returning id into v_event_id;
  else
    update events set
      starts_at = p_starts_at,
      status = p_status,
      title = p_title,
      image_url = coalesce(p_image_url, image_url),
      home_team_id = coalesce(v_home_id, home_team_id),
      away_team_id = coalesce(v_away_id, away_team_id),
      updated_at = now()
    where id = v_event_id;
  end if;

  return v_event_id;
end;
$$;

revoke execute on function public.upsert_event from public, anon, authenticated;
