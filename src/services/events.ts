import { supabase } from '@/services/supabase';
import type {
  Channel,
  EventLineup,
  SessionResults,
  Standings,
  SportEvent,
  UserFollow,
} from '@/types';

interface EventRow {
  id: string;
  sport_id: string;
  league_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  title: string;
  starts_at: string;
  status: SportEvent['status'];
  image_url: string | null;
  venue: string | null;
  venue_image_url: string | null;
  importance: number;
  external_ids: Record<string, string>;
  leagues: { name: string; artwork_url: string | null; logo_url: string | null } | null;
  home_team: { name: string; logo_url: string | null } | null;
  away_team: { name: string; logo_url: string | null } | null;
}

interface BroadcastRow {
  event_id: string;
  channels: { id: string; name: string; country_code: string; logo_url: string | null } | null;
}

function mapRow(row: EventRow): SportEvent {
  return {
    id: row.id,
    sportId: row.sport_id,
    leagueId: row.league_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    title: row.title,
    startsAt: row.starts_at,
    status: row.status,
    imageUrl: row.image_url,
    venue: row.venue,
    venueImageUrl: row.venue_image_url,
    importance: row.importance,
    externalIds: row.external_ids,
    leagueName: row.leagues?.name ?? null,
    leagueArtworkUrl: row.leagues?.artwork_url ?? null,
    leagueBadgeUrl: row.leagues?.logo_url ?? null,
    homeTeamName: row.home_team?.name ?? null,
    awayTeamName: row.away_team?.name ?? null,
    homeTeamLogoUrl: row.home_team?.logo_url ?? null,
    awayTeamLogoUrl: row.away_team?.logo_url ?? null,
  };
}

/** Upcoming events between `from` and `to`, filtered by the user's follows. */
export async function fetchEvents(params: {
  from: Date;
  to: Date;
  follows: UserFollow[];
}): Promise<SportEvent[]> {
  const { from, to, follows } = params;

  const sportIds = follows.filter((f) => f.kind === 'sport').map((f) => f.sportId!);
  const leagueIds = follows.filter((f) => f.kind === 'league').map((f) => f.leagueId!);
  const teamIds = follows.filter((f) => f.kind === 'team').map((f) => f.teamId!);
  if (sportIds.length === 0 && leagueIds.length === 0 && teamIds.length === 0) return [];

  const clauses: string[] = [];
  if (sportIds.length > 0) clauses.push(`sport_id.in.(${sportIds.join(',')})`);
  if (leagueIds.length > 0) clauses.push(`league_id.in.(${leagueIds.join(',')})`);
  if (teamIds.length > 0) {
    clauses.push(`home_team_id.in.(${teamIds.join(',')})`);
    clauses.push(`away_team_id.in.(${teamIds.join(',')})`);
  }

  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, title, starts_at, status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
    )
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .or(clauses.join(','))
    .order('starts_at');
  if (error) throw error;
  return (data as unknown as EventRow[]).map(mapRow);
}

export async function fetchEvent(id: string): Promise<SportEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, title, starts_at, status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as EventRow) : null;
}

/**
 * Confirmed lineups for one event, fetched live via the `event-lineup` Edge
 * Function. Returns null while official lineups aren't published yet (they
 * usually drop ~1h before kickoff).
 */
export async function fetchEventLineup(eventId: string): Promise<EventLineup | null> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    lineup: EventLineup | null;
  }>('event-lineup', { body: { eventId } });
  if (error) throw error;
  return data?.lineup ?? null;
}

/**
 * AI "what you need to know" briefing for one event, generated server-side from
 * real form/head-to-head data. Returns null when there isn't enough grounded
 * data to summarize without inventing facts.
 */
export async function fetchEventBriefing(eventId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    briefing: string | null;
  }>('event-briefing', { body: { eventId } });
  if (error) throw error;
  return data?.briefing ?? null;
}

/**
 * Motorsport session results (F1) for one event, via the `event-results` Edge
 * Function. Returns null while a session hasn't run yet or isn't covered.
 */
export async function fetchEventResults(
  eventId: string,
): Promise<SessionResults | null> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    results: SessionResults | null;
  }>('event-results', { body: { eventId } });
  if (error) throw error;
  return data?.results ?? null;
}

/**
 * Championship (drivers'/riders') standings for the season of a motorsport
 * event, via the server-side `event-standings` Edge Function. Returns null
 * for non-motorsport events or uncovered series.
 */
export async function fetchEventStandings(
  eventId: string,
): Promise<Standings | null> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    standings: Standings | null;
  }>('event-standings', { body: { eventId } });
  if (error) throw error;
  return data?.standings ?? null;
}

/** Event-specific broadcast overrides for a set of events in a country. */
export async function fetchEventBroadcasts(params: {
  eventIds: string[];
  countryCode: string;
}): Promise<Map<string, Channel[]>> {
  if (params.eventIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('event_broadcasts')
    .select('event_id, channels (id, name, country_code, logo_url)')
    .in('event_id', params.eventIds)
    .eq('country_code', params.countryCode);
  if (error) throw error;

  const byEvent = new Map<string, Channel[]>();
  for (const row of data as unknown as BroadcastRow[]) {
    if (!row.channels) continue;
    const list = byEvent.get(row.event_id) ?? [];
    list.push({
      id: row.channels.id,
      name: row.channels.name,
      countryCode: row.channels.country_code,
      logoUrl: row.channels.logo_url,
    });
    byEvent.set(row.event_id, list);
  }
  return byEvent;
}
