# Edge Functions

## sync-events

Pulls upcoming fixtures (next 14 days) for every league in the catalog via
the provider abstraction in `src/services/providers/` (TheSportsDB primary,
ESPN hidden API fallback) and upserts them into `events`.

### Deploy

```bash
supabase functions deploy sync-events
supabase secrets set SYNC_SECRET=<random-string>
```

### Schedule (every 30 minutes) with pg_cron

Each run syncs one eighth of the leagues (TheSportsDB free tier allows 30
requests/min and the function has a ~150s wall clock budget, so a full scan
doesn't fit in one invocation), so the whole catalog refreshes every 4 hours.
Run in the SQL editor (replace `<project-ref>` and `<random-string>`):

```sql
select cron.schedule(
  'sync-events',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-events',
    headers := jsonb_build_object('Authorization', 'Bearer <random-string>')
  );
  $$
);
```

Both `pg_cron` and `pg_net` must be enabled (Dashboard → Database → Extensions).
