-- Avrupa kupalarinin eleme turlari fiksturde hic gorunmuyordu.
--
-- ESPN eleme turunu bagimsiz bir lig sayiyor: Agustos basinda `uefa.europa`
-- bos donerken Besiktas - Hradec Kralove maci `uefa.europa_qual` altinda
-- duruyor. Katalogda yalnizca ana kod kayitli oldugu icin bu maclar hic
-- cekilmedi ve kullanici "maclar eksik" olarak gordu.
--
-- Eleme turlari ayri bir yarisma olarak eklenmiyor: ligi takip eden kullanicinin
-- eleme maclarini gormesi icin ayrica o yarismayi da takip etmesi gerekirdi.
-- Bunun yerine ayni lig satirina ikinci bir ESPN kodu yaziliyor; saglayici iki
-- kodu birlikte okuyup sonuclari ayni yarismaya yaziyor.
--
-- Sezon araligi ve kadro icin ana kod kullanilmaya devam eder.

update public.leagues
   set external_ids = external_ids || jsonb_build_object('espnQualifying', 'uefa.europa_qual')
 where external_ids ->> 'espn' = 'uefa.europa';

update public.leagues
   set external_ids = external_ids || jsonb_build_object('espnQualifying', 'uefa.champions_qual')
 where external_ids ->> 'espn' = 'uefa.champions';

update public.leagues
   set external_ids = external_ids || jsonb_build_object('espnQualifying', 'uefa.europa.conf_qual')
 where external_ids ->> 'espn' = 'uefa.europa.conf';
