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

/**
 * ESPN scoreboard path per sport; the league code is always appended.
 *
 * Motor sporlarinda yol daha once ligi de iceriyordu (`racing/f1`) ve lig kodu
 * hic kullanilmiyordu. Sonucu su oldu: ESPN kodu olmayan Formula 2, Moto2,
 * Moto3 ve MotoGP icin de F1 adresi cagrildi, gelen yaris ilk hangi lig
 * islendiyse ona yazildi. "Heineken Dutch Grand Prix" boylece Formula 2'ye
 * dustu ve Formula 1'i takip eden kullanici yarisi hic gormedi.
 *
 * Artik kod zorunlu: kodu olmayan lig ESPN'e hic sorulmaz, yedek saglayiciya
 * duser. ESPN'de zaten yalnizca `racing/f1` var; `racing/f2` ve `racing/motogp`
 * 400 donuyor.
 */
const SPORT_PATHS: Record<string, string> = {
  football: 'soccer',
  basketball: 'basketball',
  f1: 'racing',
  ufc: 'mma',
  tennis: 'tennis',
};

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team?: {
    id?: string;
    displayName?: string;
    /** Fikstur ucundaki tek gorsel alani; bos gelebilir. */
    logo?: string;
  };
}

interface EspnEvent {
  id: string;
  name: string;
  date: string; // ISO with zone, e.g. '2026-07-17T11:30Z'
  /** Turnuvalarda son gun; tek maclik etkinliklerde gelmez. */
  endDate?: string;
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
  if (!path || !slug) return null;
  // Tarih verilmezse ESPN o anin tablosunu doner; sezon bilgisi icin bu yeter.
  return `${BASE}/${path}/${slug}/scoreboard${dates ? `?dates=${dates}` : ''}`;
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
  const homeTeam = competitors.find((c) => c.homeAway === 'home')?.team;
  const awayTeam = competitors.find((c) => c.homeAway === 'away')?.team;
  const home = homeTeam?.displayName ?? null;
  const away = awayTeam?.displayName ?? null;
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
    endsAtUtc: event.endDate ? new Date(event.endDate).toISOString() : null,
    homeTeam: home,
    awayTeam: away,
    // Fikstur ucu takim kimligini ve armasini da veriyor. Bunlari almamak
    // ESPN birincil kaynak olunca gorunur bir bosluga donusmustu: maclarindan
    // olusan takimlar armasiz kaliyor, arma olmayinca kartin ust bolumu
    // takim rozetleri yerine lig afisine dusuyordu.
    homeTeamExternalId: homeTeam?.id ?? null,
    awayTeamExternalId: awayTeam?.id ?? null,
    homeTeamLogoUrl: homeTeam?.logo || null,
    awayTeamLogoUrl: awayTeam?.logo || null,
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

export interface RankedPlayer {
  externalId: string;
  name: string;
  countryCode: string | null;
  countryFlagUrl: string | null;
  headshotUrl: string | null;
  rank: number;
  points: number | null;
}

/**
 * Bir turun siralamasi (ATP/WTA).
 *
 * Bireysel sporlarda karsilasan taraf bir kulup degil kisi; bugune kadar bu
 * branslarda yalnizca turnuvanin kendisi tutuluyordu, dolayisiyla bir oyuncuyu
 * yildizlamak ya da profiline gitmek mumkun degildi. Siralama ucu 150 oyuncuyu
 * sira, puan, ulke ve vesikalik ile birlikte veriyor.
 */
export async function fetchRankings(league: LeagueRef): Promise<RankedPlayer[]> {
  const path = SPORT_PATHS[league.sportId];
  const slug = league.externalIds.espn;
  if (!path || !slug) return [];

  const response = await fetch(`${BASE}/${path}/${slug}/rankings`);
  if (!response.ok) return warnHttp('espn.rankings', response, []);

  const data = (await response.json()) as {
    rankings?: {
      ranks?: {
        current?: number;
        points?: number;
        athlete?: {
          /**
           * Kimlik olarak `guid` kullaniliyor: mac ucu sayisal `id` vermiyor,
           * yalnizca `guid` tasiyor. Ikisini birlikte tutmak yerine her iki ucta
           * bulunan alani secmek, siralamadan gelen oyuncuyla kuradan gelenin
           * ada bakmadan eslesmesini sagliyor (112 oyuncuda dogrulandi).
           */
          guid?: string;
          displayName?: string;
          citizenshipCountry?: string;
          flag?: { href?: string };
          headshot?: string;
        };
      }[];
    }[];
  };

  // Uc birden fazla liste dondurebiliyor (tekler, ciftler); ilki tekler.
  const ranks = data.rankings?.[0]?.ranks ?? [];
  const players: RankedPlayer[] = [];
  for (const entry of ranks) {
    const athlete = entry.athlete;
    if (!athlete?.guid || !athlete.displayName || !entry.current) continue;
    players.push({
      externalId: athlete.guid,
      name: athlete.displayName,
      countryCode: athlete.citizenshipCountry ?? null,
      countryFlagUrl: athlete.flag?.href ?? null,
      headshotUrl: athlete.headshot ?? null,
      rank: entry.current,
      points: entry.points ?? null,
    });
  }
  return players;
}

export interface PlayerMatch {
  externalId: string;
  /** Macin bagli oldugu turnuvanin kaynak kimligi. */
  tournamentExternalId: string;
  startsAtUtc: string;
  /** "Qualifying 1st Round", "Quarterfinals" gibi tur adi. */
  round: string | null;
  /** "Men's Singles" / "Women's Doubles"; ciftleri ayirt etmek icin. */
  bracket: string | null;
  postponed: boolean;
  players: {
    externalId: string;
    name: string;
    countryFlagUrl: string | null;
  }[];
}

/**
 * Bir turnuvanin kurasi: tek tek karsilasmalar.
 *
 * Turnuva ucu maclari `groupings` altinda veriyor (tekler, ciftler ayri grup).
 * Onlarca mac oldugu icin (Cincinnati'de 163) hepsini listeye koymak ana ekrani
 * bogar; cagiran taraf hangilerini gosterecegine karar veriyor.
 *
 * Oyuncu kimligi olarak `guid` kullaniliyor: bu uc sayisal `id` vermiyor.
 */
export async function fetchTournamentMatches(league: LeagueRef): Promise<PlayerMatch[]> {
  const url = scoreboardUrl(league, '');
  if (!url) return [];

  const response = await fetch(url);
  if (!response.ok) return warnHttp('espn.bracket', response, []);

  const data = (await response.json()) as {
    events?: {
      id?: string;
      groupings?: {
        grouping?: { slug?: string };
        competitions?: {
          id?: string;
          date?: string;
          status?: { type?: { name?: string } };
          round?: { displayName?: string };
          type?: { text?: string };
          competitors?: {
            athlete?: { guid?: string; displayName?: string; flag?: { href?: string } };
          }[];
        }[];
      }[];
    }[];
  };

  const matches: PlayerMatch[] = [];
  for (const tournament of data.events ?? []) {
    if (!tournament.id) continue;
    for (const grouping of tournament.groupings ?? []) {
      for (const competition of grouping.competitions ?? []) {
        if (!competition.id || !competition.date) continue;

        const players = (competition.competitors ?? [])
          .map((c) => c.athlete)
          .filter((a): a is { guid: string; displayName: string; flag?: { href?: string } } =>
            Boolean(a?.guid && a.displayName),
          )
          .map((a) => ({
            externalId: a.guid,
            name: a.displayName,
            countryFlagUrl: a.flag?.href ?? null,
          }));

        // Kurada rakibi belirlenmemis eslesmeler de donuyor; iki taraf
        // bilinmeden gosterilecek bir mac yok.
        if (players.length < 2) continue;

        matches.push({
          externalId: competition.id,
          tournamentExternalId: tournament.id,
          startsAtUtc: new Date(competition.date).toISOString(),
          round: competition.round?.displayName ?? null,
          bracket: competition.type?.text ?? null,
          postponed: competition.status?.type?.name === 'STATUS_POSTPONED',
          players,
        });
      }
    }
  }
  return matches;
}
