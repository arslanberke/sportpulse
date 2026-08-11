-- Bireysel sporlarin sporculari.
--
-- Tenis ve UFC'de karsilasan taraf bir kulup degil, kisi. Bugune kadar bu
-- branslarda yalnizca turnuvanin kendisi tutuluyordu ("US Open"), dolayisiyla
-- ne bir oyuncuyu yildizlamak ne de profiline gitmek mumkun degildi.
--
-- Neden `teams` tablosuna eklenmedi: takim kayitlari lige bagli, arma tasiyor ve
-- kulup adi sadelestirmesiyle eslestiriliyor ("FC" gibi onekleri atan
-- `fold_team_name`). Kisi adlarinda bu kurallarin hicbiri gecerli degil ve
-- siralama/puan gibi alanlar kuluplerde karsiliksiz.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sports(id),
  name text not null,
  /** Kaynagin kendi kimligi; siralama ve mac uclari bununla eslesiyor. */
  external_ids jsonb not null default '{}'::jsonb,
  country_code text,
  country_flag_url text,
  headshot_url text,
  -- Siralama yalnizca bilindiginde yazilir; her sporcunun sirasi olmuyor.
  rank int,
  rank_points numeric,
  rank_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index players_sport_name_idx
  on public.players (sport_id, lower(name));
create index players_rank_idx on public.players (sport_id, rank)
  where rank is not null;

alter table public.players enable row level security;

-- Katalog gibi herkese acik veri: okuma serbest, yazma yalnizca senkron isinde
-- (service_role RLS'i atlar).
create policy "sporcular herkese acik"
  on public.players for select
  to authenticated
  using (true);

/**
 * Bir sporcuyu kaynagin kimligiyle ya da adiyla bulup gunceller.
 *
 * Once kimlik denenir: ad degisse de (evlilik, yazim duzeltmesi) ayni kisi
 * tanınır. Kimlik yoksa ada bakilir, boylece farkli uclardan gelen ayni kisi
 * ikinci bir satir acmaz.
 */
create or replace function public.upsert_player(
  p_provider text,
  p_external_id text,
  p_sport_id text,
  p_name text,
  p_country_code text default null,
  p_country_flag_url text default null,
  p_headshot_url text default null,
  p_rank int default null,
  p_rank_points numeric default null
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from players
   where external_ids ->> p_provider = p_external_id
   limit 1;

  if v_id is null then
    select id into v_id from players
     where sport_id = p_sport_id and lower(name) = lower(p_name)
     limit 1;
  end if;

  if v_id is null then
    insert into players (
      sport_id, name, external_ids, country_code, country_flag_url,
      headshot_url, rank, rank_points,
      rank_synced_at
    ) values (
      p_sport_id, p_name, jsonb_build_object(p_provider, p_external_id),
      p_country_code, p_country_flag_url, p_headshot_url, p_rank, p_rank_points,
      case when p_rank is not null then now() end
    ) returning id into v_id;
    return v_id;
  end if;

  update players set
    external_ids = external_ids || jsonb_build_object(p_provider, p_external_id),
    country_code = coalesce(p_country_code, country_code),
    country_flag_url = coalesce(p_country_flag_url, country_flag_url),
    headshot_url = coalesce(p_headshot_url, headshot_url),
    -- Siralama yalnizca yeni bir deger geldiginde degisir: mac ucundan gelen
    -- kayitlar sira tasimiyor ve mevcut sirayi silmemeli.
    rank = coalesce(p_rank, rank),
    rank_points = coalesce(p_rank_points, rank_points),
    rank_synced_at = case when p_rank is not null then now() else rank_synced_at end,
    updated_at = now()
   where id = v_id;

  return v_id;
end;
$$;

revoke execute on function public.upsert_player from public, anon, authenticated;
