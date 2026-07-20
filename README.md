# SportPulse

Sports event reminders. SportPulse shows **which event, when, and on which
channel**, plus local reminders so you never miss kickoff.

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
targets/
  widget/         iOS WidgetKit extension (next-event widget + Live Activity UI)
modules/
  live-activity/  Local Expo module to start/stop the countdown Live Activity
```

## Getting started

1. `npm install` (Node 22+ recommended; Node 20 lacks native WebSocket for the web build)
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

## iOS widget & Live Activity

The home-screen widget (next followed event + countdown) and the Dynamic
Island / lock-screen Live Activity live in `targets/widget` (Swift, via
`@bacons/apple-targets`) and `modules/live-activity`. They only work in an
iOS **dev build** — not in Expo Go or on web/Android, where all calls no-op.

To build:

1. Add your Apple Team ID to `app.json` → `ios.appleTeamId`.
2. `npx expo prebuild -p ios` (the widget target is generated automatically).
3. Build with EAS (`eas build -p ios`) or Xcode. The App Group
   `group.com.sportpulse.app` must be enabled for the bundle id in your Apple
   Developer account.

The app mirrors the next upcoming event into the App Group
(`src/features/events/hooks/use-next-event-widget.ts`); the event detail
screen offers a "Live countdown" button that starts the Live Activity.

> Not yet verified on a real device/simulator — written on Linux where iOS
> builds are unavailable.

## Roadmap

- Verify the widget + Live Activity on a real iOS dev build.
