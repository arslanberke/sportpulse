import { supabase } from '@/services/supabase';
import type { Channel, League, Sport, Team } from '@/types';

interface SportRow {
  id: string;
  name_en: string;
  name_tr: string;
  icon: string;
  sort_order: number;
}

interface LeagueRow {
  id: string;
  sport_id: string;
  name: string;
  country_code: string | null;
  logo_url: string | null;
  external_ids: Record<string, string>;
}

interface TeamRow {
  id: string;
  sport_id: string;
  league_id: string | null;
  name: string;
  logo_url: string | null;
  external_ids: Record<string, string>;
}

export async function fetchSports(): Promise<Sport[]> {
  const { data, error } = await supabase
    .from('sports')
    .select('id, name_en, name_tr, icon, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (data as SportRow[]).map((row) => ({
    id: row.id,
    nameEn: row.name_en,
    nameTr: row.name_tr,
    icon: row.icon,
    sortOrder: row.sort_order,
  }));
}

export async function fetchLeagues(): Promise<League[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, sport_id, name, country_code, logo_url, external_ids')
    .order('name');
  if (error) throw error;
  return (data as LeagueRow[]).map((row) => ({
    id: row.id,
    sportId: row.sport_id,
    name: row.name,
    countryCode: row.country_code,
    logoUrl: row.logo_url,
    externalIds: row.external_ids,
  }));
}

export async function fetchTeams(leagueId?: string): Promise<Team[]> {
  let query = supabase
    .from('teams')
    .select('id, sport_id, league_id, name, logo_url, external_ids')
    .order('name');
  if (leagueId) query = query.eq('league_id', leagueId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as TeamRow[]).map((row) => ({
    id: row.id,
    sportId: row.sport_id,
    leagueId: row.league_id,
    name: row.name,
    logoUrl: row.logo_url,
    externalIds: row.external_ids,
  }));
}

interface LeagueChannelRow {
  league_id: string;
  country_code: string;
  channels: { id: string; name: string; country_code: string; logo_url: string | null } | null;
}

/** Default channels per league for a country (from the static mapping). */
export async function fetchLeagueChannels(countryCode: string): Promise<Map<string, Channel[]>> {
  const { data, error } = await supabase
    .from('league_channels')
    .select('league_id, country_code, channels (id, name, country_code, logo_url)')
    .eq('country_code', countryCode);
  if (error) throw error;

  const byLeague = new Map<string, Channel[]>();
  for (const row of data as unknown as LeagueChannelRow[]) {
    if (!row.channels) continue;
    const channel: Channel = {
      id: row.channels.id,
      name: row.channels.name,
      countryCode: row.channels.country_code,
      logoUrl: row.channels.logo_url,
    };
    const list = byLeague.get(row.league_id) ?? [];
    list.push(channel);
    byLeague.set(row.league_id, list);
  }
  return byLeague;
}
