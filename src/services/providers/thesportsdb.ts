import { fetchProvider, warnHttp, type ReportProviderIssue } from './log.ts';
import type {
    EventLineup,
    FixtureProvider,
    LeagueRef,
    LineupPlayer,
    ProviderEvent,
    ProviderTeam,
} from './types.ts';

/**
 * TheSportsDB — primary provider.
 *
 * Free tier (key "3"): ~30 requests/min and each list endpoint returns only
 * a handful of rows, so instead of "next N events per league" we scan day by
 * day (`eventsday.php`) which is not truncated, filtering by league id.
 * https://www.thesportsdb.com/free_sports_api
 */

const API_KEY = '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

/**
 * Kaynagin brans adlari bizim kimliklerimizle ayni degil ("Soccer" / football).
 * Arama sonucunu bransa gore suzmek icin gerekli: ayni ad birden fazla bransta
 * gecebiliyor ve yanlis bransin armasi yazilabilir.
 */
const SPORT_NAMES: Record<string, string> = {
  football: 'Soccer',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  f1: 'Motorsport',
  motogp: 'Motorsport',
  ufc: 'Fighting',
};

interface TsdbEvent {
  idEvent: string;
  strEvent: string;
  strTimestamp: string | null; // '2026-08-16T17:00:00' (UTC, no zone suffix)
  dateEvent: string | null;
  strTime: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  idHomeTeam: string | null;
  idAwayTeam: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strThumb: string | null;
  strPoster: string | null;
  strStatus: string | null;
  idLeague: string;
  idVenue: string | null;
  strVenue: string | null;
}

interface TsdbVenue {
  strThumb: string | null;
}

interface TsdbTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  /** Other spellings, separated by commas, e.g. "Ajax, AFC Ajax". */
  strTeamAlternate?: string | null;
  strTeamShort?: string | null;
  /** '0' when unknown; otherwise the club's id at ESPN. */
  idESPN?: string | null;
  // A club lists every competition it plays in as idLeague..idLeague7.
  [key: string]: string | null | undefined;
}

/** True when the club lists this competition among its leagues. */
function teamPlaysIn(team: TsdbTeam, leagueId: string): boolean {
  for (const suffix of ['', '2', '3', '4', '5', '6', '7']) {
    if (team[`idLeague${suffix}`] === leagueId) return true;
  }
  return false;
}

interface TsdbLineupRow {
  idPlayer: string;
  strPlayer: string;
  strPosition: string | null;
  strHome: string | null; // 'Yes' | 'No'
  strSubstitute: string | null; // 'Yes' | 'No'
  intSquadNumber: string | null;
  strCutout: string | null;
  strThumb: string | null;
}

function normalizeLineupRow(row: TsdbLineupRow): LineupPlayer {
  const number = row.intSquadNumber ? Number(row.intSquadNumber) : null;
  return {
    id: row.idPlayer,
    name: row.strPlayer,
    number: Number.isFinite(number) ? number : null,
    position: row.strPosition || null,
    isSubstitute: (row.strSubstitute ?? '').toLowerCase() === 'yes',
    photoUrl: row.strCutout || row.strThumb || null,
    isCaptain: false,
    countryCode: null,
    grid: null,
  };
}

/** Starters first, then subs; within each, by squad number ascending. */
function sortLineup(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => {
    if (a.isSubstitute !== b.isSubstitute) return a.isSubstitute ? 1 : -1;
    return (a.number ?? 99) - (b.number ?? 99);
  });
}

function toUtcIso(event: TsdbEvent): string | null {
  if (event.strTimestamp) return `${event.strTimestamp.replace(' ', 'T')}Z`;
  if (event.dateEvent && event.strTime) return `${event.dateEvent}T${event.strTime}Z`;
  return null;
}

function normalize(event: TsdbEvent, venueImageUrl: string | null): ProviderEvent | null {
  const startsAtUtc = toUtcIso(event);
  if (!startsAtUtc) return null;
  return {
    externalId: event.idEvent,
    provider: 'thesportsdb',
    title: event.strEvent,
    startsAtUtc,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
    homeTeamExternalId: event.idHomeTeam || null,
    awayTeamExternalId: event.idAwayTeam || null,
    homeTeamLogoUrl: event.strHomeTeamBadge || null,
    awayTeamLogoUrl: event.strAwayTeamBadge || null,
    imageUrl: event.strThumb || event.strPoster || null,
    venue: event.strVenue || null,
    venueImageUrl,
    postponed: (event.strStatus ?? '').toLowerCase().includes('postponed'),
  };
}

/** Sports where the venue (circuit) image is worth an extra lookup. */
const VENUE_IMAGE_SPORTS = new Set(['f1', 'motogp']);

const venueImageCache = new Map<string, string | null>();

async function venueImage(venueId: string | null, onIssue?: ReportProviderIssue): Promise<string | null> {
  if (!venueId) return null;
  const cached = venueImageCache.get(venueId);
  if (cached !== undefined) return cached;
  const data = (await getJson(`${BASE}/lookupvenue.php?id=${venueId}`, onIssue)) as {
    venues: TsdbVenue[] | null;
  } | null;
  if (!data) return null;
  const image = data.venues?.[0]?.strThumb ?? null;
  venueImageCache.set(venueId, image);
  return image;
}

const THROTTLE_MS = 2_050; // free tier allows 30 requests/min
const RETRY_AFTER_MS = 10_000;

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url: string, onIssue?: ReportProviderIssue): Promise<unknown> {
  const wait = lastRequestAt + THROTTLE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  let response = await fetchProvider('thesportsdb.request', url, onIssue);
  if (response.status === 429) {
    const header = response.headers.get('retry-after');
    const requestedWait = header === null ? RETRY_AFTER_MS
      : /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
    const wait = Number.isFinite(requestedWait) ? Math.max(0, requestedWait) : RETRY_AFTER_MS;
    if (wait <= RETRY_AFTER_MS) {
      await sleep(wait);
      lastRequestAt = Date.now();
      response = await fetchProvider('thesportsdb.request', url, onIssue);
    }
  }
  if (!response.ok) return warnHttp('thesportsdb', response, null, onIssue);
  return await response.json();
}

export const theSportsDbProvider: FixtureProvider = {
  name: 'thesportsdb',

  supports(league: LeagueRef): boolean {
    return Boolean(league.externalIds.thesportsdb);
  },

  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const leagueId = league.externalIds.thesportsdb;
    const results: ProviderEvent[] = [];
    let interrupted = false;
    const onIssue: ReportProviderIssue = (issue) => {
      interrupted = true;
      league.onIssue?.(issue);
    };

    // Scan day by day: the free-tier list endpoints (eventsnextleague,
    // eventsseason) are truncated to a handful of rows, but the per-league
    // daily endpoint is not.
    const today = new Date();
    for (let offset = 0; offset < days; offset += 1) {
      const day = new Date(today.getTime() + offset * 86_400_000);
      const dateStr = day.toISOString().slice(0, 10);
      const daily = (await getJson(`${BASE}/eventsday.php?d=${dateStr}&l=${leagueId}`, onIssue)) as {
        events: TsdbEvent[] | null;
      } | null;
      for (const raw of daily?.events ?? []) {
        if (raw.idLeague !== leagueId) continue;
        const image = VENUE_IMAGE_SPORTS.has(league.sportId)
          ? await venueImage(raw.idVenue, onIssue)
          : null;
        const normalized = normalize(raw, image);
        if (normalized) results.push(normalized);
        if (interrupted) break;
      }
      if (interrupted) break;
    }

    // De-duplicate.
    const byId = new Map<string, ProviderEvent>();
    for (const event of results) byId.set(event.externalId, event);
    return [...byId.values()];
  },

  async fetchLeagueTeams(league: LeagueRef): Promise<ProviderTeam[]> {
    const leagueId = league.externalIds.thesportsdb;
    if (!leagueId) return [];
    // `lookup_all_teams.php?id=` is paywalled: on the free key it answers every
    // id with the same sample squad, so it can't be used. `search_all_teams`
    // keyed by the provider's own league name is free and correct — hence the
    // extra lookup to turn our display name ("Süper Lig") into theirs
    // ("Turkish Super Lig").
    const leagueData = (await getJson(`${BASE}/lookupleague.php?id=${leagueId}`, league.onIssue)) as {
      leagues: { strLeague: string | null }[] | null;
    } | null;
    const providerName = leagueData?.leagues?.[0]?.strLeague;
    if (!providerName) return [];

    const data = (await getJson(
      `${BASE}/search_all_teams.php?l=${encodeURIComponent(providerName)}`,
      league.onIssue,
    )) as { teams: TsdbTeam[] | null } | null;

    return (data?.teams ?? [])
      .filter((team) => team.idTeam && team.strTeam)
      // The endpoint has been seen to fall back to an unrelated league, so
      // only keep teams that really list this competition.
      .filter((team) => teamPlaysIn(team, leagueId))
      .map((team) => ({
        externalIds: {
          thesportsdb: team.idTeam,
          // Handing ESPN's id over means the two providers resolve to the
          // same row no matter which one is synced first.
          ...(team.idESPN && team.idESPN !== '0' ? { espn: team.idESPN } : {}),
        },
        name: team.strTeam,
        logoUrl: team.strBadge || null,
        // The club's other spellings, so a name another feed uses still
        // resolves to this row instead of minting a second one.
        aliases: (team.strTeamAlternate ?? '')
          .split(',')
          .map((alias) => alias.trim())
          .filter((alias) => alias.length > 0),
      }));
  },

  async fetchLineup(externalId: string): Promise<EventLineup | null> {
    const data = (await getJson(`${BASE}/lookuplineup.php?id=${externalId}`)) as {
      lineup: TsdbLineupRow[] | null;
    } | null;
    const rows = data?.lineup;
    if (!rows || rows.length === 0) return null;
    const home: LineupPlayer[] = [];
    const away: LineupPlayer[] = [];
    for (const row of rows) {
      ((row.strHome ?? '').toLowerCase() === 'yes' ? home : away).push(
        normalizeLineupRow(row),
      );
    }
    if (home.length === 0 && away.length === 0) return null;
    return {
      home: sortLineup(home),
      away: sortLineup(away),
      homeFormation: null,
      awayFormation: null,
    };
  },
};

/**
 * Bir kulubun armasi, adiyla aranarak.
 *
 * Fikstur ucu her takim icin arma vermiyor (ESPN'de bazi kuluplerin alani bos
 * geliyor) ve arma olmayinca kartin ust bolumu yer tutucuya dusuyor. Tek kulup
 * aramasi listeleme uclari gibi kirpilmiyor, bu yuzden eksikleri kapatmak icin
 * uygun.
 *
 * Donen ad da veriliyor: cagiran taraf bulunanin gercekten ayni kulup oldugunu
 * dogrulamadan armayi yazmamali. Arama benzer adli baska bir kulubu
 * dondurebilir ve yanlis arma, eksik armadan kotudur.
 */
export async function searchTeamCrest(
  name: string,
  sportId: string,
): Promise<{ name: string; crestUrl: string } | null> {
  const url = `${BASE}/searchteams.php?t=${encodeURIComponent(name)}`;
  const data = (await getJson(url)) as {
    teams?: { strTeam?: string; strSport?: string; strBadge?: string }[] | null;
  } | null;

  const sport = SPORT_NAMES[sportId];
  for (const team of data?.teams ?? []) {
    if (!team.strBadge || !team.strTeam) continue;
    if (sport && (team.strSport ?? '').toLowerCase() !== sport.toLowerCase()) continue;
    return { name: team.strTeam, crestUrl: team.strBadge };
  }
  return null;
}
