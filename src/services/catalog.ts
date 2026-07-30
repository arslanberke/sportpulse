import { supabase } from '@/services/supabase';
import type { Channel, League, Sport, Team } from '@/types';

/** Rows per kind in a catalog search; enough to scroll, short enough to scan. */
const SEARCH_LIMIT = 20;

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
  season_start: string | null;
  season_end: string | null;
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
    .select('id, sport_id, name, country_code, logo_url, external_ids, season_start, season_end')
    .order('name');
  if (error) throw error;
  return (data as LeagueRow[]).map((row) => ({
    id: row.id,
    sportId: row.sport_id,
    name: row.name,
    countryCode: row.country_code,
    logoUrl: row.logo_url,
    externalIds: row.external_ids,
    seasonStart: row.season_start,
    seasonEnd: row.season_end,
  }));
}

export async function fetchTeams(leagueId?: string): Promise<Team[]> {
  // Membership lives in league_teams because a club plays in several
  // competitions; teams.league_id is only its home league.
  if (leagueId) {
    const { data, error } = await supabase
      .from('league_teams')
      .select('teams (id, sport_id, league_id, name, logo_url, external_ids)')
      .eq('league_id', leagueId);
    if (error) throw error;
    return (data as unknown as { teams: TeamRow | null }[])
      .map((row) => row.teams)
      .filter((row): row is TeamRow => row !== null)
      .map((row) => ({
        id: row.id,
        sportId: row.sport_id,
        leagueId: row.league_id,
        name: row.name,
        logoUrl: row.logo_url,
        externalIds: row.external_ids,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data, error } = await supabase
    .from('teams')
    .select('id, sport_id, league_id, name, logo_url, external_ids')
    .order('name');
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

export async function fetchTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, sport_id, league_id, name, logo_url, external_ids')
    .eq('id', teamId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as TeamRow;
  return {
    id: row.id,
    sportId: row.sport_id,
    leagueId: row.league_id,
    name: row.name,
    logoUrl: row.logo_url,
    externalIds: row.external_ids,
  };
}

/**
 * Every competition a club takes part in — its league plus the cups it
 * qualified for. Drives both the fixture grouping and the standings tabs.
 */
export async function fetchTeamLeagues(teamId: string): Promise<League[]> {
  const { data, error } = await supabase
    .from('league_teams')
    .select('leagues (id, sport_id, name, country_code, logo_url, external_ids, season_start, season_end)')
    .eq('team_id', teamId);
  if (error) throw error;
  return (data as unknown as { leagues: LeagueRow | null }[])
    .map((row) => row.leagues)
    .filter((row): row is LeagueRow => row !== null)
    .map((row) => ({
      id: row.id,
      sportId: row.sport_id,
      name: row.name,
      countryCode: row.country_code,
      logoUrl: row.logo_url,
      externalIds: row.external_ids,
      seasonStart: row.season_start,
      seasonEnd: row.season_end,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Free-text lookup over leagues and teams, so a user can jump straight to
 * "Galatasaray" without walking sport → league → team. Sports are matched in
 * the client (there are seven of them and they are already loaded).
 */
export async function searchCatalog(
  term: string,
): Promise<{ leagues: League[]; teams: Team[] }> {
  // ilike'in joker karakterleri kacirilir: aksi halde "%" yazan kullaniciya tum
  // katalog, "_" yazana ise tek harfli her ad eslesir.
  const escaped = term.trim().replace(/[\\%_]/g, (char) => `\\${char}`);
  const pattern = `%${escaped}%`;
  const [leagueResult, teamResult] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, sport_id, name, country_code, logo_url, external_ids, season_start, season_end')
      .ilike('name', pattern)
      .order('name')
      .limit(SEARCH_LIMIT),
    supabase
      .from('teams')
      .select('id, sport_id, league_id, name, logo_url, external_ids')
      .ilike('name', pattern)
      .order('name')
      .limit(SEARCH_LIMIT),
  ]);
  if (leagueResult.error) throw leagueResult.error;
  if (teamResult.error) throw teamResult.error;

  return {
    leagues: (leagueResult.data as LeagueRow[]).map((row) => ({
      id: row.id,
      sportId: row.sport_id,
      name: row.name,
      countryCode: row.country_code,
      logoUrl: row.logo_url,
      externalIds: row.external_ids,
      seasonStart: row.season_start,
      seasonEnd: row.season_end,
    })),
    teams: (teamResult.data as TeamRow[]).map((row) => ({
      id: row.id,
      sportId: row.sport_id,
      leagueId: row.league_id,
      name: row.name,
      logoUrl: row.logo_url,
      externalIds: row.external_ids,
    })),
  };
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
