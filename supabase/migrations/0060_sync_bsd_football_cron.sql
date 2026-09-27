-- Dedicated reliable fixture job for Süper Lig + Europa League. Reuses the
-- existing sync-events Authorization header inside Postgres; no secret is
-- copied into source control or exposed to clients.

do $$
declare
  base_command text;
begin
  select command into base_command
  from cron.job
  where jobname = 'sync-events-every-6h';

  if base_command is null then
    raise exception 'sync-events cron command unavailable';
  end if;

  perform cron.schedule(
    'sync-bsd-football-every-6h',
    '15 */6 * * *',
    replace(base_command, '/sync-events', '/sync-bsd-football')
  );
end $$;
