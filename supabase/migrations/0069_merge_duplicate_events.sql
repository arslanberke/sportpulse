-- Ayni macin birden fazla events satiri. 0068'den sonra calisir: takimlar
-- birlesince kopyalarin cogu ayni ev/deplasman ciftine duser.
--
-- Eslestirme kurali uygulamadaki src/features/events/lib/dedupe-events.ts ile
-- ayni: ayni spor, iki tarafta da takim var ve
--   (a) ev ve deplasman ayni, baslangic farki en fazla 12 saat; ya da
--   (b) baslangic birebir ayni ve ev ya da deplasmandan biri ayni.
-- Grup icinde bir saglayici iki farkli mac kimligi tasiyorsa grup atlanir:
-- iki ayri mac ayni kaynakta iki kimlikle duramaz, bu kaynak verisinin bozuk
-- oldugunu gosterir (sonda listelenir).
--
-- Asil kayit: bsd kimligi olan, sonra en cok saglayici kimligi tasiyan, sonra
-- skoru olan. Kopya SILINMEZ: kimlikleri asil kayda gecer, bos alanlar
-- (skor, sonuc, mekan, ...) kopyadan doldurulur, kopyaya bagli yayin, alt
-- etkinlik ve bildirimler asil kayda baglanir ve kopya merged_into_event_id
-- ile isaretlenir. Senkron kopyayi saglayici kimligiyle bir daha bulamaz
-- (kimlikleri bosaltildi); uygulama sorgulari "merged_into_event_id is null"
-- filtresiyle onu gormez.
--
-- Geri donus: supabase/rollback/0068_0070_rollback.sql

alter table public.events
  add column if not exists merged_into_event_id uuid references public.events (id) on delete set null;
create index if not exists events_merged_into_idx on public.events (merged_into_event_id)
  where merged_into_event_id is not null;
create index if not exists events_live_starts_at_idx on public.events (starts_at)
  where merged_into_event_id is null;

create table if not exists public.event_merges (
  drop_id uuid primary key,
  keep_id uuid not null,
  dropped_external_ids jsonb not null,
  merged_at timestamptz not null default now()
);
alter table public.event_merges enable row level security;
revoke all on public.event_merges from anon, authenticated;

-- Hangi iki satirin ayni mac oldugu: migration da upsert_event de bunu kullanir.
create or replace function public.same_match(
  a_sport text, a_home uuid, a_away uuid, a_starts timestamptz,
  b_sport text, b_home uuid, b_away uuid, b_starts timestamptz
) returns boolean
language sql immutable as $$
  select a_sport = b_sport
     and a_home is not null and a_away is not null and b_home is not null and b_away is not null
     and (
       (a_home = b_home and a_away = b_away and abs(extract(epoch from a_starts - b_starts)) <= 43200)
       or (a_starts = b_starts and (a_home = b_home or a_away = b_away))
     );
$$;

do $$
declare
  m record;
  v_ids jsonb;
  v_left int;
begin
  create temp table ev on commit drop as
  select e.id, e.sport_id, e.starts_at, e.home_team_id home, e.away_team_id away,
         (e.external_ids ? 'bsd')::int * 1000
           + (select count(*) from jsonb_each(e.external_ids)) * 10
           + (e.home_score is not null)::int rnk
    from events e
   where e.merged_into_event_id is null and e.home_team_id is not null and e.away_team_id is not null;

  create temp table epairs on commit drop as
  select x.id a, y.id b
    from ev x join ev y
      on x.sport_id = y.sport_id and x.id < y.id
     and same_match(x.sport_id, x.home, x.away, x.starts_at, y.sport_id, y.home, y.away, y.starts_at);

  create temp table ecomp on commit drop as
  with recursive u as (select a x, b y from epairs union select b, a from epairs),
  r(ev, root) as (select x, x from u union select u.y, r.root from r join u on u.x = r.ev)
  select ev, min(root::text)::uuid root from r group by ev;

  create temp table econflict on commit drop as
  select c.root from ecomp c join events e on e.id = c.ev
   cross join lateral jsonb_each_text(e.external_ids) k
   group by c.root, k.key having count(distinct k.value) > 1;

  create temp table emap on commit drop as
  with canon as (
    select distinct on (c.root) c.root, c.ev keep
      from ecomp c join ev on ev.id = c.ev
     where c.root not in (select root from econflict)
     order by c.root, ev.rnk desc, c.ev
  )
  select c.ev drop_id, k.keep from ecomp c join canon k on k.root = c.root where c.ev <> k.keep;

  for m in select mp.*, d.external_ids drop_ids from emap mp join events d on d.id = mp.drop_id loop
    insert into event_merges (drop_id, keep_id, dropped_external_ids)
    values (m.drop_id, m.keep, m.drop_ids) on conflict (drop_id) do nothing;

    v_ids := m.drop_ids;
    update events set external_ids = '{}'::jsonb, merged_into_event_id = m.keep where id = m.drop_id;
    update events k set
      external_ids = v_ids || k.external_ids,
      home_score = coalesce(k.home_score, d.home_score),
      away_score = coalesce(k.away_score, d.away_score),
      result_status = case
        when k.home_score is null and d.home_score is not null then coalesce(d.result_status, k.result_status)
        else coalesce(k.result_status, d.result_status) end,
      ends_at = coalesce(k.ends_at, d.ends_at),
      venue = coalesce(k.venue, d.venue),
      venue_image_url = coalesce(k.venue_image_url, d.venue_image_url),
      image_url = coalesce(k.image_url, d.image_url),
      round = coalesce(k.round, d.round),
      lineup_cache = coalesce(k.lineup_cache, d.lineup_cache),
      lineup_cached_at = case when k.lineup_cache is null then d.lineup_cached_at else k.lineup_cached_at end,
      live_cache = coalesce(k.live_cache, d.live_cache),
      live_cached_at = case when k.live_cache is null then d.live_cached_at else k.live_cached_at end
      from events d
     where k.id = m.keep and d.id = m.drop_id;

    insert into event_broadcasts (event_id, channel_id, country_code)
      select m.keep, channel_id, country_code from event_broadcasts where event_id = m.drop_id
      on conflict do nothing;

    update events set parent_event_id = m.keep where parent_event_id = m.drop_id;

    update notifications
       set data = jsonb_set(data, '{eventId}', to_jsonb(m.keep::text))
     where data ->> 'eventId' = m.drop_id::text;
  end loop;

  -- Dogrulama: birlesmesi gereken grup kalmamali, satir sayisi degismemeli.
  select count(*) into v_left
    from events x join events y
      on x.id < y.id and x.merged_into_event_id is null and y.merged_into_event_id is null
     and same_match(x.sport_id, x.home_team_id, x.away_team_id, x.starts_at,
                    y.sport_id, y.home_team_id, y.away_team_id, y.starts_at)
   where x.id not in (select ev from ecomp where root in (select root from econflict))
     and y.id not in (select ev from ecomp where root in (select root from econflict));
  if v_left <> 0 then
    raise exception 'event merge check failed: % duplicate pairs remain', v_left;
  end if;
  if (select count(*) from events) <> (select count(*) from backup_2026_10_01_events) then
    raise exception 'event merge check failed: event row count changed';
  end if;
  if exists (select 1 from notifications n join events e on e.id::text = n.data ->> 'eventId'
              where e.merged_into_event_id is not null) then
    raise exception 'event merge check failed: notifications still point at merged events';
  end if;
  raise notice 'merged % events (% conflicting groups skipped)',
    (select count(*) from emap), (select count(*) from econflict);
end $$;

-- ---------------------------------------------------------------------------
-- upsert_event: ayni kopyalar tekrar olusmasin
-- ---------------------------------------------------------------------------
-- 1. Takimlar resolve_team ile (saglayici kimligi > ad > alias, birlestirilmis
--    satirlar haric); eskiden alias tablosuna hic bakilmiyordu.
-- 2. Mac once kaynagin kendi kimligiyle, bulunamazsa same_match kuraliyla
--    (dedupe-events.ts ile ayni) aranir; aday ayni kaynaktan baska bir kimlik
--    tasiyorsa ayni mac sayilmaz. Eskiden yalnizca (a) kurali vardi.
-- 3. BSD kimligi olan bir macta baska bir kaynak saati, basligi, durumu ve
--    takimlari ezmez. Iki kaynak ayni macin saatini birbirinin uzerine
--    yaziyordu; her yazim "saat degisti" bildirimi uretiyordu.
create or replace function public.upsert_event(
  p_provider text, p_external_id text, p_sport_id text, p_league_id uuid, p_title text,
  p_starts_at timestamptz, p_status text, p_image_url text, p_home_team text, p_away_team text,
  p_venue text default null, p_venue_image_url text default null,
  p_home_team_ext text default null, p_away_team_ext text default null,
  p_home_logo text default null, p_away_logo text default null,
  p_ends_at timestamptz default null
) returns table (event_id uuid, change_type text)
language plpgsql security definer set search_path = public as $$
declare
  v_home_id uuid;
  v_away_id uuid;
  v_event_id uuid;
  v_old_starts_at timestamptz;
  v_old_status text;
  v_has_bsd boolean;
  v_change text;
begin
  if p_home_team is not null then
    v_home_id := resolve_team(p_sport_id, p_provider, p_home_team_ext, p_home_team);
    if v_home_id is null and p_home_team_ext is not null then
      v_home_id := resolve_team(p_sport_id, null, null, p_home_team);
    end if;
    if v_home_id is null then
      insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (p_sport_id, p_league_id, p_home_team, p_home_logo,
              case when p_home_team_ext is not null then jsonb_build_object(p_provider, p_home_team_ext) else '{}'::jsonb end)
      returning id into v_home_id;
    else
      update teams set
        logo_url = coalesce(logo_url, p_home_logo),
        external_ids = case when p_home_team_ext is not null and not (external_ids ? p_provider)
          then external_ids || jsonb_build_object(p_provider, p_home_team_ext) else external_ids end
       where id = v_home_id;
    end if;
  end if;

  if p_away_team is not null then
    v_away_id := resolve_team(p_sport_id, p_provider, p_away_team_ext, p_away_team);
    if v_away_id is null and p_away_team_ext is not null then
      v_away_id := resolve_team(p_sport_id, null, null, p_away_team);
    end if;
    if v_away_id is null then
      insert into teams (sport_id, league_id, name, logo_url, external_ids)
      values (p_sport_id, p_league_id, p_away_team, p_away_logo,
              case when p_away_team_ext is not null then jsonb_build_object(p_provider, p_away_team_ext) else '{}'::jsonb end)
      returning id into v_away_id;
    else
      update teams set
        logo_url = coalesce(logo_url, p_away_logo),
        external_ids = case when p_away_team_ext is not null and not (external_ids ? p_provider)
          then external_ids || jsonb_build_object(p_provider, p_away_team_ext) else external_ids end
       where id = v_away_id;
    end if;
  end if;

  select id, starts_at, status into v_event_id, v_old_starts_at, v_old_status
    from events
   where external_ids ->> p_provider = p_external_id
     and merged_into_event_id is null
   limit 1;

  -- Bu kaynak maci ilk kez goruyor: baska bir kaynaktan gelmis ayni mac var mi.
  if v_event_id is null and v_home_id is not null and v_away_id is not null then
    select e.id, e.starts_at, e.status into v_event_id, v_old_starts_at, v_old_status
      from events e
     where e.merged_into_event_id is null
       and e.starts_at between p_starts_at - interval '12 hours' and p_starts_at + interval '12 hours'
       and not (e.external_ids ? p_provider)
       and same_match(e.sport_id, e.home_team_id, e.away_team_id, e.starts_at,
                      p_sport_id, v_home_id, v_away_id, p_starts_at)
     order by (e.external_ids ? 'bsd') desc,
              (select count(*) from jsonb_each(e.external_ids)) desc,
              abs(extract(epoch from e.starts_at - p_starts_at)), e.id
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
    select external_ids ? 'bsd' into v_has_bsd from events where id = v_event_id;

    if p_provider = 'bsd' or not v_has_bsd then
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
    else
      update events set
        ends_at = coalesce(ends_at, p_ends_at),
        image_url = coalesce(image_url, p_image_url),
        venue = coalesce(venue, p_venue),
        venue_image_url = coalesce(venue_image_url, p_venue_image_url),
        updated_at = now()
      where id = v_event_id;
    end if;
  end if;

  return query select v_event_id, v_change;
end;
$$;
