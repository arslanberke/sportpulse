-- 0068-0070 geri donus. ELLE calistirilir, tek transaction:
--   npx supabase db query --linked -f supabase/rollback/0068_0070_rollback.sql
-- 2026-10-01 yedeklerinden (backup_2026_10_01_*) birlestirmeden onceki
-- durumu geri yukler. Birlestirmeden sonra senkronun yeni actigi satirlara
-- dokunmaz; yalnizca birlestirmenin ekledigi baglanti satirlarini geri alir.
begin;

-- Bildirimler
update public.notifications n set data = b.data
  from public.backup_2026_10_01_notifications b where b.id = n.id;

-- Birlestirmenin asil kayit adina ekledigi baglanti satirlari
delete from public.event_broadcasts eb
 where eb.event_id in (select keep_id from public.event_merges)
   and not exists (select 1 from public.backup_2026_10_01_event_broadcasts b
                    where b.event_id = eb.event_id and b.channel_id = eb.channel_id and b.country_code = eb.country_code);
delete from public.league_teams lt
 where lt.team_id in (select keep_id from public.team_merges)
   and not exists (select 1 from public.backup_2026_10_01_league_teams b where b.league_id = lt.league_id and b.team_id = lt.team_id);
delete from public.user_follows f
 where f.team_id in (select keep_id from public.team_merges)
   and not exists (select 1 from public.backup_2026_10_01_user_follows b where b.id = f.id);
delete from public.user_favorites f
 where f.team_id in (select keep_id from public.team_merges)
   and not exists (select 1 from public.backup_2026_10_01_user_favorites b where b.id = f.id);
delete from public.team_name_aliases a
 where a.team_id in (select keep_id from public.team_merges)
   and not exists (select 1 from public.backup_2026_10_01_team_name_aliases b where b.team_id = a.team_id and b.alias_folded = a.alias_folded);

-- Etkinlikler: once kimlikler bosaltilir (unique index), sonra geri yazilir.
update public.events e set external_ids = '{}'::jsonb, merged_into_event_id = null
 where e.id in (select keep_id from public.event_merges union select drop_id from public.event_merges
                union select id from public.backup_2026_10_01_events b where b.home_team_id in (select drop_id from public.team_merges)
                                                                     or b.away_team_id in (select drop_id from public.team_merges));
update public.events e set
  home_team_id = b.home_team_id, away_team_id = b.away_team_id, external_ids = b.external_ids,
  home_score = b.home_score, away_score = b.away_score, result_status = b.result_status,
  ends_at = b.ends_at, venue = b.venue, venue_image_url = b.venue_image_url, image_url = b.image_url,
  round = b.round, lineup_cache = b.lineup_cache, lineup_cached_at = b.lineup_cached_at,
  live_cache = b.live_cache, live_cached_at = b.live_cached_at, parent_event_id = b.parent_event_id
  from public.backup_2026_10_01_events b
 where b.id = e.id
   and (e.id in (select keep_id from public.event_merges union select drop_id from public.event_merges)
        or b.home_team_id in (select drop_id from public.team_merges)
        or b.away_team_id in (select drop_id from public.team_merges)
        or e.parent_event_id is distinct from b.parent_event_id
        or e.home_score is distinct from b.home_score);

-- Takimlar
update public.teams t set external_ids = '{}'::jsonb
 where t.id in (select keep_id from public.team_merges union select drop_id from public.team_merges);
update public.teams t set external_ids = b.external_ids, logo_url = b.logo_url, league_id = b.league_id
  from public.backup_2026_10_01_teams b
 where b.id = t.id and t.id in (select keep_id from public.team_merges union select drop_id from public.team_merges);

-- Fonksiyonlar (0068-0070 oncesi tanimlar, canlidan alindi)
drop function if exists public.set_event_results(jsonb);
drop function if exists public.events_missing_result(int);
CREATE OR REPLACE FUNCTION public.upsert_event(p_provider text, p_external_id text, p_sport_id text, p_league_id uuid, p_title text, p_starts_at timestamp with time zone, p_status text, p_image_url text, p_home_team text, p_away_team text, p_venue text DEFAULT NULL::text, p_venue_image_url text DEFAULT NULL::text, p_home_team_ext text DEFAULT NULL::text, p_away_team_ext text DEFAULT NULL::text, p_home_logo text DEFAULT NULL::text, p_away_logo text DEFAULT NULL::text, p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(event_id uuid, change_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

;

CREATE OR REPLACE FUNCTION public.upsert_team(p_external_ids jsonb, p_sport_id text, p_league_id uuid, p_name text, p_logo_url text DEFAULT NULL::text, p_rename boolean DEFAULT false, p_aliases text[] DEFAULT '{}'::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_team_id uuid;
  v_key text;
  v_alias text;
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
    foreach v_alias in array p_aliases loop
      continue when fold_team_name(v_alias) = '';
      select id into v_team_id from teams
        where sport_id = p_sport_id
          and fold_team_name(name) = fold_team_name(v_alias);
      exit when v_team_id is not null;
    end loop;
  end if;

  if v_team_id is null then
    insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (p_sport_id, p_league_id, p_name, p_logo_url, p_external_ids)
      returning id into v_team_id;
  else
    update teams set
      name = case
        when p_rename and length(p_name) < length(name) then p_name
        -- Ayni adin aksanli yazilisi: uzunluk kurali bunlari hic gecirmiyordu
        -- ("Besiktas" ile "Beşiktaş" ayni uzunlukta), dolayisiyla Turkce adlar
        -- kaynaktaki aksansiz haliyle kaliyordu. Yalnizca ayni kulup oldugu
        -- sadelestirmeyle dogrulanmis adlarda ve mevcut ad duz ASCII iken
        -- gecerli, yani farkli bir kulube gecis yapamaz.
        when p_rename
         and fold_team_name(p_name) = fold_team_name(name)
         and p_name ~ '[^[:ascii:]]'
         and name !~ '[^[:ascii:]]'
        then p_name
        else name
      end,
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
$function$

;

CREATE OR REPLACE FUNCTION public.merge_teams(p_keep uuid, p_drop uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

;

drop function if exists public.same_match(text, uuid, uuid, timestamptz, text, uuid, uuid, timestamptz);
drop function if exists public.resolve_team(text, text, text, text);
alter table public.events drop column if exists merged_into_event_id;
alter table public.teams drop column if exists merged_into_team_id;
drop index if exists public.events_live_starts_at_idx;
drop table if exists public.event_merges;
drop table if exists public.team_merges;

commit;
-- Yedek tablolar (backup_2026_10_01_*) bilerek silinmez.
