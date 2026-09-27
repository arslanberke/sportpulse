import { useQuery } from '@tanstack/react-query';

import {
    fetchFootballPlayer,
    fetchFootballPlayerMatches,
    fetchTeamSquad
} from '@/services/football-players';

const PROFILE_STALE_MS = 30 * 60 * 1000; // profil ve sezon toplami yavas degisir

/** BSD futbolcu profili + kariyer/sezon istatistikleri. */
export function useFootballPlayer(bsdId: string | undefined) {
  return useQuery({
    queryKey: ['football-player', bsdId],
    queryFn: () => fetchFootballPlayer(bsdId!),
    enabled: Boolean(bsdId),
    staleTime: PROFILE_STALE_MS,
  });
}

/**
 * Takim sayfasinin Kadro sekmesi; kaynak sunucuda secilir (BSD, yoksa
 * TheSportsDB). `teamId` bizim ic kimligimiz.
 */
export function useTeamSquad(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-squad', teamId],
    queryFn: () => fetchTeamSquad(teamId!),
    enabled: Boolean(teamId),
    staleTime: PROFILE_STALE_MS,
  });
}

/** Acik sezon satirinin mac mac logu; yalnizca satir acikken cagrilir. */
export function useFootballPlayerMatches(
  bsdId: string | undefined,
  season: { seasonId: number | null; leagueId: number | null; teamId: string | null } | null,
) {
  return useQuery({
    queryKey: ['football-player-matches', bsdId, season?.seasonId, season?.leagueId, season?.teamId],
    queryFn: () => fetchFootballPlayerMatches(bsdId!, season!.seasonId!, season!.leagueId, season!.teamId),
    enabled: Boolean(bsdId && season?.seasonId),
    staleTime: 10 * 60 * 1000,
  });
}
