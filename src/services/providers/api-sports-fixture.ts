import type { EventLineup, LineupPlayer } from './types.ts';

// On-demand single-fixture score + key events (goals/cards/subs) via
// API-Sports, for the "match centre" screen. Separate from
// `api-sports-live.ts` (which polls the whole `live=all` feed): here we need
// one specific fixture's timeline, resolved once by date+team names and then
// cached on the event so repeat views never re-resolve it.
//
// Scoped to the five leagues we have a confident, well-known API-Sports
// league id for. Guessing an id for an uncovered league risks silently
// showing another match's score, which is worse than showing nothing.
export const APISPORTS_LEAGUE_IDS: Record<string, number> = {
  'Süper Lig': 203,
  'Premier League': 39,
  LaLiga: 140,
  Bundesliga: 78,
  'Serie A': 135,
  'Ligue 1': 61,
};

export interface ApiSportsFixtureEvent {
  minute: number;
  extraMinute: number | null;
  type: 'goal' | 'card' | 'substitution' | 'var' | 'other';
  /** Raw provider detail, e.g. "Normal Goal", "Yellow Card", "Penalty". */
  detail: string;
  isHome: boolean;
  player: string | null;
  assistOrSubIn: string | null;
}

export interface ApiSportsFixtureState {
  fixtureId: number;
  status: string;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  events: ApiSportsFixtureEvent[];
}

/** Statuses where the game is still being played or paused mid-match. */
export const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT']);
/** Statuses where the result is final; safe to cache forever and stop polling. */
export const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN', 'ABD', 'AWD', 'WO', 'CANC', 'PST']);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('API-Sports: invalid_response');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('API-Sports: invalid_response');
  return value;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function nullableInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

async function request(url: string, apiKey: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'x-apisports-key': apiKey }, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error('API-Sports: network_error');
  }
  if (!response.ok) throw new Error(`API-Sports: http_${response.status}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('API-Sports: invalid_response');
  }
  const data = object(body);
  if (data.errors && Object.keys(Object(data.errors)).length > 0) throw new Error('API-Sports: provider_error');
  if (!Array.isArray(data.response)) throw new Error('API-Sports: invalid_response');
  return data;
}

/** Accent/case/punctuation-insensitive form, for exact-equality name matching only. */
function fold(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves our event to an API-Sports fixture id by fetching the day's full
 * fixture list and requiring an exact folded name match on both teams within
 * one of the five covered leagues.
 *
 * Deliberately not a substring/contains match: AGENTS.md already documents a
 * false-positive class here (`Angers` ⊂ `Queens Park Rangers`). A missed
 * match means no live card is shown, which is safer than a wrong one.
 */
export async function resolveApiSportsFixture(params: {
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  startsAtUtc: string;
  apiKey: string;
}): Promise<number | null> {
  const leagueId = APISPORTS_LEAGUE_IDS[params.leagueName];
  if (!leagueId) return null;
  const date = params.startsAtUtc.slice(0, 10);
  const data = await request(`https://v3.football.api-sports.io/fixtures?date=${date}`, params.apiKey);
  const home = fold(params.homeTeam);
  const away = fold(params.awayTeam);
  for (const row of data.response as unknown[]) {
    const fixture = object(row);
    const league = object(fixture.league);
    if (nullableInteger(league.id) !== leagueId) continue;
    const teams = object(fixture.teams);
    const homeName = text(object(teams.home).name);
    const awayName = text(object(teams.away).name);
    if (fold(homeName) === home && fold(awayName) === away) {
      return nullableInteger(object(fixture.fixture).id);
    }
  }
  return null;
}

function eventType(apiType: string, detail: string): ApiSportsFixtureEvent['type'] {
  const kind = apiType.toLowerCase();
  if (kind === 'goal') return 'goal';
  if (kind === 'card') return 'card';
  if (kind === 'subst') return 'substitution';
  if (kind === 'var') return 'var';
  void detail;
  return 'other';
}

function lineupPlayer(value: unknown, isSubstitute: boolean): LineupPlayer {
  const row = object(value);
  const player = object(row.player);
  const rawGrid = nullableText(player.grid);
  const gridMatch = rawGrid?.match(/^(\d+):(\d+)$/);
  return {
    id: String(nullableInteger(player.id) ?? text(player.name)),
    name: text(player.name),
    number: nullableInteger(player.number),
    position: nullableText(player.pos),
    isSubstitute,
    photoUrl: null,
    isCaptain: Boolean(player.captain),
    countryCode: null,
    grid: gridMatch ? { row: Number(gridMatch[1]), col: Number(gridMatch[2]) } : null,
  };
}

/**
 * Confirmed lineups for a resolved API-Sports fixture. Returns null unless
 * both teams have all 11 starters — partial provider payloads must never be
 * presented as a full formation.
 */
export async function fetchApiSportsLineup(fixtureId: number, apiKey: string): Promise<EventLineup | null> {
  const data = await request(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, apiKey);
  if ((data.response as unknown[]).length !== 2) return null;
  const sides = (data.response as unknown[]).map(value => {
    const side = object(value);
    const startXI = Array.isArray(side.startXI) ? side.startXI.map(value => lineupPlayer(value, false)) : [];
    const substitutes = Array.isArray(side.substitutes) ? side.substitutes.map(value => lineupPlayer(value, true)) : [];
    return { players: [...startXI, ...substitutes], starters: startXI.length, formation: nullableText(side.formation) };
  });
  if (sides.some(side => side.starters < 11)) return null;
  return {
    home: sides[0].players,
    away: sides[1].players,
    homeFormation: sides[0].formation,
    awayFormation: sides[1].formation,
  };
}

/** A cached/fallback lineup is displayable only with 11 starters per side. */
export function isCompleteLineup(lineup: EventLineup | null): lineup is EventLineup {
  return Boolean(lineup &&
    lineup.home.filter(player => !player.isSubstitute).length >= 11 &&
    lineup.away.filter(player => !player.isSubstitute).length >= 11);
}

/** Single fixture's current score/status plus its full events timeline. */
export async function fetchFixtureState(fixtureId: number, apiKey: string): Promise<ApiSportsFixtureState> {
  const [fixtureData, eventsData] = await Promise.all([
    request(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, apiKey),
    request(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, apiKey),
  ]);
  const row = object((fixtureData.response as unknown[])[0]);
  if (!row) throw new Error('API-Sports: invalid_response');
  const fixture = object(row.fixture);
  const status = object(fixture.status);
  const goals = object(row.goals);
  const teams = object(row.teams);
  const homeTeamId = nullableInteger(object(teams.home).id);

  const events: ApiSportsFixtureEvent[] = (eventsData.response as unknown[]).map((item) => {
    const entry = object(item);
    const time = object(entry.time);
    const team = object(entry.team);
    const player = object(entry.player);
    const assist = object(entry.assist);
    return {
      minute: nullableInteger(time.elapsed) ?? 0,
      extraMinute: nullableInteger(time.extra),
      type: eventType(text(entry.type), nullableText(entry.detail) ?? ''),
      detail: nullableText(entry.detail) ?? text(entry.type),
      isHome: nullableInteger(team.id) === homeTeamId,
      player: nullableText(player.name),
      assistOrSubIn: nullableText(assist.name),
    };
  });

  return {
    fixtureId,
    status: text(status.short),
    elapsed: nullableInteger(status.elapsed),
    homeScore: nullableInteger(goals.home),
    awayScore: nullableInteger(goals.away),
    events,
  };
}
