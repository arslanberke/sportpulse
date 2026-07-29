import type { LeagueRef, ProviderTeam, TeamListProvider } from './types.ts';

/**
 * Club lists straight from EuroLeague Basketball's own live API — the only
 * complete source for the EuroLeague and EuroCup, which the general sports
 * data providers either skip or truncate.
 *
 * A league opts in with its competition code in `external_ids.euroleague`:
 * "E" for the EuroLeague, "U" for the EuroCup.
 */

const BASE = 'https://api-live.euroleague.net/v2/competitions';

interface EuroleagueClub {
  code?: string;
  name?: string;
  /** Club without the sponsor, e.g. "Besiktas" for "Besiktas Istanbul". */
  abbreviatedName?: string;
  clubPermanentAlias?: string;
  city?: string;
  images?: { crest?: string };
}

interface ClubsResponse {
  data?: EuroleagueClub[];
}

/**
 * Season code, e.g. "E2026". Their season runs autumn to spring and is keyed
 * by the year it starts in.
 */
function seasonCode(competition: string, date: Date): string {
  const year = date.getUTCFullYear();
  return `${competition}${date.getUTCMonth() >= 6 ? year : year - 1}`;
}

/**
 * The club without the city EuroLeague appends: "Anadolu Efes Istanbul" is
 * "Anadolu Efes" at home. Left alone when the city is the whole name, so
 * "Real Madrid" never becomes "Real".
 */
function withoutCity(name: string, city: string | undefined): string | null {
  if (!city) return null;
  const suffix = ` ${city.trim().toLowerCase()}`;
  if (!name.toLowerCase().endsWith(suffix)) return null;
  const stripped = name.slice(0, -suffix.length).trim();
  return stripped.length > 0 ? stripped : null;
}

async function fetchClubs(competition: string, season: string): Promise<ProviderTeam[]> {
  const url = `${BASE}/${competition}/seasons/${season}/clubs`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = (await res.json()) as ClubsResponse;
    return (data.data ?? [])
      .filter((club) => club.name && club.code)
      .map((club) => ({
        externalIds: { euroleague: club.code! },
        name: club.name!,
        logoUrl: club.images?.crest ?? null,
        aliases: [
          club.abbreviatedName,
          club.clubPermanentAlias,
          withoutCity(club.name!, club.city),
        ].filter((alias): alias is string => Boolean(alias)),
      }));
  } catch {
    return [];
  }
}

export const euroleagueProvider: TeamListProvider = {
  name: 'euroleague',

  supports(league: LeagueRef): boolean {
    return Boolean(league.externalIds.euroleague);
  },

  async fetchLeagueTeams(league: LeagueRef): Promise<ProviderTeam[]> {
    const competition = league.externalIds.euroleague;
    const now = new Date();
    const seasons = [
      seasonCode(competition, now),
      // The coming season's entry list can lag a few weeks in summer.
      seasonCode(competition, new Date(now.getTime() - 200 * 86_400_000)),
    ];

    for (const season of seasons) {
      const clubs = await fetchClubs(competition, season);
      if (clubs.length > 0) return clubs;
    }
    return [];
  },
};
