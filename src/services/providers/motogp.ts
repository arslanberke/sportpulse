import type { SessionEntry, SessionResults } from './types.ts';

/**
 * MotoGP session results from the official motogp.com data API (pulselive).
 *
 * This is the same structured JSON that powers motogp.com — far more stable
 * than scraping a results page. The chain is: season (by year) → event (by
 * race weekend) → category (premier MotoGP class) → session (by type) →
 * classification. Degrades to null on any miss so the caller shows "no
 * results yet".
 */

const BASE = 'https://api.motogp.pulselive.com/motogp/v1/results';
const UA = 'Mozilla/5.0';

interface Season {
  id: string;
  year: number;
}

interface PulseEvent {
  id: string;
  date_start: string; // 'YYYY-MM-DD'
  date_end: string;
}

interface Category {
  id: string;
  name: string;
}

interface Session {
  id: string;
  type: string; // 'FP' | 'PR' | 'Q' | 'SPR' | 'WUP' | 'RAC'
  number: number | null;
}

interface ClassificationRow {
  position: number | null;
  rider?: { full_name?: string };
  team?: { name?: string };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Maps an event title to the pulselive session type + optional number. */
function sessionFromTitle(title: string): { type: string; number: number | null } {
  const t = title.toLowerCase();
  if (t.includes('sprint')) return { type: 'SPR', number: null };
  if (t.includes('warm')) return { type: 'WUP', number: null };
  if (t.includes('qualifying') || t.includes('qualify') || /\bq\d?\b/.test(t)) {
    const m = t.match(/q\s*([12])/);
    return { type: 'Q', number: m ? Number(m[1]) : 2 };
  }
  if (t.includes('practice') || /\bfp\s*\d\b/.test(t)) {
    const m = t.match(/(?:practice|fp)\s*([123])/);
    return m ? { type: 'FP', number: Number(m[1]) } : { type: 'PR', number: null };
  }
  return { type: 'RAC', number: null };
}

function withinWeekend(ev: PulseEvent, target: Date): boolean {
  const start = new Date(`${ev.date_start}T00:00:00Z`).getTime() - 86_400_000;
  const end = new Date(`${ev.date_end}T23:59:59Z`).getTime() + 86_400_000;
  const t = target.getTime();
  return t >= start && t <= end;
}

export async function fetchMotoGpResults(params: {
  title: string;
  startsAtUtc: string;
}): Promise<SessionResults | null> {
  const target = new Date(params.startsAtUtc);

  const seasons = await getJson<Season[]>(`${BASE}/seasons`);
  const season = seasons?.find((s) => s.year === target.getUTCFullYear());
  if (!season) return null;

  const events = await getJson<PulseEvent[]>(
    `${BASE}/events?seasonUuid=${season.id}&isFinished=true`,
  );
  const event = events?.find((e) => withinWeekend(e, target));
  if (!event) return null;

  const categories = await getJson<Category[]>(
    `${BASE}/categories?eventUuid=${event.id}`,
  );
  const category = categories?.find((c) => /motogp/i.test(c.name));
  if (!category) return null;

  const sessions = await getJson<Session[]>(
    `${BASE}/sessions?eventUuid=${event.id}&categoryUuid=${category.id}`,
  );
  const want = sessionFromTitle(params.title);
  const session =
    sessions?.find(
      (s) => s.type === want.type && (want.number == null || s.number === want.number),
    ) ?? sessions?.find((s) => s.type === want.type);
  if (!session) return null;

  const data = await getJson<{ classification?: ClassificationRow[] }>(
    `${BASE}/session/${session.id}/classification?test=false`,
  );
  const rows = data?.classification ?? [];
  const entries: SessionEntry[] = rows
    .filter((r): r is ClassificationRow & { position: number } => r.position != null)
    .map((r) => ({
      position: r.position,
      name: r.rider?.full_name ?? '',
      team: r.team?.name ?? null,
    }))
    .filter((e) => e.name.length > 0)
    .sort((a, b) => a.position - b.position);

  if (entries.length === 0) return null;
  const label = { SPR: 'Sprint', Q: 'Qualifying', FP: 'Practice', PR: 'Practice', WUP: 'Warm Up', RAC: 'Race' }[session.type] ?? 'Race';
  return { session: label, entries };
}
