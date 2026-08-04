-- `_mirror_probe` logo aynalama denemelerinden kalmis gecici bir tablo. Canliya
-- elle olusturuldugu icin migration'larda hic yoktu: RLS kapali kaldi ve anon
-- rolunde tum yetkiler duruyordu, yani uygulamanin herkese acik anahtariyla
-- okunup yazilabiliyordu (TRUNCATE dahil).
--
-- Icerigi degersiz ama tabloyu burada dusurmuyoruz: canlida ne oldugu elle
-- dogrulanmadan veri silmek istemiyoruz. Erisimi kapatmak acigi kapatiyor.
-- Tablonun tumden kaldirilmasi ayri bir adim olarak yapilmali.

alter table if exists public._mirror_probe enable row level security;

revoke all on public._mirror_probe from anon, authenticated;

comment on table public._mirror_probe is
  'Kullanim disi: logo aynalama denemesinden kaldi. RLS acik, politika yok ve '
  'Data API rollerinden yetki alindi; hicbir istemci erisemez.';
