---
name: testing-sportpulse
description: How to run and E2E-test the SportPulse Expo app on web against the live Supabase backend
---

# Testing SportPulse (Expo web)

## Run the app
- Use **Node ≥22** (`nvm use 22`). Node 20 crashes expo web SSR with `Node.js 20 detected without native WebSocket support` from `@supabase/realtime-js` at `createClient` (src/services/supabase.ts).
- `cd repo && npx expo start --web --port 8081`, open `http://localhost:8081` in Chrome. `.env` already contains `EXPO_PUBLIC_SUPABASE_URL` + anon key.

## Auth gotchas
- Supabase rejects `@example.com` emails as invalid — use a gmail-style address.
- Signup requires **email confirmation**; sign-in fails with "Email not confirmed" until confirmed. Confirm via Supabase management API (needs a valid `sbp_` management token): `POST https://api.supabase.com/v1/projects/<ref>/database/query` with `{"query":"update auth.users set email_confirmed_at = now() where email = '...'"}`. Existing confirmed test user: `sportpulse.tester1@gmail.com` / `SportPulse!123`.
- First login with no follows redirects to `/setup`; after follows exist it goes to Home.

## Navigation map
- Routes: `/onboarding`, `/login`, `/sign-up`, `/setup`, `/` (This Week), `/explore`, `/profile`, `/settings`, `/event/[id]`.
- Settings is reached via the "Ayarlar/Settings" link at top-right of Home, not the tab bar.
- Alerts on web are native `window.alert` dialogs (quiet-hours validation, saved confirmation).

## Known issues / quirks
- Dark mode is class-based (tailwind `darkMode: 'class'`): `src/lib/theme.ts` toggles a `dark` class on `<html>` on web, and the dark CSS vars live under `.dark:root` in `src/global.css`. The in-app Light/Dark buttons work on web. To test the "System" preference, emulate OS dark mode via devtools (Ctrl+Shift+P → "Emulate CSS prefers-color-scheme: dark") — note the emulation resets when devtools closes.
- After git pull triggers HMR, a stale browser tab can stop accepting keyboard input into RN-web TextInputs; open a fresh tab as a workaround.
- Only next-7-days events show on Home; WTA/ATP/UFC follows usually have near-term events.

## Devin Secrets Needed
- A valid Supabase management token (`sbp_...`) for the project, to confirm test-user emails.
