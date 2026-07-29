import { fetchTeamLeagues } from '@/services/catalog';
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
      const table = await fetchLeagueTable({
        sportId: league.sportId,
        externalIds: league.externalIds,
      });
      if (!table) return null;
      return {
        leagueId: league.id,
        leagueName: league.name,
        leagueLogoUrl: league.logoUrl,
        sportId: league.sportId,
        season: table.season,
        groups: table.groups,
      } satisfies LeagueTable;
    }),
  );

  return tables.filter((table): table is LeagueTable => table !== null);
}
