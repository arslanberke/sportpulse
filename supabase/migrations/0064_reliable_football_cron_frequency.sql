-- The broad legacy sync still touches these leagues and can overwrite their
-- health state with ESPN 403. Run the reliable BSD job shortly after each
-- half-hour cycle; 10 leagues × 48 runs = 480 BSD requests/day, comfortably
-- below the verified 7,500/day free quota. GOAL is called only on fallback.

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='sync-bsd-football-every-6h';
  if v_jobid is null then raise exception 'reliable football cron missing'; end if;
  perform cron.alter_job(v_jobid, schedule := '10,40 * * * *');
end $$;
