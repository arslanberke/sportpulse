import { enrichTableLogos } from '@/features/teams/lib/table-logos';
import { fetchLeagues, fetchTeamLeagues, fetchTeams } from '@/services/catalog';
import { fetchLeagueTable } from '@/services/providers/league-tables';
import type { LeagueTable } from '@/types';

/**
 * The standings of every competition a club plays in, in one call: its league
 * table plus the league phase of each cup it is in. Competitions we have no
 * table for (pure knockout cups, leagues ESPN doesn't cover) are dropped, so
 * the tab only ever shows real data.
 */
export async function fetchTeamTables(teamId: string): Promise<LeagueTable[]> {
  const leagues = await fetchTeamLeagues(teamId);

  const tables = await Promise.all(
    leagues.map(async (league) => {
      const [table, teams] = await Promise.all([
        fetchLeagueTable({ sportId: league.sportId, externalIds: league.externalIds }),
        fetchTeams(league.id),
      ]);
      if (!table) return null;
      return {
        leagueId: league.id,
        leagueName: league.name,
        leagueLogoUrl: league.logoUrl,
        sportId: league.sportId,
        season: table.season,
        groups: enrichTableLogos(table.groups, teams),
      } satisfies LeagueTable;
    }),
  );

  return tables.filter((table): table is LeagueTable => table !== null);
}

/** Tek bir ligin puan durumu; tablo yayinlanmayan yarismada (kupa) null. */
export async function fetchLeagueTables(leagueId: string): Promise<LeagueTable | null> {
  const league = (await fetchLeagues()).find((l) => l.id === leagueId);
  if (!league) return null;
  const [table, teams] = await Promise.all([
    fetchLeagueTable({ sportId: league.sportId, externalIds: league.externalIds }),
    fetchTeams(league.id),
  ]);
  if (!table) return null;
  return {
    leagueId: league.id,
    leagueName: league.name,
    leagueLogoUrl: league.logoUrl,
    sportId: league.sportId,
    season: table.season,
    groups: enrichTableLogos(table.groups, teams),
  };
}
