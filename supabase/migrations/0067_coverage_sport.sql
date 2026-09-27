-- BSD'nin yayin akisi yalnizca futbolu kapsiyor ve gelecek haftayi listeliyor.
-- Sporekrani ise yalnizca bugunu ama tum sporlari veriyor. Kapsam kaydina spor
-- boyutu eklenmezse BSD'nin yazdigi 7 gunluk pencere basketbol/voleybol
-- maclarinda lig varsayimini da bastirir. Bos sport_id = tum sporlar
-- (sporekrani gunu), 'football' = yalnizca BSD kimligi tasiyan maclar.

alter table public.broadcast_coverage
  add column if not exists sport_id text not null default '';

alter table public.broadcast_coverage
  drop constraint if exists broadcast_coverage_pkey;

alter table public.broadcast_coverage
  add primary key (country_code, day, sport_id);
