import type { SessionEntry, SessionResults } from './types.ts';

/**
 * Motorsport session results from ESPN's hidden APIs.
 *
 * The public scoreboard (site.api) locates the Grand Prix by date; the core
 * API (sports.core.api) then exposes each session (Free Practice, Qualifying,
 * Sprint, Race) with a full classification. Unofficial + undocumented, so every
 * call degrades to null on any error and the caller treats that as "no results
 * yet".
 */

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/racing';
const CORE = 'https://sports.core.api.espn.com/v2/sports/racing/leagues';

// ESPN only exposes Formula 1 on these endpoints today (MotoGP is absent).
const LEAGUE_SLUG: Record<string, string> = { f1: 'f1' };

interface EspnRef {
  $ref: string;
}

interface ScoreboardEvent {
  id: string;
  date: string;
}

/** Maps an event title to the ESPN session type label it should match. */
function sessionFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('sprint') && t.includes('shootout')) return 'Sprint Shootout';
  if (t.includes('sprint')) return 'Sprint Race';
  if (t.includes('qualifying') || t.includes('qualify')) return 'Qualifying';
  if (t.includes('practice') || /\bfp\d\b/.test(t)) return 'Free Practice';
  return 'Race';
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Finds the ESPN Grand Prix event id whose weekend contains `startsAtUtc`. */
async function resolveGrandPrix(
  slug: string,
  startsAtUtc: string,
): Promise<string | null> {
  const start = new Date(startsAtUtc);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const from = new Date(start.getTime() - 4 * 86_400_000);
  const to = new Date(start.getTime() + 4 * 86_400_000);
  const data = await getJson<{ events?: ScoreboardEvent[] }>(
    `${SITE}/${slug}/scoreboard?dates=${fmt(from)}-${fmt(to)}`,
  );
  const events = data?.events ?? [];
  if (events.length === 0) return null;
  // Closest event to the session date.
  events.sort(
    (a, b) =>
      Math.abs(new Date(a.date).getTime() - start.getTime()) -
      Math.abs(new Date(b.date).getTime() - start.getTime()),
  );
  return events[0].id;
}

async function classification(competitionRef: string): Promise<SessionEntry[]> {
  const comp = await getJson<{ competitors?: EspnRef[] }>(competitionRef);
  const refs = comp?.competitors ?? [];

  const rows = await Promise.all(
    refs.map(async (r) => {
      const c = await getJson<{
        order?: number;
        athlete?: EspnRef;
        vehicle?: { manufacturer?: string };
      }>(r.$ref);
      if (!c) return null;
      const athlete = c.athlete
        ? await getJson<{ displayName?: string }>(c.athlete.$ref)
        : null;
      const name = athlete?.displayName;
      if (!name || !c.order) return null;
      return {
        position: c.order,
        name,
        team: c.vehicle?.manufacturer ?? null,
      };
    }),
  );

  return rows
    .filter((r): r is SessionEntry => r !== null)
    .sort((a, b) => a.position - b.position);
}

/**
 * Classification for the session an event represents (F1 only for now).
 * Returns null when ESPN doesn't cover the series, the weekend isn't found, or
 * the session hasn't run yet.
 */
export async function fetchRacingResults(params: {
  sportId: string;
  title: string;
  startsAtUtc: string;
}): Promise<SessionResults | null> {
  const slug = LEAGUE_SLUG[params.sportId];
  if (!slug) return null;

  const gpId = await resolveGrandPrix(slug, params.startsAtUtc);
  if (!gpId) return null;

  const wanted = sessionFromTitle(params.title);
  const list = await getJson<{ items?: EspnRef[] }>(
    `${CORE}/${slug}/events/${gpId}/competitions?limit=50`,
  );
  const items = list?.items ?? [];

  for (const item of items) {
    const comp = await getJson<{ type?: { text?: string } }>(item.$ref);
    const type = comp?.type?.text;
    if (!type) continue;
    // "Sprint Race"/"Sprint Shootout" match exactly; others match loosely.
    if (type === wanted || (wanted === 'Race' && type === 'Race')) {
      const entries = await classification(item.$ref);
      if (entries.length === 0) return null;
      return { session: type, entries };
    }
  }
  return null;
}
