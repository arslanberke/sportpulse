-- Formula 1'de seanslar gorunmuyordu; ESPN yalnizca tek kayit veriyor.
--
-- Bir yaris hafta sonu antrenman, sprint sıralama, sprint, sıralama ve yaristan
-- olusuyor. ESPN'in `racing/f1` ucu bunlarin yerine tek bir kayit donuyor ve
-- tarihi de yaris gunu degil hafta sonunun basi ("Heineken Dutch Grand Prix"
-- 21 Agustos, oysa yaris 23 Agustos). TheSportsDB gun gun tarandiginda hepsini
-- ayri ayri veriyor:
--
--   21 Agustos  Practice 1, Sprint Qualifying
--   22 Agustos  Sprint, Qualifying
--   23 Agustos  Dutch Grand Prix
--
-- Bu yuzden Formula 1'in ESPN kodu kaldiriliyor: saglayici zinciri kodu olmayan
-- ligi ESPN'e sormaz ve TheSportsDB'ye duser. Iki kaynagi birlestirmek secenek
-- degildi -- motor sporu etkinliklerinde takim bilgisi yok, dolayisiyla ayni
-- yarisi iki kaynaktan almak cift kayit uretirdi (bkz. migration 0035'teki
-- eslestirme olcutu takimlara dayaniyor).

update public.leagues
   set external_ids = external_ids - 'espn'
 where sport_id = 'f1'
   and name = 'Formula 1';

-- ESPN'den gelmis tek kayit siliniyor: tarihi yanlis ve yerine ayni hafta
-- sonunun seanslari gelecek.
delete from public.events
 where external_ids ? 'espn'
   and sport_id = 'f1';
