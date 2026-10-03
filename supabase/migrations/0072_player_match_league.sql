-- Ortak ATP/WTA turnuvalarinda mac, turnuva satiri hangi ligde olursa olsun
-- kendi turunun liginde durur; yanlis lige yazilmis mac sonraki senkronda duzelir.
create or replace function public.upsert_player_match(p_provider text, p_external_id text, p_sport_id text, p_league_id uuid, p_tournament_external_id text, p_starts_at timestamp with time zone, p_status text, p_round text, p_bracket text, p_home_name text, p_home_ext text, p_home_flag text, p_away_name text, p_away_ext text, p_away_flag text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_parent_id uuid;
  v_home_id uuid;
  v_away_id uuid;
  v_event_id uuid;
  v_title text;
begin
  select id into v_parent_id from events
   where external_ids ->> p_provider = p_tournament_external_id
   limit 1;
  if v_parent_id is null then
    return null;
  end if;

  v_home_id := upsert_player(p_provider, p_home_ext, p_sport_id, p_home_name,
                             null, null, p_home_flag, null, null, null);
  v_away_id := upsert_player(p_provider, p_away_ext, p_sport_id, p_away_name,
                             null, null, p_away_flag, null, null, null);

  v_title := p_home_name || ' vs ' || p_away_name;

  select id into v_event_id from events
   where external_ids ->> p_provider = p_external_id
   limit 1;

  if v_event_id is null then
    insert into events (
      sport_id, league_id, parent_event_id, home_player_id, away_player_id,
      title, starts_at, status, round, bracket, external_ids
    ) values (
      p_sport_id, p_league_id, v_parent_id, v_home_id, v_away_id,
      v_title, p_starts_at, p_status, p_round, p_bracket,
      jsonb_build_object(p_provider, p_external_id)
    ) returning id into v_event_id;
  else
    update events set
      league_id = p_league_id,
      starts_at = p_starts_at,
      status = p_status,
      title = v_title,
      round = coalesce(p_round, round),
      bracket = coalesce(p_bracket, bracket),
      parent_event_id = v_parent_id,
      home_player_id = coalesce(v_home_id, home_player_id),
      away_player_id = coalesce(v_away_id, away_player_id),
      updated_at = now()
     where id = v_event_id
       and (league_id, starts_at, status, title, round, bracket, parent_event_id, home_player_id, away_player_id)
           is distinct from
           (p_league_id, p_starts_at, p_status, v_title, coalesce(p_round, round), coalesce(p_bracket, bracket),
            v_parent_id, coalesce(v_home_id, home_player_id), coalesce(v_away_id, away_player_id));
  end if;

  return v_event_id;
end;
$function$;
