// Team catalog sync.
//
// Fixtures alone are not enough to know who plays in a league: between
// seasons, or when the next match is beyond the fixture sync window, the
// league looks empty even though its clubs are settled. This pulls the
// member list of every league straight from the provider and upserts it into
// `teams`, so the follow screens always have something to show.
//
// Squads change once or twice a year, so a daily run is plenty — see
// supabase/functions/README.md.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { hasTeams } from '../../../src/features/catalog/lib/team-sports.ts';
import {
    fetchLeagueTeams,
    isCompleteTeamList,
} from '../../../src/services/providers/index.ts';
import type { LeagueRef } from '../../../src/services/providers/types.ts';

// One provider call per league plus the throttle (~2s) fits comfortably, but
// the function still has a ~150s budget, so the catalog is walked in chunks.
const LEAGUE_CHUNKS = 4;
const CHUNK_SLOT_MS = 21_600_000; // 6 hours, must match the cron cadence

interface LeagueRow {
  id: string;
  sport_id: string;
  external_ids: Record<string, string>;
  /** False for cups, whose entry list is too broad to follow. */
  sync_teams: boolean;
}

Deno.serve(async (request) => {
  const authHeader = request.headers.get('Authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('SYNC_SECRET') ?? ''}`;
  if (!Deno.env.get('SYNC_SECRET') || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, sport_id, external_ids, sync_teams')
    .order('id');
  if (error) return new Response(error.message, { status: 500 });

  const params = new URL(request.url).searchParams;
  const chunkParam = params.get('chunk');
  // `?league=<uuid>` refreshes a single league, handy after adding one.
  const leagueParam = params.get('league');
  const chunk =
    chunkParam !== null
      ? Number(chunkParam) % LEAGUE_CHUNKS
      : Math.floor(Date.now() / CHUNK_SLOT_MS) % LEAGUE_CHUNKS;

  // F1/MotoGP/UFC entries are "teams" at the provider but nobody follows a
  // constructor here, so they are skipped rather than filling the catalog.
  // Cups opt out too: their entry list runs to the whole football pyramid.
  const all = ((leagues ?? []) as LeagueRow[]).filter(
    (league) => hasTeams(league.sport_id) && league.sync_teams !== false,
  );
  const selected = leagueParam
    ? all.filter((league) => league.id === leagueParam)
    : all.filter((_, index) => index % LEAGUE_CHUNKS === chunk);

  let upserted = 0;
  let dropped = 0;
  const emptyLeagues: string[] = [];
  const failures: string[] = [];

  for (const league of selected) {
    const ref: LeagueRef = {
      leagueId: league.id,
      sportId: league.sport_id,
      externalIds: league.external_ids,
    };

    try {
      const { provider, teams } = await fetchLeagueTeams(ref);
      if (teams.length === 0) {
        emptyLeagues.push(league.id);
        continue;
      }

      // A complete list is also the one to trust for the club's name; the
      // partial feeds label clubs "Fenerbahçe Volleyball" and the like.
      const authoritative = isCompleteTeamList(provider);

      const teamIds: string[] = [];
      for (const team of teams) {
        const { data: teamId, error: upsertError } = await supabase.rpc('upsert_team', {
          p_external_ids: team.externalIds,
          p_sport_id: league.sport_id,
          p_league_id: league.id,
          p_name: team.name,
          p_logo_url: team.logoUrl,
          p_rename: authoritative,
          p_aliases: team.aliases ?? [],
        });
        if (upsertError) {
          failures.push(`${team.name}: ${upsertError.message}`);
          continue;
        }
        if (typeof teamId === 'string') teamIds.push(teamId);
        upserted += 1;
      }

      // With a full entry list in hand, clubs that left the league can go —
      // otherwise last season's relegated sides linger in the follow screens.
      if (isCompleteTeamList(provider) && teamIds.length === teams.length) {
        const { data: removed, error: pruneError } = await supabase.rpc('set_league_roster', {
          p_league_id: league.id,
          p_team_ids: teamIds,
        });
        if (pruneError) failures.push(`prune ${league.id}: ${pruneError.message}`);
        else dropped += removed ?? 0;
      }
    } catch (fetchError) {
      failures.push(`league ${league.id}: ${String(fetchError)}`);
    }
  }

  return Response.json({
    chunk: leagueParam ? null : chunk,
    leagues: selected.length,
    upserted,
    dropped,
    emptyLeagues,
    failures,
  });
});
