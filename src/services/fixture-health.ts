import { supabase } from '@/services/supabase';
import type { FixtureHealth, FixtureSyncState } from '@/features/events/lib/fixture-health';
import type { UserFollow } from '@/types';

export async function fetchFixtureHealth(follows: UserFollow[], favoritePlayerIds: string[]): Promise<FixtureHealth[]> {
  const leagueIds = new Set(follows.filter((follow) => follow.leagueId).map((follow) => follow.leagueId!));
  const sportIds = new Set(follows.filter((follow) => follow.sportId).map((follow) => follow.sportId!));
  const teamIds = follows.filter((follow) => follow.teamId).map((follow) => follow.teamId!);
  if (!leagueIds.size && !sportIds.size && !teamIds.length && !favoritePlayerIds.length) return [];

  if (teamIds.length > 0) {
    const [memberships, teams] = await Promise.all([
      supabase.from('league_teams').select('league_id').in('team_id', teamIds),
      supabase.from('teams').select('league_id').in('id', teamIds),
    ]);
    if (memberships.error) throw memberships.error;
    if (teams.error) throw teams.error;
    for (const row of [...memberships.data, ...teams.data]) if (row.league_id) leagueIds.add(row.league_id);
  }
  if (favoritePlayerIds.length > 0) {
    const { data, error } = await supabase.from('players').select('league_id').in('id', favoritePlayerIds);
    if (error) throw error;
    for (const row of data ?? []) if (row.league_id) leagueIds.add(row.league_id);
  }
  const [leagues, health] = await Promise.all([
    supabase.from('leagues').select('id, name, sport_id').order('name'),
    supabase.from('fixture_sync_health').select('league_id, status, source, last_attempt_at, last_completed_at, last_success_at'),
  ]);
  if (leagues.error) throw leagues.error;
  if (health.error) throw health.error;
  const byLeague = new Map((health.data ?? []).map((row) => [row.league_id, row]));
  return (leagues.data ?? [])
    .filter((league) => leagueIds.has(league.id) || sportIds.has(league.sport_id))
    .map((league) => {
      const row = byLeague.get(league.id);
      return {
        leagueId: league.id,
        leagueName: league.name,
        sportId: league.sport_id,
        state: row ? row.status as FixtureSyncState : 'unknown',
        source: row?.source ?? null,
        lastAttemptAt: row?.last_attempt_at ?? '',
        lastCompletedAt: row?.last_completed_at ?? null,
        lastSuccessAt: row?.last_success_at ?? null,
      };
    });
}
