# SportPulse E2E Test Plan (Expo web, localhost:8081)

Setup done: expo web running under Node 22 (Node 20 crashes SSR with supabase realtime-js "Node.js 20 detected without native WebSocket support" — report as bug/env note).

## 1. Onboarding + Sign up
- Swipe through 3 onboarding screens via "İleri"; last screen leads to sign-up/login.
- Sign up with sportpulse-test+1@example.com / password `SportPulse!123`, name "Test User".
- Pass: either logged in directly, or "check inbox" → confirm via Supabase mgmt API then sign in.

## 2. Setup flow
- First login redirects to /setup. Pick country TR; follow Tennis (sport), UFC, Süper Lig, WTA, ATP leagues; press Done.
- Pass: lands on Home tabs.

## 3. Home "Bu Hafta"
- Pass: events grouped by day with league name, local time, countdown, channel names; OR empty state if no events in next 7 days (then verify WTA/ATP follow brings events if available).

## 4. Event detail
- Open an event card. Pass: shows channels, reminder times card, "Takvime ekle (.ics)" button; clicking it does not crash (share/download).

## 5. Explore tab
- Toggle a league follow off then on (visual state changes and persists after tab switch). Team search box: type a team name, results appear or empty state — no crash.

## 6. Settings
- Reminder offsets: toggle "1 saat" chip off/on → active style changes; reload page, state persisted (Supabase).
- Quiet hours: enter 25:99 / 08:00, Save → alert with time-format message; enter 23:00 / 08:00 → "Saved" alert; reload persists.
- Country picker present; Language switch TR↔EN changes UI strings (e.g. "Bu Hafta"↔"This Week"); Theme dark switch changes background; Logout returns to login screen.

## 7. Profile tab
- Shows name; edit name to "Test User 2", save; reload shows new name.
