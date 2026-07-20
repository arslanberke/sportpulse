import { supabase } from '@/services/supabase';
import type { FollowKind, UserFollow } from '@/types';

interface FollowRow {
  id: string;
  kind: FollowKind;
  sport_id: string | null;
  league_id: string | null;
  team_id: string | null;
  created_at: string;
}

export async function fetchFollows(): Promise<UserFollow[]> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('id, kind, sport_id, league_id, team_id, created_at');
  if (error) throw error;
  return (data as FollowRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    sportId: row.sport_id,
    leagueId: row.league_id,
    teamId: row.team_id,
    createdAt: row.created_at,
  }));
}

export async function addFollow(params: {
  userId: string;
  kind: FollowKind;
  targetId: string;
}) {
  const { error } = await supabase.from('user_follows').insert({
    user_id: params.userId,
    kind: params.kind,
    sport_id: params.kind === 'sport' ? params.targetId : null,
    league_id: params.kind === 'league' ? params.targetId : null,
    team_id: params.kind === 'team' ? params.targetId : null,
  });
  if (error) throw error;
}

export async function removeFollow(id: string) {
  const { error } = await supabase.from('user_follows').delete().eq('id', id);
  if (error) throw error;
}
