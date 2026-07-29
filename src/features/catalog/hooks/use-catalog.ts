import { useQuery } from '@tanstack/react-query';

import {
    fetchLeagueChannels,
    fetchLeagues,
    fetchSports,
    fetchTeam,
    fetchTeamLeagues,
    fetchTeams,
    searchCatalog
} from '@/services/catalog';
import { fetchTeamTables } from '@/services/standings';

const CATALOG_STALE_MS = 60 * 60 * 1000; // the catalog changes rarely
/** Below this a search matches almost everything, so it isn't worth a round trip. */
const MIN_SEARCH_LENGTH = 2;

export function useSports() {
  return useQuery({ queryKey: ['sports'], queryFn: fetchSports, staleTime: CATALOG_STALE_MS });
}

export function useLeagues() {
  return useQuery({ queryKey: ['leagues'], queryFn: fetchLeagues, staleTime: CATALOG_STALE_MS });
}

export function useTeams(leagueId?: string) {
  return useQuery({
    queryKey: ['teams', leagueId ?? 'all'],
    queryFn: () => fetchTeams(leagueId),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId!),
    enabled: Boolean(teamId),
    staleTime: CATALOG_STALE_MS,
  });
}

/** Every competition the club takes part in, league and cups alike. */
export function useTeamLeagues(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-leagues', teamId],
    queryFn: () => fetchTeamLeagues(teamId!),
    enabled: Boolean(teamId),
    staleTime: CATALOG_STALE_MS,
  });
}

/**
 * Standings for each of the club's competitions. Tables move only as matches
 * are played, so an hour of cache is plenty and keeps the tab instant when
 * switching back and forth.
 */
export function useTeamTables(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-tables', teamId],
    queryFn: () => fetchTeamTables(teamId!),
    enabled: Boolean(teamId),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

/**
 * Leagues and teams matching a free-text term. Idle until the term is long
 * enough to be selective; results are kept briefly so backspacing feels
 * instant.
 */
export function useCatalogSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ['catalog-search', trimmed.toLowerCase()],
    queryFn: () => searchCatalog(trimmed),
    enabled: trimmed.length >= MIN_SEARCH_LENGTH,
    staleTime: 60_000,
  });
}

export function useLeagueChannels(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['league-channels', countryCode],
    queryFn: () => fetchLeagueChannels(countryCode!),
    enabled: Boolean(countryCode),
    staleTime: CATALOG_STALE_MS,
  });
}
