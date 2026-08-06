-- Mac bazinda yayin kanali yazmak icin.
--
-- Kanal bilgisi bugune kadar lig basina sabit bir eslemeden geliyordu ve Turk
-- takimlarinin Avrupa maclarinda yaniliyordu: yayin hakki lig genelinde TRT'de
-- olsa da Fenerbahce - Sturm Graz ve Hradec Kralove - Besiktas TV100'de
-- yayinlandi. `event_broadcasts` bir mac icin kayit tasidiginda lig eslemesini
-- gecersiz kiliyor (bkz. `useUpcomingEvents`), ama tablo bugune kadar bostu.
--
-- Eslestirme neden burada: takim adlari kaynaklar arasinda farkli yaziliyor
-- ("Hradec Kralove" / "FC Hradec Králové", "Beşiktaş" / "Besiktas") ve bunlari
-- ayni kulup sayan sadelestirme (`fold_team_name`) veritabaninda.

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
    join teams h on h.id = e.home_team_id
    join teams a on a.id = e.away_team_id
   where fold_team_name(h.name) = fold_team_name(p_home)
     and fold_team_name(a.name) = fold_team_name(p_away)
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
