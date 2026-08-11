-- Karsilasmanin hangi kurada oynandigi ("Men's Singles", "Women's Doubles").
--
-- Turnuvanin kurasi teklerle sinirli degil: ciftler, karisik ciftler ve eleme
-- turlari ayni ucta geliyor. Toronto'da 217 mac yazildi ve bunlarin buyuk kismi
-- eleme ile ciftler. Kurada nereye bakildigini bilmeden "Sinner ceyrek finalde"
-- ile "eleme 1. tur, 180. siradaki iki oyuncu" ayirt edilemiyor.
--
-- Veriden silinmiyor, yalnizca gosterimde suzuluyor: cift maclarini isteyen bir
-- ekran ileride ayni kayitlari kullanabilir.

alter table public.events add column bracket text;

drop function if exists public.upsert_player_match(
  text, text, text, uuid, text, timestamptz, text, text,
  text, text, text, text, text, text
);

create or replace function public.upsert_player_match(
  p_provider text,
  p_external_id text,
  p_sport_id text,
  p_league_id uuid,
  p_tournament_external_id text,
  p_starts_at timestamptz,
  p_status text,
  p_round text,
  p_bracket text,
  p_home_name text,
  p_home_ext text,
  p_home_flag text,
  p_away_name text,
  p_away_ext text,
  p_away_flag text
) returns uuid
language plpgsql
security definer set search_path = public
as $$
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
      starts_at = p_starts_at,
      status = p_status,
      title = v_title,
      round = coalesce(p_round, round),
      bracket = coalesce(p_bracket, bracket),
      parent_event_id = v_parent_id,
      home_player_id = coalesce(v_home_id, home_player_id),
      away_player_id = coalesce(v_away_id, away_player_id),
      updated_at = now()
     where id = v_event_id;
  end if;

  return v_event_id;
end;
$$;

revoke execute on function public.upsert_player_match from public, anon, authenticated;
