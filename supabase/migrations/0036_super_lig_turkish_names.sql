-- Turk takimlarinin adlari aksansiz yaziliyordu: "Besiktas", "Fenerbahce",
-- "Goztepe", "Kasimpasa", "Istanbul Basaksehir".
--
-- Sebep kaynaklarda: TheSportsDB adlari tumuyle aksansiz veriyor, ESPN ise
-- tutarsiz (ayni listede "Çorum FK" dogru ama "Caykur Rizespor" ve "Kasimpasa"
-- yanlis). Adi elle duzeltmek kalici olmaz; kadro senkronu yetkili bir kaynak
-- bulundugunda adi yeniden yaziyor (bkz. migration 0026) ve duzeltme geri
-- aliniyor.
--
-- Kalici cozum kaynagi degistirmek: wikipedia saglayicisi tr.wikipedia'daki
-- sezon makalesini okuyor, yani adlari Turkce yaziliyla veriyor. Saglayici
-- zincirinde ESPN'den once geliyor ve "tam liste" sayildigi icin mevcut
-- kayitlari yeniden adlandirma hakki var.
--
-- Lig, makale son ekini `external_ids.wikipedia` ile bildirerek katiliyor;
-- "Süper Lig" -> "2026-27 Süper Lig". Makalenin varligi dogrulandi.
--
-- Trendyol 1. Lig eklenmedi: tr.wikipedia'da "2026-27 Trendyol 1. Lig" adiyla
-- bir makale yok, once dogru baslik bulunmali.

update public.leagues
   set external_ids = external_ids || jsonb_build_object('wikipedia', 'Süper Lig')
 where name = 'Süper Lig'
   and sport_id = 'football';
