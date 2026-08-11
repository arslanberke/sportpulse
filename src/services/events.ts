import { supabase } from '@/services/supabase';
import type {
    Channel,
    EventLineup,
    LeagueStandings,
    SessionResults,
    SportEvent,
    Standings,
    UserFollow,
} from '@/types';

interface EventRow {
  id: string;
  sport_id: string;
  league_id: string | null;
  home_team_id: string | null;
  parent_event_id?: string | null;
  home_player_id?: string | null;
  away_player_id?: string | null;
  away_team_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: SportEvent['status'];
  image_url: string | null;
  venue: string | null;
  venue_image_url: string | null;
  importance: number;
  external_ids: Record<string, string>;
  leagues: { name: string; artwork_url: string | null; logo_url: string | null } | null;
  home_team: { name: string; logo_url: string | null } | null;
  parent?: { title: string } | null;
  home_player?: { name: string; country_flag_url: string | null } | null;
  away_player?: { name: string; country_flag_url: string | null } | null;
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
    parentEventId: row.parent_event_id ?? null,
    homePlayerId: row.home_player_id ?? null,
    awayPlayerId: row.away_player_id ?? null,
    awayTeamId: row.away_team_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    status: row.status,
    imageUrl: row.image_url,
    venue: row.venue,
    venueImageUrl: row.venue_image_url,
    importance: row.importance,
    externalIds: row.external_ids,
    // Kura macinda turnuva adi daha bilgilendirici: "Cincinnati Open" ile
    // "WTA Tour" arasinda fark var.
    leagueName: row.parent?.title ?? row.leagues?.name ?? null,
    leagueArtworkUrl: row.leagues?.artwork_url ?? null,
    leagueBadgeUrl: row.leagues?.logo_url ?? null,
    homeTeamName: row.home_team?.name ?? row.home_player?.name ?? null,
    awayTeamName: row.away_team?.name ?? row.away_player?.name ?? null,
    homeTeamLogoUrl: row.home_team?.logo_url ?? row.home_player?.country_flag_url ?? null,
    awayTeamLogoUrl: row.away_team?.logo_url ?? row.away_player?.country_flag_url ?? null,
  };
}


/**
 * Kura maclarinin turnuva adlari.
 *
 * Ayri bir istek gerekiyor: kendine referans veren bag PostgREST uzerinden
 * birlestirilemiyor. `events!parent_event_id` ipucu ters yonu (cocuklar)
 * cozuyor ve bos dizi donuyor, kisit adiyla denendiginde de bag hic bulunamiyor
 * ("Could not find a relationship between 'events' and 'events'").
 *
 * Turnuva adi lig adindan daha bilgilendirici: "Cincinnati Open" ile "WTA Tour"
 * arasinda fark var.
 */
async function fetchParentTitles(parentIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(parentIds)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from('events').select('id, title').in('id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((row: { id: string; title: string }) => [row.id, row.title]));
}

/** Kura maclarinin yarisma adini turnuva adiyla degistirir. */
async function withTournamentNames(events: SportEvent[]): Promise<SportEvent[]> {
  const parentIds = events
    .map((event) => event.parentEventId)
    .filter((id): id is string => Boolean(id));
  if (parentIds.length === 0) return events;

  const titles = await fetchParentTitles(parentIds);
  return events.map((event) =>
    event.parentEventId && titles.has(event.parentEventId)
      ? { ...event, leagueName: titles.get(event.parentEventId)! }
      : event,
  );
}

/** Upcoming events between `from` and `to`, filtered by the user's follows. */
export async function fetchEvents(params: {
  from: Date;
  to: Date;
  follows: UserFollow[];
  /**
   * Yildizlanan sporcular. Kura maclari listeye girmiyor ama bu oyuncularin
   * maclari istisna: kullanici Sinner'i yildizladiysa onun macini listede
   * gormek istiyor, turnuvanin 163 macini degil.
   */
  favoritePlayerIds?: string[];
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

  // Kura maclari listeye girmez: bir tenis turnuvasi yuzlerce karsilasma demek
  // (Toronto 217) ve bunlar takip edilen futbol maclarini bogar. Liste
  // turnuvanin kendisini gosteriyor, kura turnuvanin icinde. Istisna yildizlanan
  // sporcular: onlarin maclari listede gorunuyor.
  const favoriteIds = params.favoritePlayerIds ?? [];
  const bracketClauses = ['parent_event_id.is.null'];
  if (favoriteIds.length > 0) {
    bracketClauses.push(`home_player_id.in.(${favoriteIds.join(',')})`);
    bracketClauses.push(`away_player_id.in.(${favoriteIds.join(',')})`);
  }

  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url), home_player:players!home_player_id (name, country_flag_url), away_player:players!away_player_id (name, country_flag_url)',
    )
    .or(bracketClauses.join(','))
    .lt('starts_at', to.toISOString())
    .or(clauses.join(','))
    // Devam edenler de listede kalir. Yalnizca baslangica bakildiginda cok
    // gunlu bir etkinlik baslar baslamaz dusuyordu: Cincinnati Open sabah
    // basliyor, bir hafta suruyor ama ogleden sonra gorunmuyordu.
    .or(`starts_at.gte.${from.toISOString()},ends_at.gte.${from.toISOString()}`)
    .order('starts_at');
  if (error) throw error;
  return withTournamentNames((data as unknown as EventRow[]).map(mapRow));
}

/**
 * A club's own fixture list: everything ahead of it in any competition. The
 * team page groups these by league, so a cup tie never sits between two
 * league games.
 */
export async function fetchTeamEvents(params: {
  teamId: string;
  days: number;
}): Promise<SportEvent[]> {
  const from = new Date();
  const to = new Date(from.getTime() + params.days * 86_400_000);
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
    )
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .or(`home_team_id.eq.${params.teamId},away_team_id.eq.${params.teamId}`)
    .order('starts_at');
  if (error) throw error;
  return (data as unknown as EventRow[]).map(mapRow);
}

/**
 * Bir yarismanin sirada bekleyen ilk etkinligi.
 *
 * Sema sezon tarihi tutmadigi icin "lig ne zaman basliyor" sorusu ancak
 * bilinen ilk maca bakilarak yanitlanabilir. Takip listesinden bagimsizdir:
 * kullanici henuz takip etmedigi bir lige de girebilir.
 */
export async function fetchLeagueNextEvent(leagueId: string): Promise<SportEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
    )
    .eq('league_id', leagueId)
    .eq('status', 'scheduled')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as EventRow) : null;
}

export async function fetchEvent(id: string): Promise<SportEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
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

/**
 * Team-league (basketball) conference standings for the league of an event,
 * via the server-side `event-standings` Edge Function. Returns null for
 * non-basketball events or uncovered leagues.
 */
export async function fetchEventLeagueStandings(
  eventId: string,
): Promise<LeagueStandings | null> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    leagueStandings: LeagueStandings | null;
  }>('event-standings', { body: { eventId } });
  if (error) throw error;
  return data?.leagueStandings ?? null;
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

/**
 * Yayin kaynaginin kapsadigi gunler ("YYYY-MM-DD").
 *
 * Kapsanan bir gune dusen ama mac bazli kaydi olmayan mac buyuk olasilikla o
 * ulkede yayinlanmiyordur; boyle maclarda lig varsayimini gostermek yanlis
 * bilgi olur. Gunler yerine yalnizca son birkaci okunur: kaynak gunluk yazar,
 * eski gunlerin gecmis maclara etkisi yoktur.
 */
export async function fetchBroadcastCoverage(countryCode: string): Promise<Set<string>> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('broadcast_coverage')
    .select('day')
    .eq('country_code', countryCode)
    .gte('day', since);
  if (error) throw error;
  return new Set((data ?? []).map((row: { day: string }) => row.day));
}

/**
 * Bir turnuvanin kurasi: tekler maclari.
 *
 * Ciftler suzuluyor, eleme turlari suzulmuyor. Ilk halinde eleme de gizlenmisti
 * ama yeni baslayan turnuvalarda kart bombos kaliyor: ana tablo kurasi sonradan
 * cekildigi icin Cincinnati'nin ilk gunu 48 macin tamami elemeydi. Bunun yerine
 * siralama tur onemine gore yapiliyor -- final ve ceyrek final ustte, eleme
 * altta.
 *
 * Kayitlar silinmiyor, yalnizca burada suzuluyor: ciftleri isteyen bir ekran
 * ayni satirlari kullanabilir.
 */
export async function fetchTournamentBracket(tournamentId: string): Promise<SportEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, image_url, venue, venue_image_url, importance, external_ids, round, bracket, home_player:players!home_player_id (name, country_flag_url, rank), away_player:players!away_player_id (name, country_flag_url, rank), leagues (name, artwork_url, logo_url)',
    )
    .eq('parent_event_id', tournamentId)
    .not('bracket', 'ilike', '%Doubles%')
    .order('starts_at');
  if (error) throw error;

  return (data as unknown as (EventRow & {
    round: string | null;
    bracket: string | null;
    home_player: { name: string; country_flag_url: string | null; rank: number | null } | null;
    away_player: { name: string; country_flag_url: string | null; rank: number | null } | null;
  })[]).map((row) => ({
    ...mapRow(row),
    round: row.round,
    bracket: row.bracket,
    // Kura kartlari kisi adini ve bayragini gosteriyor; kulup alanlari bos.
    homeTeamName: row.home_player?.name ?? null,
    awayTeamName: row.away_player?.name ?? null,
    homeTeamLogoUrl: row.home_player?.country_flag_url ?? null,
    awayTeamLogoUrl: row.away_player?.country_flag_url ?? null,
    homePlayerRank: row.home_player?.rank ?? null,
    awayPlayerRank: row.away_player?.rank ?? null,
  }));
}

/**
 * Bir sporcunun maclari: yaklasan karsilasmalar, turnuva adiyla.
 *
 * Kura maclari ana listeye girmiyor (bkz. `fetchEvents`), ama sporcunun kendi
 * sayfasinda gosterilecek olan tam olarak bunlar.
 */
export async function fetchPlayerEvents(playerId: string): Promise<SportEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, image_url, venue, venue_image_url, importance, external_ids, round, bracket, home_player:players!home_player_id (name, country_flag_url, rank), away_player:players!away_player_id (name, country_flag_url, rank), leagues (name, artwork_url, logo_url)',
    )
    .or(`home_player_id.eq.${playerId},away_player_id.eq.${playerId}`)
    .gte('starts_at', new Date(Date.now() - 3 * 3_600_000).toISOString())
    .order('starts_at')
    .limit(20);
  if (error) throw error;

  const rows = (data as unknown as (EventRow & {
    round: string | null;
    bracket: string | null;
    home_player: { name: string; country_flag_url: string | null; rank: number | null } | null;
    away_player: { name: string; country_flag_url: string | null; rank: number | null } | null;
  })[]).map((row) => ({
    ...mapRow(row),
    round: row.round,
    bracket: row.bracket,
    leagueName: row.leagues?.name ?? null,
    homeTeamName: row.home_player?.name ?? null,
    awayTeamName: row.away_player?.name ?? null,
    homeTeamLogoUrl: row.home_player?.country_flag_url ?? null,
    awayTeamLogoUrl: row.away_player?.country_flag_url ?? null,
    homePlayerRank: row.home_player?.rank ?? null,
    awayPlayerRank: row.away_player?.rank ?? null,
  }));

  // Kartta yarismanin adi turnuva olsun: "ATP Tour" degil "Cincinnati Open".
  return withTournamentNames(rows);
}
