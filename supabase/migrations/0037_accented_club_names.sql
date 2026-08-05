-- Turkce takim adlari kaynaktaki aksansiz haliyle kaliyordu.
--
-- Kadro senkronu yetkili bir listeden gelen adi yaziyor, ama migration 0029 bunu
-- "yeni ad daha kisaysa" sartina baglamisti: amac saglayicilarin sisirilmis
-- adlarini ("Besiktas Istanbul") kisa adla degistirmekti. Aksan duzeltmesi bu
-- sarti hicbir zaman gecmiyor, cunku "Beşiktaş" ile "Besiktas" ayni uzunlukta.
--
-- Wikipedia sezon makalesi adlari dogru yaziyla veriyor (Çaykur Rizespor,
-- Eyüpspor, Göztepe); tek eksik onlari kabul etmekti.

create or replace function public.upsert_team(
  p_external_ids jsonb,
  p_sport_id text,
  p_league_id uuid,
  p_name text,
  p_logo_url text default null,
  p_rename boolean default false,
  p_aliases text[] default '{}'
) returns uuid
language plpgsql
security definer set search_path = public
as $$
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
$$;
