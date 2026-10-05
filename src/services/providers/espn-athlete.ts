import { PROVIDER_USER_AGENT } from './log.ts';

export interface BasketballSeason {
  season: string;
  teamName: string | null;
  teamLogoUrl: string | null;
  games: string;
  minutes: string;
  points: string;
  rebounds: string;
  assists: string;
}

export interface BasketballGame {
  espnEventId: string;
  date: string;
  opponent: string;
  opponentLogoUrl: string | null;
  home: boolean;
  result: string | null;
  score: string | null;
  minutes: string;
  points: string;
  rebounds: string;
  assists: string;
}

export interface BasketballPlayer {
  id: string;
  name: string;
  jersey: string | null;
  position: string | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  photoUrl: string | null;
  age: number | null;
  birthDate: string | null;
  birthPlace: string | null;
  heightCm: number | null;
  weightKg: number | null;
  draft: string | null;
  summary: { label: string; value: string }[];
  seasons: BasketballSeason[];
  games: BasketballGame[];
}

const BASE = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball';

interface EspnLogo { href: string }
interface EspnBio {
  athlete?: {
    id: string;
    displayName: string;
    jersey?: string;
    position?: { displayName?: string; abbreviation?: string };
    team?: { displayName?: string; logos?: EspnLogo[] };
    headshot?: { href?: string };
    age?: number;
    displayDOB?: string;
    displayBirthPlace?: string;
    displayHeight?: string;
    displayWeight?: string;
    displayDraft?: string;
    statsSummary?: { statistics?: { abbreviation: string; displayValue: string }[] };
  };
}
interface EspnStatCategory {
  name: string;
  names: string[];
  statistics?: { teamSlug?: string; season?: { displayName?: string }; stats: string[] }[];
}
interface EspnStats {
  categories?: EspnStatCategory[];
  teams?: Record<string, { displayName?: string; logos?: EspnLogo[] }>;
}
interface EspnGameLog {
  names?: string[];
  events?: Record<string, {
    id: string;
    gameDate: string;
    atVs?: string;
    gameResult?: string;
    score?: string;
    opponent?: { displayName?: string; abbreviation?: string; logo?: string };
  }>;
  seasonTypes?: { categories?: { events?: { eventId: string; stats: string[] }[] }[] }[];
}

async function get<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: { 'User-Agent': PROVIDER_USER_AGENT } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ESPN athlete ${res.status}`);
  return (await res.json()) as T;
}

/** ESPN's resizer serves a small headshot instead of the full PNG. */
function headshot(href: string | undefined): string | null {
  if (!href) return null;
  const path = href.replace(/^https?:\/\/a\.espncdn\.com/, '');
  return path.startsWith('/') ? `https://a.espncdn.com/combiner/i?img=${path}&w=200&h=146` : href;
}

/** `6' 9"` → 206. */
export function feetToCm(display: string | undefined): number | null {
  const m = display?.match(/(\d+)'\s*(\d+)?/);
  if (!m) return null;
  return Math.round((Number(m[1]) * 12 + Number(m[2] ?? 0)) * 2.54);
}

/** `250 lbs` → 113. */
export function lbsToKg(display: string | undefined): number | null {
  const m = display?.match(/(\d+)\s*lbs/);
  return m ? Math.round(Number(m[1]) * 0.4536) : null;
}

/** `30/12/1984` → ISO date. */
function dob(display: string | undefined): string | null {
  const m = display?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function parseSeasons(stats: EspnStats | null): BasketballSeason[] {
  const avg = stats?.categories?.find((c) => c.name === 'averages');
  if (!avg) return [];
  const at = (row: string[], key: string) => row[avg.names.indexOf(key)] ?? '–';
  return (avg.statistics ?? [])
    .map((s) => {
      const team = s.teamSlug ? stats?.teams?.[s.teamSlug] : undefined;
      return {
        season: s.season?.displayName ?? '',
        teamName: team?.displayName ?? null,
        teamLogoUrl: team?.logos?.[0]?.href ?? null,
        games: at(s.stats, 'gamesPlayed'),
        minutes: at(s.stats, 'avgMinutes'),
        points: at(s.stats, 'avgPoints'),
        rebounds: at(s.stats, 'avgRebounds'),
        assists: at(s.stats, 'avgAssists'),
      };
    })
    .reverse();
}

export function parseGames(log: EspnGameLog | null, limit = 10): BasketballGame[] {
  if (!log?.events || !log.names) return [];
  const names = log.names;
  const lines = new Map<string, string[]>();
  for (const type of log.seasonTypes ?? []) {
    for (const cat of type.categories ?? []) {
      for (const e of cat.events ?? []) lines.set(e.eventId, e.stats);
    }
  }
  const at = (row: string[] | undefined, key: string) => row?.[names.indexOf(key)] ?? '–';
  return Object.values(log.events)
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate))
    .slice(0, limit)
    .map((e) => {
      const row = lines.get(e.id);
      return {
        espnEventId: e.id,
        date: e.gameDate,
        opponent: e.opponent?.displayName ?? e.opponent?.abbreviation ?? '–',
        opponentLogoUrl: e.opponent?.logo ?? null,
        home: e.atVs !== '@',
        result: e.gameResult ?? null,
        score: e.score ?? null,
        minutes: at(row, 'minutes'),
        points: at(row, 'points'),
        rebounds: at(row, 'totalRebounds'),
        assists: at(row, 'assists'),
      };
    });
}

/** Basketball player bio, season averages and recent games from ESPN. */
export async function fetchBasketballPlayer(league: string, espnId: string): Promise<BasketballPlayer | null> {
  const id = encodeURIComponent(espnId);
  const [bio, stats, log] = await Promise.all([
    get<EspnBio>(`${BASE}/${league}/athletes/${id}`),
    get<EspnStats>(`${BASE}/${league}/athletes/${id}/stats`).catch(() => null),
    get<EspnGameLog>(`${BASE}/${league}/athletes/${id}/gamelog`).catch(() => null),
  ]);
  const a = bio?.athlete;
  if (!a) return null;
  return {
    id: a.id,
    name: a.displayName,
    jersey: a.jersey ?? null,
    position: a.position?.abbreviation ?? null,
    teamName: a.team?.displayName ?? null,
    teamLogoUrl: a.team?.logos?.[0]?.href ?? null,
    photoUrl: headshot(a.headshot?.href),
    age: a.age ?? null,
    birthDate: dob(a.displayDOB),
    birthPlace: a.displayBirthPlace ?? null,
    heightCm: feetToCm(a.displayHeight),
    weightKg: lbsToKg(a.displayWeight),
    draft: a.displayDraft ?? null,
    summary: (a.statsSummary?.statistics ?? []).map((s) => ({ label: s.abbreviation, value: s.displayValue })),
    seasons: parseSeasons(stats),
    games: parseGames(log),
  };
}
