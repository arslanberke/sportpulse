import { useQuery } from '@tanstack/react-query';

import { fetchLeagueChannels, fetchLeagues, fetchSports, fetchTeams } from '@/services/catalog';

const CATALOG_STALE_MS = 60 * 60 * 1000; // the catalog changes rarely

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

export function useLeagueChannels(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['league-channels', countryCode],
    queryFn: () => fetchLeagueChannels(countryCode!),
    enabled: Boolean(countryCode),
    staleTime: CATALOG_STALE_MS,
  });
}
