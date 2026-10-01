-- Ayni kulubun birden fazla takim satiri ("Ath Bilbao" / "Athletic Club",
-- "QPR" / "Queens Park Rangers", "Lens" / "RC Lens" ...). Kaynaklar adi farkli
-- yaziyor; upsert_event isimle eslesmeyi alias tablosuna bakmadan yaptigi icin
-- her yeni yazilis yeni bir takim satiri uretiyordu.
--
-- Kopyalar ISIMLE degil KANITLA bulunur (AGENTS.md: substring eslestirmesi
-- yasak, Angers ⊂ Queens Park Rangers):
--   (a) ayni spor + ayni lig + ayni baslangic + ayni rakip + ayni taraf: iki
--       satir ayni macin ayni tarafinda gorunuyorsa ayni kulup;
--   (b) ortak bir saglayici kimligi (external_ids).
-- Ayni saglayicida FARKLI kimlik tasiyan cift ayni kulup sayilmaz: bu ciftler
-- yanlis takima baglanmis tekil maclardan geliyor (AS Roma / RB Leipzig).
--
-- Asil kayit: bsd kimligi olan; yoksa daha cok saglayici kimligi tasiyan;
-- esitlikte daha cok maci olan. Kopya SILINMEZ: baglantilari asil kayda
-- tasinir, kimlikleri bosaltilir, merged_into_team_id ile isaretlenir ve adi
-- asil kaydin alias'i olur ki senkron ayni yazilisla tekrar takim acmasin.
--
-- Geri donus: supabase/rollback/0068_0070_rollback.sql

-- ---------------------------------------------------------------------------
-- Yedek (0068-0070 icin ortak; ilk calistirmada alinir)
-- ---------------------------------------------------------------------------
create table if not exists public.backup_2026_10_01_teams as table public.teams;
create table if not exists public.backup_2026_10_01_events as table public.events;
create table if not exists public.backup_2026_10_01_league_teams as table public.league_teams;
create table if not exists public.backup_2026_10_01_event_broadcasts as table public.event_broadcasts;
create table if not exists public.backup_2026_10_01_user_follows as table public.user_follows;
create table if not exists public.backup_2026_10_01_user_favorites as table public.user_favorites;
create table if not exists public.backup_2026_10_01_team_name_aliases as table public.team_name_aliases;
create table if not exists public.backup_2026_10_01_notifications as
  select id, data from public.notifications where data ? 'eventId';

-- Yedekler istemci rollerine kapali.
do $$
declare t text;
begin
  foreach t in array array['teams','events','league_teams','event_broadcasts','user_follows',
                           'user_favorites','team_name_aliases','notifications'] loop
    execute format('alter table public.backup_2026_10_01_%s enable row level security', t);
    execute format('revoke all on public.backup_2026_10_01_%s from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Isaret kolonu + denetim tablosu
-- ---------------------------------------------------------------------------
alter table public.teams
  add column if not exists merged_into_team_id uuid references public.teams (id) on delete set null;
create index if not exists teams_merged_into_idx on public.teams (merged_into_team_id)
  where merged_into_team_id is not null;

create table if not exists public.team_merges (
  drop_id uuid primary key,
  keep_id uuid not null,
  evidence_matches int not null,
  evidence_ids text,
  dropped_name text not null,
  dropped_external_ids jsonb not null,
  merged_at timestamptz not null default now()
);
alter table public.team_merges enable row level security;
revoke all on public.team_merges from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Birlestirme
-- ---------------------------------------------------------------------------
do $$
declare
  m record;
  v_ids jsonb;
  v_expected int;
  v_moved int;
begin
  create temp table side on commit drop as
  select e.id, e.sport_id, e.league_id, e.starts_at, e.home_team_id team, e.away_team_id opp, 'home' s
    from events e where e.home_team_id is not null and e.away_team_id is not null
  union all
  select e.id, e.sport_id, e.league_id, e.starts_at, e.away_team_id, e.home_team_id, 'away'
    from events e where e.home_team_id is not null and e.away_team_id is not null;

  create temp table pairs on commit drop as
  with match_ev as (
    select least(a.team, b.team) t1, greatest(a.team, b.team) t2, count(*) / 2 n
      from side a
      join side b
        on a.sport_id = b.sport_id and a.league_id is not distinct from b.league_id
       and a.starts_at = b.starts_at and a.opp = b.opp and a.s = b.s
       and a.team <> b.team and a.id <> b.id
     group by 1, 2
  ), id_ev as (
    select least(a.id, b.id) t1, greatest(a.id, b.id) t2, string_agg(distinct k.key, ',') keys
      from teams a
      cross join lateral jsonb_each_text(a.external_ids) k
      join teams b on b.sport_id = a.sport_id and b.id <> a.id and b.external_ids ->> k.key = k.value
     where a.merged_into_team_id is null and b.merged_into_team_id is null
     group by 1, 2
  )
  select coalesce(me.t1, ie.t1) t1, coalesce(me.t2, ie.t2) t2, coalesce(me.n, 0) n, ie.keys
    from match_ev me full join id_ev ie on ie.t1 = me.t1 and ie.t2 = me.t2;

  -- Ayni saglayicida farkli kimlik = farkli kulup.
  delete from pairs p
   using teams a, teams b
   where a.id = p.t1 and b.id = p.t2
     and exists (select 1 from jsonb_each_text(a.external_ids) ka
                 join jsonb_each_text(b.external_ids) kb on kb.key = ka.key and kb.value <> ka.value);

  create temp table comp on commit drop as
  with recursive u as (select t1 a, t2 b from pairs union select t2, t1 from pairs),
  r(team, root) as (select a, a from u union select u.b, r.root from r join u on u.a = r.team)
  select team, min(root::text)::uuid root from r group by team;

  -- Kume icinde bir saglayici iki farkli deger tasiyorsa kume butunuyle atlanir.
  delete from comp c
   where c.root in (
     select c2.root from comp c2 join teams t on t.id = c2.team
      cross join lateral jsonb_each_text(t.external_ids) k
      group by c2.root, k.key having count(distinct k.value) > 1);

  create temp table tmap on commit drop as
  with canon as (
    select distinct on (c.root) c.root, t.id keep
      from comp c join teams t on t.id = c.team
     order by c.root,
              (t.external_ids ? 'bsd') desc,
              (select count(*) from jsonb_each(t.external_ids)) desc,
              (select count(*) from events e where e.home_team_id = t.id or e.away_team_id = t.id) desc,
              t.id
  )
  select c.team drop_id, k.keep,
         coalesce((select max(p.n) from pairs p where (p.t1 = c.team and p.t2 = k.keep) or (p.t2 = c.team and p.t1 = k.keep)), 0) n,
         (select max(p.keys) from pairs p where (p.t1 = c.team and p.t2 = k.keep) or (p.t2 = c.team and p.t1 = k.keep)) keys
    from comp c join canon k on k.root = c.root
   where c.team <> k.keep;

  select count(*) into v_expected
    from events where home_team_id in (select drop_id from tmap) or away_team_id in (select drop_id from tmap);

  for m in select t.*, d.name drop_name, d.external_ids drop_ids
             from tmap t join teams d on d.id = t.drop_id loop
    insert into team_merges (drop_id, keep_id, evidence_matches, evidence_ids, dropped_name, dropped_external_ids)
    values (m.drop_id, m.keep, m.n, m.keys, m.drop_name, m.drop_ids)
    on conflict (drop_id) do nothing;

    -- Saglayici kimlikleri unique indexli: once kopya birakir, sonra asil alir.
    v_ids := m.drop_ids;
    update teams set external_ids = '{}'::jsonb, merged_into_team_id = m.keep where id = m.drop_id;
    update teams k set
      external_ids = v_ids || k.external_ids,
      logo_url = coalesce(k.logo_url, d.logo_url),
      league_id = coalesce(k.league_id, d.league_id)
      from teams d
     where k.id = m.keep and d.id = m.drop_id;

    update events set home_team_id = m.keep where home_team_id = m.drop_id;
    update events set away_team_id = m.keep where away_team_id = m.drop_id;

    -- Baglanti tablolari: asil kayit adina eklenir; ayni kullanici/lig icin
    -- zaten varsa "on conflict do nothing" ile birlesir. Hicbir satir
    -- silinmez: eski satir kopyada kalir, kopya merged_into ile isaretli
    -- oldugu icin uygulama ve senkron onu gormez.
    insert into league_teams (league_id, team_id)
      select league_id, m.keep from league_teams where team_id = m.drop_id
      on conflict do nothing;

    insert into user_follows (user_id, kind, sport_id, league_id, team_id, created_at)
      select user_id, kind, sport_id, league_id, m.keep, created_at
        from user_follows where team_id = m.drop_id and kind = 'team'
      on conflict do nothing;

    insert into user_favorites (user_id, team_id, created_at)
      select user_id, m.keep, created_at from user_favorites where team_id = m.drop_id
      on conflict do nothing;

    insert into team_name_aliases (team_id, alias_folded)
      select m.keep, alias_folded from team_name_aliases where team_id = m.drop_id
      on conflict do nothing;
    -- Kopyanin adi asil kaydin alias'i: senkron bu yazilisla bir daha takim acmaz.
    insert into team_name_aliases (team_id, alias_folded)
      select m.keep, fold_team_name(m.drop_name)
       where fold_team_name(m.drop_name) <> ''
         and fold_team_name(m.drop_name) <> (select fold_team_name(name) from teams where id = m.keep)
      on conflict do nothing;
  end loop;

  -- Dogrulama: beklenen sayilar tutmazsa tum islem geri alinir.
  select count(*) into v_moved
    from events where home_team_id in (select drop_id from tmap) or away_team_id in (select drop_id from tmap);
  if v_moved <> 0 then
    raise exception 'team merge check failed: % events still point at merged teams', v_moved;
  end if;
  if exists (select 1 from teams where merged_into_team_id is not null and external_ids <> '{}'::jsonb) then
    raise exception 'team merge check failed: merged team still carries provider ids';
  end if;
  if (select count(*) from teams) <> (select count(*) from backup_2026_10_01_teams) then
    raise exception 'team merge check failed: team row count changed';
  end if;
  raise notice 'merged % teams, relinked % events', (select count(*) from tmap), v_expected;
end $$;

-- ---------------------------------------------------------------------------
-- Takim cozumleme: ayni kopyalar tekrar olusmasin
-- ---------------------------------------------------------------------------
-- Tek yer: once saglayici kimligi, sonra sadelestirilmis ad, sonra alias.
-- Birlestirilmis (bos) satirlar hicbir adimda secilmez; birden fazla aday
-- varsa bsd kimligi ve kimlik sayisi belirler (eskiden limit/sira yoktu ve
-- hangi satirin secilecegi rastgeleydi).
create or replace function public.resolve_team(
  p_sport_id text, p_provider text, p_external_id text, p_name text
) returns uuid
language sql stable security definer set search_path = public as $$
  with cand as (
    select t.id, 1 step from teams t
     where p_external_id is not null and t.external_ids ->> p_provider = p_external_id
       and t.merged_into_team_id is null
    union all
    select t.id, 2 from teams t
     where p_name is not null and t.sport_id = p_sport_id
       and fold_team_name(t.name) = fold_team_name(p_name) and fold_team_name(p_name) <> ''
       and t.merged_into_team_id is null
       -- Kaynak kimligi verildiyse ve aday ayni kaynaktan BASKA bir kimlik
       -- tasiyorsa ayni kulup degildir.
       and (p_external_id is null or not (t.external_ids ? p_provider))
    union all
    select t.id, 3 from team_name_aliases al join teams t on t.id = al.team_id
     where p_name is not null and t.sport_id = p_sport_id
       and al.alias_folded = fold_team_name(p_name) and fold_team_name(p_name) <> ''
       and t.merged_into_team_id is null
       and (p_external_id is null or not (t.external_ids ? p_provider))
  )
  select c.id from cand c join teams t on t.id = c.id
   order by c.step, (t.external_ids ? 'bsd') desc, (select count(*) from jsonb_each(t.external_ids)) desc, t.id
   limit 1;
$$;
revoke all on function public.resolve_team(text, text, text, text) from public, anon, authenticated;

create or replace function public.upsert_team(
  p_external_ids jsonb, p_sport_id text, p_league_id uuid, p_name text,
  p_logo_url text default null, p_rename boolean default false, p_aliases text[] default '{}'::text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_key text;
  v_alias text;
begin
  for v_key in select jsonb_object_keys(p_external_ids) loop
    v_team_id := resolve_team(p_sport_id, v_key, p_external_ids ->> v_key, null);
    exit when v_team_id is not null;
  end loop;

  if v_team_id is null then
    v_team_id := resolve_team(p_sport_id, null, null, p_name);
  end if;

  if v_team_id is null then
    foreach v_alias in array p_aliases loop
      continue when fold_team_name(v_alias) = '';
      v_team_id := resolve_team(p_sport_id, null, null, v_alias);
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
        when p_rename
         and fold_team_name(p_name) = fold_team_name(name)
         and p_name ~ '[^[:ascii:]]'
         and name !~ '[^[:ascii:]]'
        then p_name
        else name
      end,
      league_id = coalesce(league_id, p_league_id),
      logo_url = coalesce(p_logo_url, logo_url),
      -- Mevcut kimlik ezilmez: farkli bir kimlik baska kulube aittir.
      external_ids = p_external_ids || external_ids
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

-- Eski merge_teams kopyayi siliyordu; birlestirme artik isaretleyerek yapiliyor.
drop function if exists public.merge_teams(uuid, uuid);
