-- Baslama saati gecmis ama sonucu olmayan maclar.
--
-- events.status bilerek scheduled/postponed/cancelled ile sinirli (0061:
-- hatirlatici iptali bu alana bagli); sonuc home_score/away_score ve
-- result_status'ta tutulur. Bu migration status'a dokunmaz.
--
-- Kok neden: sync-bsd-football skorlari
--   supabase.from('events').upsert([{ id, home_score, away_score, result_status }], { onConflict: 'id' })
-- ile yaziyordu. Bu bir INSERT ... ON CONFLICT DO UPDATE'tir; Postgres
-- eklenecek satiri once NOT NULL kurallarina gore denetler ve sport_id null
-- oldugu icin her cagri 23502 ile dusuyordu. Hata kontrol edilmedigi icin 20
-- Eylul'den beri hicbir skor yazilmadi. sync-events (ESPN/TheSportsDB) ise
-- hic skor yazmiyordu.
--
-- Bu fonksiyon mevcut satirlari id ile GUNCELLER (insert yok, sport_id
-- gerekmez) ve kac satirin yazildigini doner; cagiran hatayi ve sayiyi
-- kontrol eder. Bitmis bir sonuc, sonradan gelen bitmemis bir durumla
-- (ornegin ikinci kaynagin "notstarted"i) geri alinmaz; null skor mevcut
-- skoru silmez.
--
-- Saglayicidan sonuc cekme isi Edge Function'larda (BSD/ESPN anahtarlari
-- yalnizca orada). Geri donus: supabase/rollback/0068_0070_rollback.sql

create or replace function public.set_event_results(p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with input as (
    select (r ->> 'id')::uuid id,
           nullif(r ->> 'home_score', '')::int home_score,
           nullif(r ->> 'away_score', '')::int away_score,
           lower(nullif(r ->> 'result_status', '')) result_status
      from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
     where r ? 'id'
  ), resolved as (
    -- Birlestirilmis bir kopyaya gelen sonuc asil kayda yazilir.
    select coalesce(e.merged_into_event_id, e.id) id, i.home_score, i.away_score, i.result_status
      from input i join events e on e.id = i.id
  )
  update events e set
    home_score = coalesce(r.home_score, e.home_score),
    away_score = coalesce(r.away_score, e.away_score),
    result_status = case
      when e.result_status = 'finished' and coalesce(r.result_status, '') <> 'finished' then e.result_status
      else coalesce(r.result_status, e.result_status) end,
    updated_at = now()
    from (select distinct on (id) * from resolved order by id, (home_score is not null) desc) r
   where e.id = r.id
     and (r.home_score is not null or r.result_status is not null);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.set_event_results(jsonb) from public, anon, authenticated;
grant execute on function public.set_event_results(jsonb) to service_role;

-- Sonuc doldurmanin hedefi: baslamis, takimli, birlestirilmemis, sonucu
-- olmayan maclar. Edge Function ve rapor ayni tanimi kullanir.
create or replace function public.events_missing_result(p_limit int default 500)
returns table (id uuid, sport_id text, league_id uuid, starts_at timestamptz, external_ids jsonb)
language sql stable security definer set search_path = public as $$
  select e.id, e.sport_id, e.league_id, e.starts_at, e.external_ids
    from events e
   where e.merged_into_event_id is null
     and e.status = 'scheduled'
     and e.home_team_id is not null and e.away_team_id is not null
     and e.home_score is null
     and coalesce(e.result_status, '') <> 'finished'
     and coalesce(e.ends_at, e.starts_at) < now() - interval '3 hours'
   order by e.starts_at desc
   limit p_limit;
$$;
revoke all on function public.events_missing_result(int) from public, anon, authenticated;
grant execute on function public.events_missing_result(int) to service_role;
