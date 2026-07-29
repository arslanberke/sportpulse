import type { LeagueRef, ProviderTeam, TeamListProvider } from './types.ts';

/**
 * Entry lists from the Turkish Wikipedia's season articles.
 *
 * The sports data providers we use either don't cover the Turkish basketball
 * and volleyball leagues at all or cap free-tier list endpoints at ten rows,
 * which left half a league missing. Wikipedia's season article, on the other
 * hand, carries the full "Takımlar" table from the day the entry list is
 * confirmed — months before the first fixture — and links each club to its own
 * article, whose lead image is the crest.
 *
 * A league opts in by carrying its article suffix in `external_ids.wikipedia`,
 * e.g. "Basketbol Süper Ligi" -> "2026-27 Basketbol Süper Ligi".
 */

const API = 'https://tr.wikipedia.org/w/api.php';
/** Single-team lookups aren't capped the way the list endpoints are. */
const TSDB_SEARCH = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=';
/** Wikipedia asks for a descriptive agent; anonymous scrapers get throttled. */
const HEADERS = { 'User-Agent': 'SportPulse/1.0 (fixture app; contact: app)' };
/** Crest size that still looks sharp on a 3x screen row. */
const THUMB_PX = 256;

interface WikitextResponse {
  parse?: { wikitext?: { '*'?: string } };
  error?: unknown;
}

interface PageImagesResponse {
  query?: {
    pages?: Record<string, { title?: string; thumbnail?: { source?: string } }>;
  };
}

async function getJson<T>(params: Record<string, string>): Promise<T | null> {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params });
  try {
    const res = await fetch(`${API}?${query}`, { headers: HEADERS });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Season label as Wikipedia writes it ("2026-27"). Turkish leagues start in
 * late summer, so from July on the article is already the coming season's.
 */
function seasonLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 6 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** The section that holds the entry list, up to the next top-level heading. */
function teamSection(wikitext: string): string | null {
  const heading = /^==\s*(?:Takımlar|Kulüpler)[^=]*==\s*$/m.exec(wikitext);
  if (!heading) return null;
  const rest = wikitext.slice(heading.index + heading[0].length);
  const next = /^==[^=]/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/**
 * First cell of every row of the section's first table: the club, linked to
 * its own article. Later columns (city, arena, coach) are ignored.
 */
function clubLinks(section: string): { article: string; name: string }[] {
  const start = section.indexOf('{|');
  if (start === -1) return [];
  const end = section.indexOf('|}', start);
  const table = section.slice(start, end === -1 ? undefined : end);

  const clubs: { article: string; name: string }[] = [];
  for (const row of table.split('\n|-').slice(1)) {
    for (const cell of row.split(/\n\|(?!\})|\|\|/)) {
      const trimmed = cell.trim();
      if (trimmed.length === 0 || trimmed.startsWith('!')) continue;
      const link = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(trimmed);
      if (link) {
        clubs.push({
          article: link[1].trim(),
          name: (link[2] ?? link[1]).trim(),
        });
      }
      break; // only the first cell of the row
    }
  }
  return clubs;
}

/** Lead image of each club article, batched (the API takes 50 titles a call). */
async function crests(articles: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (let i = 0; i < articles.length; i += 20) {
    const data = await getJson<PageImagesResponse>({
      action: 'query',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(THUMB_PX),
      pilicense: 'any',
      titles: articles.slice(i, i + 20).join('|'),
    });
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const source = page.thumbnail?.source;
      // JPEG has no alpha channel, so such a crest is a white block on the
      // row. Better to fall back to a source that has a cut-out badge.
      if (page.title && source && !/\.jpe?g$/i.test(source)) {
        found.set(page.title, source);
      }
    }
  }
  return found;
}

/**
 * Crest for the handful of clubs whose Wikipedia article carries no image.
 * TheSportsDB is useless for listing a league but fine for one club by name.
 */
async function crestByName(name: string, sportId: string): Promise<string | null> {
  try {
    const res = await fetch(TSDB_SEARCH + encodeURIComponent(name));
    if (!res.ok) return null;
    const data = (await res.json()) as {
      teams?: { strSport?: string; strBadge?: string }[] | null;
    };
    const match = (data.teams ?? []).find(
      (team) => (team.strSport ?? '').toLowerCase() === sportId && team.strBadge,
    );
    return match?.strBadge ?? null;
  } catch {
    return null;
  }
}

async function fetchSeasonTeams(title: string, sportId: string): Promise<ProviderTeam[]> {
  const data = await getJson<WikitextResponse>({
    action: 'parse',
    prop: 'wikitext',
    page: title,
  });
  const wikitext = data?.parse?.wikitext?.['*'];
  if (!wikitext) return [];

  const section = teamSection(wikitext);
  if (!section) return [];

  const clubs = clubLinks(section);
  if (clubs.length === 0) return [];

  const logos = await crests(clubs.map((club) => club.article));
  return await Promise.all(
    clubs.map(async (club) => ({
      // The article title is stable across seasons and renames, which makes it
      // a better key than the display name.
      externalIds: { wikipedia: club.article },
      name: club.name,
      logoUrl:
        logos.get(club.article) ?? (await crestByName(club.name, sportId)),
    })),
  );
}

export const wikipediaProvider: TeamListProvider = {
  name: 'wikipedia',

  supports(league: LeagueRef): boolean {
    return Boolean(league.externalIds.wikipedia);
  },

  async fetchLeagueTeams(league: LeagueRef): Promise<ProviderTeam[]> {
    const suffix = league.externalIds.wikipedia;
    const now = new Date();
    const seasons = [
      seasonLabel(now),
      // Right after a season ends the new article may not exist yet.
      seasonLabel(new Date(now.getTime() - 200 * 86_400_000)),
    ];

    for (const season of seasons) {
      const teams = await fetchSeasonTeams(`${season} ${suffix}`, league.sportId);
      if (teams.length > 0) return teams;
    }
    return [];
  },
};
