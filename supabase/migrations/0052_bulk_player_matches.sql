-- Kurayi tek cagride yazan toplu surum.
--
-- Kura maclari tek tek yaziliyordu: her mac icin bir `upsert_player_match`
-- cagrisi, her cagri ayri bir HTTP isteği. Cincinnati'de 265 mac vardi ve
-- fonksiyon sinirdan geciyordu; US Open'da 625 mac cikti ve ~1900 istek
-- fonksiyonun ~150 saniyelik butcesini asti. Sonuc: istek yanit dondurmeden
-- kesildi, kura hic yazilmadi ve ayni parcadaki diger ligler (Serie A,
-- Primeira Liga, MotoGP, Basketbol Super Ligi) de yarida kaldi.
--
-- Artik butun kura tek jsonb dizisi olarak gonderiliyor: bir istek, bir islem.
-- Dongu veritabani icinde donuyor, mac basina ag gidis donusu yok.
--
-- Tek tek yazan surum korunuyor: mantik orada duruyor ve buradaki dongu onu
-- cagiriyor, boylece kural iki yere kopyalanmiyor.

create or replace function public.upsert_player_matches(
  p_provider text,
  p_sport_id text,
  p_league_id uuid,
  p_matches jsonb
) returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_match jsonb;
  v_written int := 0;
  v_id uuid;
begin
  for v_match in select * from jsonb_array_elements(p_matches)
  loop
    v_id := upsert_player_match(
      p_provider,
      v_match ->> 'externalId',
      p_sport_id,
      p_league_id,
      v_match ->> 'tournamentExternalId',
      (v_match ->> 'startsAt')::timestamptz,
      v_match ->> 'status',
      v_match ->> 'round',
      v_match ->> 'bracket',
      v_match ->> 'homeName',
      v_match ->> 'homeExt',
      v_match ->> 'homeFlag',
      v_match ->> 'awayName',
      v_match ->> 'awayExt',
      v_match ->> 'awayFlag'
    );
    -- Turnuvasi bulunamayan mac yazilmaz; sayimda da gorunmemeli.
    if v_id is not null then
      v_written := v_written + 1;
    end if;
  end loop;

  return v_written;
end;
$$;

revoke execute on function public.upsert_player_matches from public, anon, authenticated;
