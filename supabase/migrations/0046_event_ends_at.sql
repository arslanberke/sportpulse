-- Etkinligin bitis zamani.
--
-- Liste yalnizca baslangici gelecekte olan etkinlikleri gosteriyordu. Bir futbol
-- macinda sorun degil, ama cok gunlu etkinlikler baslar baslamaz listeden
-- dusuyordu: Cincinnati Open sabah basladi ve turnuva bir hafta surecekken
-- ogleden sonra artik gorunmuyordu. Ayni sey yaris hafta sonlari ve US Open
-- gibi iki haftalik turnuvalar icin de geciyor.
--
-- Kaynak turnuvanin bitisini veriyor (ESPN `endDate`). Bilinmeyen durumda kolon
-- bos kalir ve davranis eskisi gibi olur: yalnizca baslangica bakilir.

alter table public.events add column ends_at timestamptz;

comment on column public.events.ends_at is
  'Cok gunlu etkinliklerin bitisi (turnuva, yaris hafta sonu). Bos ise yalnizca baslangica bakilir.';

-- Suzme "devam edenler de gorunsun" seklinde yapildigi icin bitis sorgulanabilir
-- olmali.
create index events_ends_at_idx on public.events (ends_at)
  where ends_at is not null;

-- Bitis zamani upsert'e ekleniyor. Kolon listesine yeni bir parametre
-- eklendiginde eski imza geride kalir ve cagrilar belirsizlesir, bu yuzden
-- once dusuruluyor.
drop function if exists public.upsert_event(
  text, text, text, uuid, text, timestamptz, text, text, text, text, text, text,
  text, text, text, text
);

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
  p_away_logo text default null,
  p_ends_at timestamptz default null
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
        case when p_home_team_ext is not null
          then jsonb_build_object(p_provider, p_home_team_ext)
          else '{}'::jsonb end
      ) returning id into v_home_id;
    else
      update teams set
        logo_url = coalesce(logo_url, p_home_logo),
        external_ids = case when p_home_team_ext is not null
          then external_ids || jsonb_build_object(p_provider, p_home_team_ext)
          else external_ids end
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
        case when p_away_team_ext is not null
          then jsonb_build_object(p_provider, p_away_team_ext)
          else '{}'::jsonb end
      ) returning id into v_away_id;
    else
      update teams set
        logo_url = coalesce(logo_url, p_away_logo),
        external_ids = case when p_away_team_ext is not null
          then external_ids || jsonb_build_object(p_provider, p_away_team_ext)
          else external_ids end
        where id = v_away_id;
    end if;
  end if;

  select id, starts_at, status into v_event_id, v_old_starts_at, v_old_status
    from events
    where external_ids ->> p_provider = p_external_id;

  -- Bu kaynak maci ilk kez goruyor: baska bir kaynaktan gelmis ayni mac var mi.
  if v_event_id is null and v_home_id is not null and v_away_id is not null then
    select id, starts_at, status into v_event_id, v_old_starts_at, v_old_status
      from events
      where sport_id = p_sport_id
        and home_team_id = v_home_id
        and away_team_id = v_away_id
        and starts_at >= p_starts_at - interval '12 hours'
        and starts_at <= p_starts_at + interval '12 hours'
      limit 1;

    if v_event_id is not null then
      update events
         set external_ids = external_ids || jsonb_build_object(p_provider, p_external_id)
       where id = v_event_id;
    end if;
  end if;

  if v_event_id is null then
    insert into events (
      sport_id, league_id, home_team_id, away_team_id,
      title, starts_at, ends_at, status, image_url, venue, venue_image_url, external_ids
    ) values (
      p_sport_id, p_league_id, v_home_id, v_away_id,
      p_title, p_starts_at, p_ends_at, p_status, p_image_url, p_venue, p_venue_image_url,
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
      ends_at = coalesce(p_ends_at, ends_at),
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
