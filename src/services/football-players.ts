import { supabase } from '@/services/supabase';
import type { FootballPlayerMatch, FootballPlayerProfile, FootballPlayerSummary } from '@/types';

/**
 * BSD futbolcu verileri. Oyuncular `players` tablosunda tutulmuyor — futbolcu
 * kimligi kadro cache'lerinden ve `teams.external_ids.bsd`'den geliyor ve her
 * sorgu `player-bsd-data` Edge Function'i uzerinden canli BSD cagrisi yapar.
 */

/** Ada gore futbolcu aramasi; BSD'nin kendi arama ucu. */
export async function searchFootballPlayers(term: string): Promise<FootballPlayerSummary[]> {
  const { data, error } = await supabase.functions.invoke<{ players: FootballPlayerSummary[] }>(
    'player-bsd-data', { body: { kind: 'search', query: term } },
  );
  if (error) return [];
  return data?.players ?? [];
}

/**
 * Bir takimin guncel kadrosu; kendi takim kimligimizle cagrilir ve kaynak
 * sunucuda secilir (BSD, yoksa TheSportsDB).
 */
export async function fetchTeamSquad(teamId: string): Promise<FootballPlayerSummary[]> {
  const { data, error } = await supabase.functions.invoke<{ players: FootballPlayerSummary[] }>(
    'team-squad', { body: { teamId } },
  );
  if (error) throw error;
  return data?.players ?? [];
}

/** Profil + sezon/kariyer istatistikleri. */
export async function fetchFootballPlayer(bsdId: string): Promise<FootballPlayerProfile | null> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    profile: Omit<FootballPlayerProfile, 'seasons'> | null;
    seasons: FootballPlayerProfile['seasons'];
  }>('player-bsd-data', { body: { kind: 'profile', playerId: bsdId } });
  if (error) throw error;
  if (!data?.available || !data.profile) return null;
  return { ...data.profile, seasons: data.seasons ?? [] };
}

/** Bir sezon satirina ait mac mac oyuncu logu; sezon satiri acilinca cagrilir. */
export async function fetchFootballPlayerMatches(
  bsdId: string,
  seasonId: number,
  leagueId: number | null,
  teamId: string | null,
): Promise<FootballPlayerMatch[]> {
  const { data, error } = await supabase.functions.invoke<{ matches: FootballPlayerMatch[] }>(
    'player-bsd-data',
    { body: { kind: 'matches', playerId: bsdId, seasonId: String(seasonId), leagueId: leagueId != null ? String(leagueId) : undefined, teamId: teamId ?? undefined } },
  );
  if (error) throw error;
  return data?.matches ?? [];
}
