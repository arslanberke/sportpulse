import { warnHttp } from './log.ts';
import type { FixtureProvider, LeagueRef, ProviderEvent, ProviderSeason, ProviderTeam } from './types.ts';

/**
 * ESPN hidden API (site.api.espn.com) — fallback provider.
 *
 * Unofficial and undocumented; it currently responds without special headers
 * but can break or start returning 403 at any time, which is why it is only
 * used when the primary provider has no data for a league.
 */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

/** ESPN scoreboard path per sport (league slug appended for soccer). */
const SPORT_PATHS: Record<string, string> = {
  football: 'soccer', // + '/{leagueSlug}'
  basketball: 'basketball', // + '/{leagueSlug}'
  f1: 'racing/f1',
  ufc: 'mma/ufc',
  tennis: 'tennis', // + '/{leagueSlug}'
};

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team?: { displayName?: string };
}

interface EspnEvent {
  id: string;
  name: string;
  date: string; // ISO with zone, e.g. '2026-07-17T11:30Z'
  status?: { type?: { name?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

interface EspnTeamEntry {
  team?: {
    id?: string;
    displayName?: string;
    /** "Ajax" where displayName is "Ajax Amsterdam". */
    shortDisplayName?: string;
    /** The club without the city, e.g. "Hoffenheim" for "TSG Hoffenheim". */
    name?: string;
    logos?: { href?: string }[];
  };
}

/** Club list endpoint; only the sports that have a slug expose one. */
function teamsUrl(league: LeagueRef): string | null {
  const path = SPORT_PATHS[league.sportId];
  const slug = league.externalIds.espn;
  if (!path || !slug) return null;
  if (!['football', 'basketball'].includes(league.sportId)) return null;
  return `${BASE}/${path}/${slug}/teams`;
}

function scoreboardUrlFor(
  league: LeagueRef,
  slug: string | undefined,
  dates: string,
): string | null {
  const path = SPORT_PATHS[league.sportId];
  if (!path) return null;
  const needsSlug = ['football', 'basketball', 'tennis'].includes(league.sportId);
  if (needsSlug && !slug) return null;
  const full = needsSlug ? `${path}/${slug}` : path;
  // Tarih verilmezse ESPN o anin tablosunu doner; sezon bilgisi icin bu yeter.
  return `${BASE}/${full}/scoreboard${dates ? `?dates=${dates}` : ''}`;
}

function scoreboardUrl(league: LeagueRef, dates: string): string | null {
  return scoreboardUrlFor(league, league.externalIds.espn, dates);
}

/**
 * Ayni yarismanin ESPN'de ayri kod altinda duran bolumleri.
 *
 * ESPN eleme turlarini bagimsiz bir lig sayiyor: `uefa.europa` Agustos basinda
 * bos donerken maclar `uefa.europa_qual` altinda duruyor. Bunlari ayri bir
 * yarisma olarak katalogda tutmak, ligi takip eden kullanicinin eleme maclarini
 * kacirmasi anlamina gelirdi; bu yuzden ayni lig icin ikinci bir kod okunur ve
 * sonuclar birlestirilir.
 *
 * Sezon araligi ve kadro icin yalnizca ana kod kullanilir: eleme turunun
 * takvimi ve katilimcilari yarismanin kendisini temsil etmez.
 */
function scoreboardSlugs(league: LeagueRef): (string | undefined)[] {
  const { espn, espnQualifying } = league.externalIds;
  return espnQualifying ? [espn, espnQualifying] : [espn];
}

/** Bir takvim ogesinin kac gun surdugu; hesaplanamiyorsa null. */
function entrySpanDays(entry: unknown): number | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const { startDate, endDate } = entry as { startDate?: string; endDate?: string };
  if (!startDate || !endDate) return null;
  const span = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Number.isNaN(span) ? null : span / 86_400_000;
}

/**
 * Takvimdeki en erken tarih; yalnizca takvim mac gunu ayrintisinda ise.
 *
 * Takvimin bicimi lige gore degisiyor. Ligler gun listesi olarak ISO dizgeleri
 * ("2026-08-21T07:00Z") ya da yaris basina bir oge (Formula 1) verir; bunlar
 * gercek ilk maci gosterir. Kupalarda ise tum sezonu kapsayan tek bir idari
 * oge gelir (DFB-Pokal icin 1 Temmuz 2026 - 1 Temmuz 2027) ve bu tarih ilk mac
 * degildir: oyle bir tarihi ilk mac saymak, henuz baslamamis kupanin oynandigi
 * sonucunu verirdi. Bu yuzden kaba ogeler yok sayilir.
 */
const COARSE_ENTRY_DAYS = 60;

function earliestCalendarDate(calendar: unknown): string | null {
  if (!Array.isArray(calendar) || calendar.length === 0) return null;
  const dates = calendar
    .filter((entry) => {
      const span = entrySpanDays(entry);
      return span === null || span <= COARSE_ENTRY_DAYS;
    })
    .map((entry) =>
      typeof entry === 'string' ? entry : ((entry as { startDate?: string })?.startDate ?? null),
    )
    .filter((value): value is string => typeof value === 'string' && value !== '');
  if (dates.length === 0) return null;
  const earliest = dates.reduce((a, b) => (a < b ? a : b));
  const parsed = new Date(earliest);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalize(event: EspnEvent): ProviderEvent {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home')?.team?.displayName ?? null;
  const away = competitors.find((c) => c.homeAway === 'away')?.team?.displayName ?? null;
  return {
    externalId: event.id,
    provider: 'espn',
    // ESPN basligi "deplasman at ev sahibi" biciminde yaziyor ("Besiktas at FC
    // Hradec Kralove"). Diger kaynaklar ve arayuzun tamami "ev sahibi vs
    // deplasman" duzenini kullaniyor; ayni listede iki bicim yan yana gelince
    // hangi takimin sahasinda oynadigi okunamiyor. Takimlar ayri ayri
    // bilindigi icin baslik tutarli bicimde kurulur.
    title: home && away ? `${home} vs ${away}` : event.name,
    startsAtUtc: new Date(event.date).toISOString(),
    homeTeam: home,
    awayTeam: away,
    homeTeamExternalId: null,
    awayTeamExternalId: null,
    homeTeamLogoUrl: null,
    awayTeamLogoUrl: null,
    imageUrl: null,
    venue: null,
    venueImageUrl: null,
    postponed: event.status?.type?.name === 'STATUS_POSTPONED',
  };
}

export const espnProvider: FixtureProvider = {
  name: 'espn',

  supports(league: LeagueRef): boolean {
    return scoreboardUrl(league, '') !== null;
  },

  async fetchUpcomingEvents(league: LeagueRef, days: number): Promise<ProviderEvent[]> {
    const from = new Date();
    const to = new Date(from.getTime() + days * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const dates = `${fmt(from)}-${fmt(to)}`;

    const pages = await Promise.all(
      scoreboardSlugs(league).map(async (slug) => {
        const url = scoreboardUrlFor(league, slug, dates);
        if (!url) return [];
        const response = await fetch(url);
        if (!response.ok) return warnHttp('espn.scoreboard', response, []);
        const data = (await response.json()) as { events?: EspnEvent[] };
        return (data.events ?? []).map(normalize);
      }),
    );

    return pages.flat();
  },

  /**
   * Sezon araligi.
   *
   * `season.endDate` idari sezon sonudur ve guvenilirdir. Baslangic icin ayni
   * nesnedeki `startDate` kullanilmaz: Premier Lig'de 1 Haziran'i gosterirken
   * ilk mac 21 Agustos'tadir. Takvimdeki en erken tarih gercek ilk maca cok
   * daha yakin oldugu icin o tercih edilir.
   */
  async fetchSeason(league: LeagueRef): Promise<ProviderSeason | null> {
    const url = scoreboardUrl(league, '');
    if (!url) return null;

    const response = await fetch(url);
    if (!response.ok) return warnHttp('espn.season', response, null);
    const data = (await response.json()) as {
      leagues?: { season?: { endDate?: string }; calendar?: unknown }[];
    };

    const league0 = data.leagues?.[0];
    if (!league0) return null;

    const startsAtUtc = earliestCalendarDate(league0.calendar);
    const rawEnd = league0.season?.endDate;
    const parsedEnd = rawEnd ? new Date(rawEnd) : null;
    const endsAtUtc =
      parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd.toISOString() : null;

    if (!startsAtUtc && !endsAtUtc) return null;
    return { startsAtUtc, endsAtUtc };
  },

  async fetchLeagueTeams(league: LeagueRef): Promise<ProviderTeam[]> {
    const url = teamsUrl(league);
    if (!url) return [];
    const response = await fetch(url);
    if (!response.ok) return warnHttp('espn.teams', response, []);
    const data = (await response.json()) as {
      sports?: { leagues?: { teams?: EspnTeamEntry[] }[] }[];
    };
    const entries = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
    return entries
      .map((entry) => entry.team)
      .filter((team): team is NonNullable<EspnTeamEntry['team']> =>
        Boolean(team?.id && team.displayName),
      )
      .map((team) => ({
        externalIds: { espn: team.id! },
        name: team.displayName!,
        logoUrl: team.logos?.[0]?.href ?? null,
        // Other feeds spell the same club longer or shorter; ESPN hands us
        // both forms, which saves guessing at match time.
        aliases: [team.shortDisplayName, team.name].filter(
          (alias): alias is string => Boolean(alias),
        ),
      }));
  },
};
