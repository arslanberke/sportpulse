import { supabase } from '@/services/supabase';

/**
 * Yildizlanan kulupler.
 *
 * Takipten ayri: takip "listede ne gorunsun", favori "hangisi one ciksin"
 * sorusuna cevap veriyor. Ligi takip eden kullanici icindeki bir kulubu
 * yildizlayabilir; bunun icin o kulubu ayrica takip etmesi gerekmez.
 */
export interface Favorites {
  teamIds: string[];
  playerIds: string[];
}

export async function fetchFavorites(): Promise<Favorites> {
  const { data, error } = await supabase.from('user_favorites').select('team_id, player_id');
  if (error) throw error;
  const rows = (data ?? []) as { team_id: string | null; player_id: string | null }[];
  return {
    teamIds: rows.map((row) => row.team_id).filter((id): id is string => Boolean(id)),
    playerIds: rows.map((row) => row.player_id).filter((id): id is string => Boolean(id)),
  };
}

export async function addFavoriteTeam(params: { userId: string; teamId: string }) {
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: params.userId, team_id: params.teamId });
  if (error) throw error;
}

export async function removeFavoriteTeam(params: { userId: string; teamId: string }) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', params.userId)
    .eq('team_id', params.teamId);
  if (error) throw error;
}

export async function addFavoritePlayer(params: { userId: string; playerId: string }) {
  const { error } = await supabase
    .from('user_favorites')
    .insert({ user_id: params.userId, player_id: params.playerId });
  if (error) throw error;
}

export async function removeFavoritePlayer(params: { userId: string; playerId: string }) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', params.userId)
    .eq('player_id', params.playerId);
  if (error) throw error;
}
