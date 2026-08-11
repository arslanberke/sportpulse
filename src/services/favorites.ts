import { supabase } from '@/services/supabase';

/**
 * Yildizlanan kulupler.
 *
 * Takipten ayri: takip "listede ne gorunsun", favori "hangisi one ciksin"
 * sorusuna cevap veriyor. Ligi takip eden kullanici icindeki bir kulubu
 * yildizlayabilir; bunun icin o kulubu ayrica takip etmesi gerekmez.
 */
export async function fetchFavoriteTeamIds(): Promise<string[]> {
  const { data, error } = await supabase.from('user_favorites').select('team_id');
  if (error) throw error;
  return (data ?? []).map((row: { team_id: string }) => row.team_id);
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
