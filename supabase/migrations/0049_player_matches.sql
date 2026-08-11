-- Bireysel sporlarda tek tek karsilasmalar.
--
-- Tenis yalnizca turnuva duzeyinde tutuluyordu ("US Open"), yani kimin kiminle
-- oynadigi hic yoktu. Karsilasmalar da birer etkinlik: ayni kart, ayni hatirlatma
-- ve ayni yayin altyapisini kullaniyorlar, bu yuzden ayri bir tablo yerine
-- `events` genisletildi.
--
-- Iki yeni bag var:
--
--   home_player_id / away_player_id  -- karsilasan kisiler
--   parent_event_id                  -- macin bagli oldugu turnuva
--
-- Turnuva satiri korunuyor: ana ekran onu gosteriyor, kura ise turnuvanin
-- icinde. Cincinnati'de 163 mac var; hepsini listeye koymak takip edilen futbol
-- maclarini bogardi. Listeye yalnizca yildizlanan oyuncularin maclari cikiyor.

alter table public.events
  add column home_player_id uuid references public.players(id) on delete set null,
  add column away_player_id uuid references public.players(id) on delete set null,
  add column parent_event_id uuid references public.events(id) on delete cascade,
  -- "Quarterfinals" / "Qualifying 1st Round"; kurada nerede olundugunu gosterir.
  add column round text;

-- Turnuvanin kurasi ve "bu oyuncunun maclari" sorgulari.
create index events_parent_idx on public.events (parent_event_id)
  where parent_event_id is not null;
create index events_home_player_idx on public.events (home_player_id)
  where home_player_id is not null;
create index events_away_player_idx on public.events (away_player_id)
  where away_player_id is not null;

/**
 * Bir karsilasmayi ve taraflarini yazar.
 *
 * Oyuncular kaynagin `guid` degeriyle taniniyor; bulunamazsa adiyla, o da yoksa
 * yeni kayit acilir (siralamaya girmemis oyuncular boyle geliyor, siralari bos
 * kalir).
 *
 * Turnuva bulunamazsa mac yazilmaz: bagsiz bir karsilasma ana listeye dusup
 * turnuvasi bilinmeden gorunurdu.
 */
create or replace function public.upsert_player_match(
  p_provider text,
  p_external_id text,
  p_sport_id text,
  p_league_id uuid,
  p_tournament_external_id text,
  p_starts_at timestamptz,
  p_status text,
  p_round text,
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
      title, starts_at, status, round, external_ids
    ) values (
      p_sport_id, p_league_id, v_parent_id, v_home_id, v_away_id,
      v_title, p_starts_at, p_status, p_round,
      jsonb_build_object(p_provider, p_external_id)
    ) returning id into v_event_id;
  else
    update events set
      starts_at = p_starts_at,
      status = p_status,
      title = v_title,
      round = coalesce(p_round, round),
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
