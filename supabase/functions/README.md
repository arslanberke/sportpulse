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

### Schedule (every 6 hours) with pg_cron

Run in the SQL editor (replace `<project-ref>` and `<random-string>`):

```sql
select cron.schedule(
  'sync-events',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-events',
    headers := jsonb_build_object('Authorization', 'Bearer <random-string>')
  );
  $$
);
```

Both `pg_cron` and `pg_net` must be enabled (Dashboard → Database → Extensions).
