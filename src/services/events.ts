import { dedupeEvents } from '@/features/events/lib/dedupe-events';
import { APISPORTS_LEAGUE_IDS, isCompleteLineup, type ApiSportsFixtureState } from '@/services/providers/api-sports-fixture';
import type { FootballLiveScore } from '@/services/providers/api-sports-live';
import { useLanguageStore } from '@/lib/i18n';
import { localizeEventTitle, localizeRound, localizeTeamName } from '@/lib/localize';
import { supabase } from '@/services/supabase';
import type {
    Channel,
    EventLineup,
    EventStats,
    LeagueStandings,
    SessionResults,
    SportEvent,
    Standings,
    UserFollow
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
  home_score: number | null;
  away_score: number | null;
  result_status: string | null;
  image_url: string | null;
  venue: string | null;
  venue_image_url: string | null;
  importance: number;
  external_ids: Record<string, string>;
  leagues: { name: string; artwork_url: string | null; logo_url: string | null } | null;
  home_team: { name: string; logo_url: string | null } | null;
  parent?: { title: string } | null;
  home_player?: { name: string; country_flag_url: string | null; rank?: number | null } | null;
  away_player?: { name: string; country_flag_url: string | null; rank?: number | null } | null;
  away_team: { name: string; logo_url: string | null } | null;
}

interface BroadcastRow {
  event_id: string;
  channels: { id: string; name: string; country_code: string; logo_url: string | null } | null;
}

function mapRow(row: EventRow): SportEvent {
  const language = useLanguageStore.getState().language;
  const team = (name: string | null | undefined) => (name ? localizeTeamName(name, language) : null);
  return {
    id: row.id,
    sportId: row.sport_id,
    leagueId: row.league_id,
    homeTeamId: row.home_team_id,
    parentEventId: row.parent_event_id ?? null,
    homePlayerId: row.home_player_id ?? null,
    awayPlayerId: row.away_player_id ?? null,
    awayTeamId: row.away_team_id,
    title: localizeEventTitle(row.title, row.sport_id, language),
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    resultStatus: row.result_status,
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
    homeTeamName: team(row.home_team?.name) ?? row.home_player?.name ?? null,
    awayTeamName: team(row.away_team?.name) ?? row.away_player?.name ?? null,
    homeTeamLogoUrl: row.home_team?.logo_url ?? row.home_player?.country_flag_url ?? null,
    awayTeamLogoUrl: row.away_team?.logo_url ?? row.away_player?.country_flag_url ?? null,
    homePlayerRank: row.home_player?.rank ?? null,
    awayPlayerRank: row.away_player?.rank ?? null,
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
  /** Yildizli kulupler: takip edilmeseler de tum turnuvalardaki maclari listeye girer. */
  favoriteTeamIds?: string[];
}): Promise<SportEvent[]> {
  const { from, to, follows } = params;

  const sportIds = follows.filter((f) => f.kind === 'sport').map((f) => f.sportId!);
  const leagueIds = follows.filter((f) => f.kind === 'league').map((f) => f.leagueId!);
  const teamIds = [
    ...new Set([
      ...follows.filter((f) => f.kind === 'team').map((f) => f.teamId!),
      ...(params.favoriteTeamIds ?? []),
    ]),
  ];
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
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, home_score, away_score, result_status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url), home_player:players!home_player_id (name, country_flag_url), away_player:players!away_player_id (name, country_flag_url)',
    )
    .or(bracketClauses.join(','))
    // Birlestirilmis kopyalar (migration 0069) listelenmez.
    .is('merged_into_event_id', null)
    .lt('starts_at', to.toISOString())
    .or(clauses.join(','))
    // Devam edenler de listede kalir. Yalnizca baslangica bakildiginda cok
    // gunlu bir etkinlik baslar baslamaz dusuyordu: Cincinnati Open sabah
    // basliyor, bir hafta suruyor ama ogleden sonra gorunmuyordu.
    .or(`starts_at.gte.${from.toISOString()},ends_at.gte.${from.toISOString()}`)
    .order('starts_at');
  if (error) throw error;
  return withTournamentNames(dedupeEvents((data as unknown as EventRow[]).map(mapRow)));
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
  const now = new Date();
  const seasonYear = now.getUTCMonth() < 6 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const from = new Date(Date.UTC(seasonYear, 6, 1));
  const to = new Date(now.getTime() + params.days * 86_400_000);
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, home_score, away_score, result_status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
    )
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .or(`home_team_id.eq.${params.teamId},away_team_id.eq.${params.teamId}`)
    // Birlestirilmis kopyalar (migration 0069) listelenmez.
    .is('merged_into_event_id', null)
    .order('starts_at');
  if (error) throw error;
  return dedupeEvents((data as unknown as EventRow[]).map(mapRow));
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
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, home_score, away_score, result_status, image_url, venue, venue_image_url, importance, external_ids, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url)',
    )
    .eq('league_id', leagueId)
    .eq('status', 'scheduled')
    // Birlestirilmis kopyalar (migration 0069) listelenmez.
    .is('merged_into_event_id', null)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as EventRow) : null;
}

export async function fetchEvent(id: string, depth = 0): Promise<SportEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, home_score, away_score, result_status, image_url, venue, venue_image_url, importance, external_ids, merged_into_event_id, leagues (name, artwork_url, logo_url), home_team:teams!home_team_id (name, logo_url), away_team:teams!away_team_id (name, logo_url), home_player:players!home_player_id (name, country_flag_url, rank), away_player:players!away_player_id (name, country_flag_url, rank)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  // Eski bir bildirim ya da baglanti birlestirilmis kopyayi acabilir; asil
  // kayit gosterilir (migration 0069).
  const mergedInto = (data as { merged_into_event_id?: string | null } | null)?.merged_into_event_id;
  if (mergedInto && depth < 3) return fetchEvent(mergedInto, depth + 1);
  return data ? mapRow(data as unknown as EventRow) : null;
}

/**
 * Confirmed lineups for one event, fetched live via the `event-lineup` Edge
 * Function. Returns null while official lineups aren't published yet (they
 * usually drop ~1h before kickoff).
 */
export async function fetchEventLineup(eventId: string, leagueName?: string | null, externalIds: Record<string, string> = {}, opts: { remote?: boolean } = {}): Promise<EventLineup | null> {
  // Once a complete lineup is cached server-side it stays valid forever —
  // finished matches read it directly without spending provider quota.
  const { data: cached } = await supabase
    .from('events')
    .select('lineup_cache')
    .eq('id', eventId)
    .maybeSingle();
  if (isCompleteLineup(cached?.lineup_cache)) return cached.lineup_cache as EventLineup;
  if (opts.remote === false) return null;

  if (externalIds.bsd) {
    const bsd = await supabase.functions.invoke<{ available: boolean; lineup: EventLineup | null }>(
      'event-bsd-data', { body: { eventId, kind: 'lineup' } },
    );
    if (!bsd.error && isCompleteLineup(bsd.data?.lineup ?? null)) return bsd.data!.lineup;
  }
  // TheSportsDB's free lineup response may contain only 2–3 players. For the
  // five covered leagues, API-Sports is the authoritative first choice and
  // only a complete 11+11 response is accepted.
  if (leagueName && leagueName in APISPORTS_LEAGUE_IDS) {
    const primary = await supabase.functions.invoke<{
      available: boolean;
      lineup: EventLineup | null;
    }>('event-api-sports-lineup', { body: { eventId } });
    if (!primary.error && isCompleteLineup(primary.data?.lineup ?? null)) return primary.data!.lineup;
  }

  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    lineup: EventLineup | null;
  }>('event-lineup', { body: { eventId } });
  if (error) throw error;
  const fallback = data?.lineup ?? null;
  return isCompleteLineup(fallback) ? fallback : null;
}

/**
 * Team stat rows and per-player ratings for one BSD-backed football match.
 * Fetched on demand (no cache): only called when a user opens a started
 * match's detail screen.
 */
export async function fetchEventStats(eventId: string, externalIds: Record<string, string> = {}): Promise<EventStats | null> {
  if (!externalIds.bsd) return null;
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    stats: EventStats | null;
  }>('event-bsd-data', { body: { eventId, kind: 'stats' } });
  if (error) return null;
  return data?.stats ?? null;
}

/**
 * Live score and key-events timeline for one football event, via the
 * `event-live` Edge Function. Scoped server-side to the five leagues with a
 * confirmed API-Sports league id; returns null for every other match rather
 * than guessing.
 */
/**
 * The cached live state (score + timeline) for a finished match. Stable data
 * — reading it avoids provider calls for games that ended long ago.
 */
export async function fetchEventLiveCache(eventId: string): Promise<ApiSportsFixtureState | null> {
  const { data, error } = await supabase
    .from('events')
    .select('live_cache')
    .eq('id', eventId)
    .maybeSingle();
  if (error) return null;
  return (data?.live_cache as ApiSportsFixtureState | null) ?? null;
}

export async function fetchEventLive(eventId: string, externalIds: Record<string, string> = {}): Promise<ApiSportsFixtureState | null> {
  if (externalIds.bsd) {
    const bsd = await supabase.functions.invoke<{ available: boolean; state: ApiSportsFixtureState | null }>(
      'event-bsd-data', { body: { eventId, kind: 'live' } },
    );
    if (!bsd.error && bsd.data?.state) return bsd.data.state;
  }
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    state: ApiSportsFixtureState | null;
  }>('event-live', { body: { eventId } });
  if (error) throw error;
  return data?.state ?? null;
}

/** ESPN scoreboard'larindan gelen futbol disi canli kayit. */
export interface EspnLiveEntry {
  id: string;
  sport: 'football' | 'basketball' | 'tennis' | 'f1' | 'ufc';
  series: string;
  name: string;
  statusDetail: string | null;
  home: string | null;
  away: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeLines: number[];
  awayLines: number[];
  startsAt: string;
}

/**
 * Every match/session currently reported as live, via the `live-scores` Edge
 * Function (one aggregated call, server-side cached): API-Sports for football,
 * ESPN scoreboards for NBA, tennis, F1 and UFC. Used only to answer "which of
 * my listed events are live right now" — the client never calls the upstreams
 * directly.
 */
export async function fetchLiveScores(): Promise<{
  scores: FootballLiveScore[];
  espn: EspnLiveEntry[];
}> {
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    scores: FootballLiveScore[];
    espn?: EspnLiveEntry[];
  }>('live-scores', { body: {} });
  if (error) throw error;
  return { scores: data?.scores ?? [], espn: data?.espn ?? [] };
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
 * Motorsport session results (or live running order) for one event, via the
 * `event-results` Edge Function (ESPN/F1 live timing/OpenF1 for F1, MotoGP
 * classes from MotoGP). Returns null while a session hasn't run yet
 * or isn't covered.
 */
export async function fetchEventResults(
  event: SportEvent,
): Promise<SessionResults | null> {
  if (event.sportId === 'f1' && event.leagueName !== 'Formula 1') return null;
  const { data, error } = await supabase.functions.invoke<{
    available: boolean;
    results: SessionResults | null;
  }>('event-results', { body: { eventId: event.id } });
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
 * Yayin kaynaginin kapsadigi gunler, spor bazinda ("YYYY-MM-DD" setleri).
 *
 * '' anahtari tum sporlari kapsayan kaynagi (sporekrani, yalnizca bugun),
 * 'football' anahtari BSD'nin ~7 gunluk ileri penceresini gosterir. Kapsanan
 * bir gune dusen ama mac bazli kaydi olmayan mac buyuk olasilikla o ulkede
 * yayinlanmiyordur; boyle maclarda lig varsayimini gostermek yanlis bilgi olur.
 */
export async function fetchBroadcastCoverage(
  countryCode: string,
): Promise<Map<string, Set<string>>> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('broadcast_coverage')
    .select('day, sport_id')
    .eq('country_code', countryCode)
    .gte('day', since);
  if (error) throw error;
  const bySport = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { day: string; sport_id: string }[]) {
    const set = bySport.get(row.sport_id) ?? new Set<string>();
    set.add(row.day);
    bySport.set(row.sport_id, set);
  }
  return bySport;
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
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, home_score, away_score, result_status, image_url, venue, venue_image_url, importance, external_ids, round, bracket, home_player:players!home_player_id (name, country_flag_url, rank), away_player:players!away_player_id (name, country_flag_url, rank), leagues (name, artwork_url, logo_url)',
    )
    .eq('parent_event_id', tournamentId)
    // Birlestirilmis kopyalar (migration 0069) listelenmez.
    .is('merged_into_event_id', null)
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
    round: row.round ? localizeRound(row.round, useLanguageStore.getState().language) : null,
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
      'id, sport_id, league_id, home_team_id, away_team_id, parent_event_id, home_player_id, away_player_id, title, starts_at, ends_at, status, home_score, away_score, result_status, image_url, venue, venue_image_url, importance, external_ids, round, bracket, home_player:players!home_player_id (name, country_flag_url, rank), away_player:players!away_player_id (name, country_flag_url, rank), leagues (name, artwork_url, logo_url)',
    )
    .or(`home_player_id.eq.${playerId},away_player_id.eq.${playerId}`)
    // Birlestirilmis kopyalar (migration 0069) listelenmez.
    .is('merged_into_event_id', null)
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
    round: row.round ? localizeRound(row.round, useLanguageStore.getState().language) : null,
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

/** Our event ids for ESPN event ids (links a player's game log to match pages). */
export async function fetchEventIdsByEspn(espnIds: string[]): Promise<Record<string, string>> {
  if (espnIds.length === 0) return {};
  const { data, error } = await supabase
    .from('events')
    .select('id, external_ids')
    .in('external_ids->>espn', espnIds)
    .is('merged_into_event_id', null);
  if (error) return {};
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; external_ids: Record<string, string> | null }[]) {
    const espn = row.external_ids?.espn;
    if (espn) out[espn] = row.id;
  }
  return out;
}
