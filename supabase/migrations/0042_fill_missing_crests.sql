-- Eksik armayi yalnizca ad dogrulanirsa yaz.
--
-- Fikstur ucu her kulup icin arma vermiyor; eksikler ad aramasiyla kapatiliyor.
-- Ama arama benzer adli baska bir kulubu dondurebilir ve yanlis arma, eksik
-- armadan kotudur. Bu yuzden yazma kararini veritabani veriyor: ad
-- sadelestirmesi (`fold_team_name`) ve takma adlar burada.
--
-- Ad tutmuyorsa arma yazilmaz, yer tutucu kalir. Boylece "Inter Club
-- d'Escaldes" gibi kaynagin farkli yazdigi kuluplerde bir sey kaybetmeden
-- guvende kaliyoruz; o cift gerekirse takma ad olarak eklenir.

create or replace function public.set_team_crest(
  p_team_id uuid,
  p_found_name text,
  p_crest_url text
) returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_ok boolean;
begin
  select team_name_matches(p_team_id, p_found_name) into v_ok;
  if not coalesce(v_ok, false) then
    return false;
  end if;

  -- Yalnizca gercekten eksik olan doldurulur; mevcut arma ezilmez.
  update teams
     set logo_url = coalesce(logo_url, p_crest_url),
         logo_source_url = coalesce(logo_source_url, p_crest_url)
   where id = p_team_id
     and logo_url is null;

  return true;
end;
$$;

revoke execute on function public.set_team_crest from public, anon, authenticated;
