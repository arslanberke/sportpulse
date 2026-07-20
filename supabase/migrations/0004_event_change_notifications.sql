-- Fixture-change notifications.
--
-- upsert_event now reports what changed (time / status) so the sync job can
-- notify followers. event_followers resolves which users follow an event
-- (via its sport, league or either team). notify_event_change fans out rows
-- into `notifications`; the Edge Function sends the matching Expo push.

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
  p_away_team text
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

  select id, starts_at, status into v_event_id, v_old_starts_at, v_old_status
    from events
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
      home_team_id = coalesce(v_home_id, home_team_id),
      away_team_id = coalesce(v_away_id, away_team_id),
      updated_at = now()
    where id = v_event_id;
  end if;

  return query select v_event_id, v_change;
end;
$$;

revoke execute on function public.upsert_event from public, anon, authenticated;

-- Users following an event through its sport, league or either team.
create function public.event_followers(p_event_id uuid)
returns setof uuid
language sql
security definer set search_path = public
stable
as $$
  select distinct f.user_id
  from events e
  join user_follows f on (
    (f.kind = 'sport' and f.sport_id = e.sport_id)
    or (f.kind = 'league' and f.league_id = e.league_id)
    or (f.kind = 'team' and f.team_id in (e.home_team_id, e.away_team_id))
  )
  where e.id = p_event_id;
$$;

revoke execute on function public.event_followers from public, anon, authenticated;

-- Fan out an in-app notification row to every follower of the event.
-- Title/body text is rendered client-side from `data` (late-binding i18n).
create function public.notify_event_change(p_event_id uuid, p_change_type text)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  insert into notifications (user_id, type, data)
  select
    follower,
    'event_' || p_change_type || '_changed',
    jsonb_build_object(
      'eventId', e.id,
      'title', e.title,
      'startsAt', e.starts_at,
      'status', e.status,
      'changeType', p_change_type
    )
  from public.event_followers(p_event_id) follower
  cross join events e
  where e.id = p_event_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.notify_event_change from public, anon, authenticated;
