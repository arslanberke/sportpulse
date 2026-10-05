-- Every 4 h left after-midnight matches on league-default channels for hours.
-- One sporekrani page request per run, so hourly is cheap.

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='sync-broadcasts';
  if v_jobid is null then raise exception 'sync-broadcasts cron missing'; end if;
  perform cron.alter_job(v_jobid, schedule := '10 * * * *');
end $$;
