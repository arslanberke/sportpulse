-- Bir kulubun baska kaynaklarda gectigi adlar.
--
-- Yayin kaynagi Turkce yaziyor ("Dinamo Kiev", "Karabağ"), katalog ozgun yazimi
-- tutuyor ("Dynamo Kyiv", "FK Qarabag"). Ad sadelestirmesi aksan ve on ekleri
-- cozuyor ama ceviriyazi farki harf duzeyinde gercek fark; bu ciftler eslesmiyor
-- ve mac Turkiye'de yayinlandigi halde kanali yazilamiyordu.
--
-- Tahmine dayali cozumler denendi ve elendi: trigram benzerliginde dogru cift
-- (Kiev/Kyiv) 0.26 verirken alakasiz bir cift (Angers / Queens Park Rangers)
-- 0.23 veriyor, ayirt edilemiyor. Ad icerme testi de ayni tuzaga dusuyor.
-- Kalan tek guvenli yol elle bakimli esleme: eslesmeyen cift goruldukce buraya
-- eklenir. Tahmin yok, yanlis birlestirme riski yok.
--
-- Takma ad sadelesmis halde saklanir: arayan taraf da sadelestirerek geldigi
-- icin karsilastirma tek bicimde yapilir.

create table public.team_name_aliases (
  team_id uuid not null references public.teams(id) on delete cascade,
  alias_folded text not null,
  primary key (team_id, alias_folded)
);

create index team_name_aliases_alias_idx on public.team_name_aliases (alias_folded);

-- Yalnizca sunucu tarafindaki eslestirme fonksiyonlari okur.
alter table public.team_name_aliases enable row level security;

-- Bir ad bir takimla eslesiyor mu: dogrudan ya da takma ad uzerinden.
create or replace function public.team_name_matches(p_team_id uuid, p_name text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select fold_team_name(t.name) = fold_team_name(p_name)
      or exists (
        select 1 from team_name_aliases al
         where al.team_id = t.id
           and al.alias_folded = fold_team_name(p_name)
      )
    from teams t
   where t.id = p_team_id;
$$;

revoke execute on function public.team_name_matches from public, anon, authenticated;

-- Yayin eslestirmesi artik takma adlari da taniyor.
create or replace function public.set_event_broadcast(
  p_home text,
  p_away text,
  p_starts_at timestamptz,
  p_country_code text,
  p_channels jsonb
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_channel jsonb;
  v_channel_id uuid;
  v_name text;
  v_ids uuid[] := '{}';
begin
  -- Iki takim da taninmali. Tek takim uzerinden eslestirmek, ayni kulubun ayni
  -- gun oynanan baska bir brans macina yayin yazma riski tasir.
  select e.id into v_event_id
    from events e
   where e.home_team_id is not null
     and e.away_team_id is not null
     and team_name_matches(e.home_team_id, p_home)
     and team_name_matches(e.away_team_id, p_away)
     and e.starts_at between p_starts_at - interval '12 hours'
                         and p_starts_at + interval '12 hours'
   limit 1;

  if v_event_id is null then
    return null;
  end if;

  for v_channel in select * from jsonb_array_elements(p_channels) loop
    v_name := trim(v_channel ->> 'name');
    continue when coalesce(v_name, '') = '';

    -- Kanal adlari icin fold_team_name kullanilmaz: kulup adlarina gore
    -- ayarlanmis olan o fonksiyon "Spor" gibi kelimeleri atarak farkli
    -- kanallari ayni sayardi ("Spor Smart" ile "Smart Spor HD" gibi).
    select id into v_channel_id
      from channels
     where country_code = p_country_code
       and lower(name) = lower(v_name)
     limit 1;

    if v_channel_id is null then
      insert into channels (name, country_code, logo_url)
        values (v_name, p_country_code, nullif(v_channel ->> 'logo', ''))
        returning id into v_channel_id;
    elsif (v_channel ->> 'logo') is not null then
      update channels set logo_url = coalesce(logo_url, nullif(v_channel ->> 'logo', ''))
        where id = v_channel_id;
    end if;

    v_ids := v_ids || v_channel_id;
  end loop;

  if array_length(v_ids, 1) is null then
    return v_event_id;
  end if;

  -- Kaynak o mac icin tam listeyi veriyor; eski satirlar birakilirsa kaldirilan
  -- bir kanal ekranda kalirdi.
  delete from event_broadcasts
   where event_id = v_event_id
     and country_code = p_country_code
     and channel_id <> all(v_ids);

  insert into event_broadcasts (event_id, channel_id, country_code)
    select v_event_id, unnest(v_ids), p_country_code
    on conflict do nothing;

  return v_event_id;
end;
$$;

revoke execute on function public.set_event_broadcast from public, anon, authenticated;

-- Yayin kaynaginda bugune kadar gorulen ceviriyazi farklari.
insert into public.team_name_aliases (team_id, alias_folded)
select t.id, fold_team_name(pair.alias)
  from (values
    ('Dynamo Kyiv', 'Dinamo Kiev'),
    ('FK Qarabag',  'Karabağ')
  ) as pair(team_name, alias)
  join teams t on t.name = pair.team_name and t.sport_id = 'football'
on conflict do nothing;
