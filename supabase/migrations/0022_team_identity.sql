-- One club, one row.
--
-- Each provider names clubs its own way ("Amed SFK" vs "Amed", "Beşiktaş" vs
-- "Besiktas"), so name matching alone kept minting duplicates, splitting a
-- club's fixtures and its followers across two rows.
--
-- Two changes fix it at the source:
--   * upsert_team now takes the whole id map a provider knows (TheSportsDB
--     also reports the club's ESPN id), and matches on ANY known id first.
--   * upsert_event folds accents when it falls back to name matching.
--
-- merge_teams() cleans up the rows that already exist.

drop function if exists public.upsert_team(text, text, text, uuid, text, text);

create function public.upsert_team(
  p_external_ids jsonb,
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
  v_key text;
begin
  -- Any id the provider knows is enough to recognise the club.
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
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (p_sport_id, p_league_id, p_name, p_logo_url, p_external_ids)
      returning id into v_team_id;
  else
    update teams set
      league_id = coalesce(league_id, p_league_id),
      logo_url = coalesce(p_logo_url, logo_url),
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

-- Move everything that points at a duplicate over to the surviving row.
create function public.merge_teams(p_keep uuid, p_drop uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ids jsonb;
  v_logo text;
  v_league uuid;
begin
  if p_keep = p_drop then
    return;
  end if;

  select external_ids, logo_url, league_id into v_ids, v_logo, v_league
    from teams where id = p_drop;

  -- Provider ids are uniquely indexed, so the loser has to let go of them
  -- before the survivor can take the ones it is missing.
  update teams set external_ids = '{}'::jsonb where id = p_drop;

  update teams set
    logo_url = coalesce(logo_url, v_logo),
    league_id = coalesce(league_id, v_league),
    external_ids = v_ids || external_ids
    where id = p_keep;

  update events set home_team_id = p_keep where home_team_id = p_drop;
  update events set away_team_id = p_keep where away_team_id = p_drop;

  insert into league_teams (league_id, team_id)
    select league_id, p_keep from league_teams where team_id = p_drop
    on conflict do nothing;
  delete from league_teams where team_id = p_drop;

  -- A user could follow both rows; keep one follow per user.
  delete from user_follows f
    where f.team_id = p_drop
      and exists (select 1 from user_follows k
                  where k.user_id = f.user_id and k.team_id = p_keep);
  update user_follows set team_id = p_keep where team_id = p_drop;

  delete from teams where id = p_drop;
end;
$$;

revoke execute on function public.merge_teams from public, anon, authenticated;

-- upsert_event: same accent-insensitive matching, so fixtures stop creating
-- second copies of clubs the team sync already knows.
create or replace function public.upsert_event(
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
    if p_home_team_ext is not null then
      select id into v_home_id from teams
        where external_ids ->> p_provider = p_home_team_ext;
    end if;
    if v_home_id is null then
      select id into v_home_id from teams
        where sport_id = p_sport_id
          and fold_team_name(name) = fold_team_name(p_home_team);
    end if;
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
    if p_away_team_ext is not null then
      select id into v_away_id from teams
        where external_ids ->> p_provider = p_away_team_ext;
    end if;
    if v_away_id is null then
      select id into v_away_id from teams
        where sport_id = p_sport_id
          and fold_team_name(name) = fold_team_name(p_away_team);
    end if;
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

-- Fold together the duplicates that are already in the table.
do $$
declare
  r record;
begin
  for r in
    select sport_id, fold_team_name(name) as folded,
           array_agg(id order by jsonb_array_length(
             coalesce(jsonb_path_query_array(external_ids, '$.keyvalue()'), '[]'::jsonb)) desc,
             logo_url nulls last) as ids
    from teams
    group by 1, 2
    having count(*) > 1
  loop
    for i in 2 .. array_length(r.ids, 1) loop
      perform merge_teams(r.ids[1], r.ids[i]);
    end loop;
  end loop;
end;
$$;
