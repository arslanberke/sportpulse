# SportPulse

Spoiler-free sports event reminders. SportPulse never shows scores or live
results — only **which event, when, and on which channel**, plus local
reminders so you never miss kickoff (and never see the score first).

iOS-first, built with Expo / React Native.

## Features

- **Follow** sports (football, NBA, F1, MotoGP, UFC, tennis, volleyball),
  leagues (Süper Lig, Premier League, Champions League, …) and teams.
- **This Week**: card list of upcoming events for your follows — poster,
  local time, countdown and TV channel. All times are stored in UTC and
  rendered in your device timezone (travel-safe).
- **Event detail**: channel info, "add to calendar" (.ics export), your
  exact reminder times.
- **Reminders**: multiple offsets (15 min / 1 h / 3 h / 1 day), quiet hours
  (reminders inside the window are delayed to its end), scheduled locally
  with expo-notifications.
- **Live fixture updates**: a Supabase Edge Function syncs fixtures on a
  schedule; postponements and time changes stream to the app via Supabase
  Realtime and reminders reschedule automatically.
- **TR/EN** localization, light/dark theme.

## Tech stack

| Tool | What it does |
| --- | --- |
| **Expo (React Native)** + **Expo Router** | One TypeScript codebase, file-based navigation. |
| **Supabase** | Auth, Postgres, Realtime, Edge Functions. |
| **React Query** / **Zustand** | Server cache / tiny client state. |
| **React Hook Form + Zod** | Forms and validation. |
| **NativeWind** | Tailwind-style styling. |
| **expo-notifications** | Local reminders + push. |

## Data sources

Fixture data is fetched **server-side** by the `sync-events` Edge Function
through a provider abstraction (`src/services/providers/`):

1. **TheSportsDB** (free tier) — primary. Day-by-day scan of the next 14
   days per league to work around free-tier row limits.
2. **ESPN hidden API** (site.api.espn.com) — fallback; unofficial and can
   break at any time.

Broadcast channels for Turkey come from a static league→channel mapping in
the database (`league_channels`), since free APIs have poor TR broadcaster
data. Event-specific overrides live in `event_broadcasts`.

## Folder structure

```
src/
  app/            Screens (Expo Router): (auth) login/sign-up, (app) tabs
  features/       events, follows, catalog, settings, notifications, auth
  services/       Supabase queries + providers/ (fixture provider abstraction)
  components/ui/  Reusable UI pieces
  lib/            i18n, dates, ics export, theme
supabase/
  migrations/     Schema, RLS, seeds (sports/leagues/channels), upsert_event
  functions/      sync-events Edge Function (scheduled fixture sync)
```

## Getting started

1. `npm install`
2. Create a Supabase project, run the migrations (`supabase db push`).
3. Copy `.env.example` to `.env` and fill in
   `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy + schedule the sync function — see `supabase/functions/README.md`.
5. `npm start`

## Checks

```bash
npm run lint
npx tsc --noEmit
```

## Roadmap

- iOS home-screen widget ("next event + countdown") and Live Activity /
  Dynamic Island countdown (requires a dev build + config plugins).
- Country-specific channel mappings beyond Turkey.
- Push notifications on fixture changes from the server (Expo push via
  `push_tokens`).
