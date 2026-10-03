-- Senkron fonksiyonlari her calismada maclari degismemis olsalar bile yeniden
-- yaziyordu (upsert_event her zaman updated_at = now() yapar). events
-- Realtime yayininda oldugu icin her yazma tum istemcilere bir degisiklik
-- olarak gidiyor, istemci de her birinde mac listesini yeniden cekiyordu:
-- 1 Ekim'de bir saatte 2.115 satir, neredeyse hepsi ayni degerlerle.
--
-- updated_at disinda hicbir kolon degismiyorsa guncelleme atlanir: satir
-- yazilmaz, WAL'a ve Realtime'a hicbir sey gitmez. Gercek degisiklikler
-- (skor, saat, durum, canli/kadro onbellegi) aynen yazilir.

create or replace function public.skip_noop_event_update()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists events_skip_noop_update on public.events;
create trigger events_skip_noop_update
  before update on public.events
  for each row execute function public.skip_noop_event_update();
