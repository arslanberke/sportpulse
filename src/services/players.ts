import { supabase } from '@/services/supabase';
import type { Player } from '@/types';

const PLAYER_COLUMNS =
  'id, sport_id, league_id, name, country_code, country_flag_url, headshot_url, rank, rank_points, rank_synced_at, leagues (name)';

interface PlayerRow {
  id: string;
  sport_id: string;
  league_id: string | null;
  name: string;
  country_code: string | null;
  country_flag_url: string | null;
  headshot_url: string | null;
  rank: number | null;
  rank_points: number | null;
  rank_synced_at: string | null;
  leagues: { name: string } | null;
}

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    sportId: row.sport_id,
    leagueId: row.league_id,
    name: row.name,
    countryCode: row.country_code,
    countryFlagUrl: row.country_flag_url,
    headshotUrl: row.headshot_url,
    rank: row.rank,
    rankPoints: row.rank_points,
    rankSyncedAt: row.rank_synced_at,
    tourName: row.leagues?.name ?? null,
  };
}

export async function fetchPlayer(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .eq('id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlayer(data as unknown as PlayerRow) : null;
}

/**
 * Ada gore sporcu aramasi.
 *
 * Aksan ve Turkce karakter farklarini `src/lib/search` tarafi cozuyor; burada
 * sunucuya birden fazla yazilis sorulabildigi icin desen listesi aliniyor.
 */
export async function searchPlayers(patterns: string[]): Promise<Player[]> {
  if (patterns.length === 0) return [];
  const filter = patterns.map((pattern) => `name.ilike.%${pattern}%`).join(',');
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .or(filter)
    // Siralamasi olanlar once: "Sinner" arayan kisi 1 numarayi bekler, ayni adi
    // tasiyan siralamasiz bir oyuncuyu degil.
    .order('rank', { ascending: true, nullsFirst: false })
    .limit(15);
  if (error) throw error;
  return (data as unknown as PlayerRow[]).map(mapPlayer);
}
