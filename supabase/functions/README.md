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

## sync-teams

Fills the `teams` catalog from each league's member list, so a league shows its
clubs even between seasons or before any fixture is published. Without it teams
only exist as a by-product of `sync-events` and the follow screens look empty.

### Deploy

```bash
supabase functions deploy sync-teams --no-verify-jwt
```

`--no-verify-jwt` matters: pg_cron authenticates with `SYNC_SECRET`, not a user
JWT, so with the platform gate on every call is rejected with
`UNAUTHORIZED_INVALID_JWT_FORMAT` before the function runs. The function checks
the secret itself.

### Schedule (daily) with pg_cron

Squads change once or twice a year, so a quarter of the catalog per run (every
6 hours) refreshes everything daily:

```sql
select cron.schedule(
  'sync-teams',
  '15 */6 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-teams',
    headers := jsonb_build_object('Authorization', 'Bearer <random-string>')
  );
  $$
);
```

To backfill everything at once, invoke it four times with `?chunk=0..3`, or a
single league with `?league=<league-uuid>`.

## mirror-logos

Copies team crests into the public `team-logos` storage bucket and repoints
`teams.logo_url` at our copy. A third of the crests live on
`upload.wikimedia.org`, which rate limits (HTTP 429) and asks apps not to
hotlink — mirrored once, they load reliably and cost the upstream nothing.

`teams.logo_source_url` keeps the provider's URL; a crest is re-copied only
when that value changes, so steady state does no work.

### Deploy

```bash
supabase functions deploy mirror-logos --no-verify-jwt
```

### Schedule (every 20 minutes) with pg_cron

Each run takes 40 crests, enough to clear a fresh league within the hour:

```sql
select cron.schedule(
  'mirror-logos',
  '*/20 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/mirror-logos',
    headers := jsonb_build_object('Authorization', 'Bearer <random-string>'),
    timeout_milliseconds := 150000
  );
  $$
);
```

Pass `?limit=<n>` to work through a backlog faster.

## sync-broadcasts

Turkiye'deki yayin kanallarini mac bazinda yazar.

Kanal bilgisi lig basina sabit bir eslemeden geliyordu ("UEFA kupalari -> TRT 1,
TABii"). Bu varsayim Turk takimlarinin Avrupa maclarinda yaniliyor: yayin hakki
lig genelinde TRT'de olsa da Fenerbahce - Sturm Graz ve Hradec Kralove -
Besiktas TV100'de yayinlandi.

Kaynak (`src/services/providers/sporekrani.ts`) gunun yayin akisini takim
adlari ve kanallariyla veriyor. Eslesen maclara `event_broadcasts` uzerinden
kanal yazilir ve bu kayit lig eslemesini gecersiz kilar; eslesmeyenler lig
eslemesiyle gosterilmeye devam eder, yani kaynak bozulursa uygulama eski
davranisina doner.

Iki sinir var. Kaynak yalnizca icinde bulunulan gunu veriyor (tarih parametresi,
tarih bazli adres ve API uc noktasi denendi, hepsi ayni gunu donduruyor), bu
yuzden is gun icinde birkac kez calisir. Ve eslestirme tam ad esitligine dayanir:
kaynak Turkce yaziyor ("Dinamo Kiev", "Karabağ"), katalog ozgun yazimi tutuyor
("Dynamo Kyiv", "FK Qarabag"), bu ciftler eslesmiyor. Trigram benzerligi cozum
degil: dogru cift 0.26 verirken alakasiz bir cift (Angers / Queens Park Rangers)
0.23 veriyor, yani ayirt edilemiyor.

### Schedule (every 4 hours) with pg_cron

```sql
select cron.schedule(
  'sync-broadcasts',
  '10 */4 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-broadcasts',
    headers := jsonb_build_object('Authorization', 'Bearer <random-string>'),
    timeout_milliseconds := 150000
  );
  $$
);
```
