-- TV100 kanal listesinde yoktu.
--
-- Turk takimlarinin Avrupa kupasi maclari bu sezon TV100'e alt lisanslaniyor:
-- lig genelinde yayinci TRT/tabii olsa da Fenerbahce - Sturm Graz (5 Agustos,
-- Sampiyonlar Ligi 3. eleme) TV100'de yayinlandi. Uygulama lig eslesmesini
-- gosterdigi icin yanlis kanal yaziyordu.
--
-- Kanal kaydi ekleniyor; hangi macin hangi kanalda oldugu `event_broadcasts`
-- ile mac bazinda girilir (lig eslesmesini gecersiz kilar).

insert into public.channels (name, country_code)
select 'TV100', 'TR'
where not exists (
  select 1 from public.channels where name = 'TV100' and country_code = 'TR'
);
