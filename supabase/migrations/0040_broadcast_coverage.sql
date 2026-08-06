-- Yayin kaynaginin hangi gunleri kapsadigi.
--
-- Mac bazli yayin kaydi olmayan maclarda lig eslemesi gosteriliyordu. Kaynak
-- devredeyken bu yanlis bilgiye donusuyor: kaynak yalnizca Turkiye'de
-- yayinlanan maclari listeler, listelemedigi mac buyuk olasilikla hicbir
-- kanalda yok -- ama ekran lig varsayimiyla "TRT 1" yaziyordu. Bugun katalogdaki
-- 40 Avrupa macindan yalnizca 2'si Turkiye'de yayinlaniyordu.
--
-- Kapsanan gunler burada tutulur. Istemci, maci kapsanan bir gune dusen ama mac
-- bazli kaydi olmayan maclarda kanal gostermez ("yayin bilgisi yok"). Kapsam
-- kaydi yoksa (kaynak bozuldu, is calismadi) lig eslemesine donulur; yani
-- kaynagin olmedigi gunlerde dogruluk, oldugu gunlerde eski davranis.

create table public.broadcast_coverage (
  country_code text not null,
  day date not null,
  synced_at timestamptz not null default now(),
  primary key (country_code, day)
);

alter table public.broadcast_coverage enable row level security;

create policy "coverage herkes okur"
  on public.broadcast_coverage for select
  to authenticated
  using (true);
