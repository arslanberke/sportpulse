-- Sezon araligi.
--
-- Etkinlikler yalnizca 14 gun ileriye senkronlaniyor, dolayisiyla "bu lig ne
-- zaman basliyor" ya da "su anda oynaniyor mu" sorulari fikstur tablosundan
-- yanitlanamaz: sezon arasindaki bir ligin hic satiri olmaz. Lig ekranindaki
-- geri sayim bu iki tarihe bakar.

alter table public.leagues
  add column if not exists season_start timestamptz,
  add column if not exists season_end timestamptz,
  -- Saglayiciyi bosuna yeniden sormamak icin son deneme zamani tutulur.
  add column if not exists season_synced_at timestamptz;

comment on column public.leagues.season_start is
  'Sezonun ilk macinin baslangici. Saglayicinin takvimindeki en erken tarih; '
  'idari sezon baslangici degil (Premier Lig''de o tarih 1 Haziran''i gosterir '
  'ama ilk mac 21 Agustos''tadir).';

comment on column public.leagues.season_end is
  'Sezonun bittigi tarih. Bu aralikta bulunmak ligin oynandigi anlamina gelir; '
  'lig arasi (ornegin kis arasi) bu sayede sezon oncesinden ayirt edilir.';

comment on column public.leagues.season_synced_at is
  'Sezon bilgisinin saglayiciya en son soruldugu an. Bilgi bulunamadiginda da '
  'yazilir, boylece her senkronda ayni istek tekrarlanmaz.';
