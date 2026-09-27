// Bireysel sporlarda siralama senkronu.
//
// Tenis ve UFC'de karsilasan taraf bir kulup degil kisi. Bugune kadar bu
// branslarda yalnizca turnuvanin kendisi tutuluyordu ("US Open"), dolayisiyla ne
// bir oyuncuyu yildizlamak ne de profiline gitmek mumkun degildi.
//
// Siralama gunde bir kez yeter: ATP/WTA listeleri haftalik yenilenir, turnuva
// bitimlerinde degisir. Sirasi olmayan sporcular (mac ucundan gelenler) bu isle
// silinmez; `upsert_player` yalnizca yeni bir sira geldiginde o alani yaziyor.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fetchRankings } from '../../../src/services/providers/espn.ts';
import type { LeagueRef } from '../../../src/services/providers/types.ts';
import { createProviderDiagnostics } from '../_shared/provider-diagnostics.ts';

interface LeagueRow {
  id: string;
  sport_id: string;
  external_ids: Record<string, string>;
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

  // Siralamasi olan branslar: kisi bazli olanlar. Takim sporlarinda siralama
  // puan durumu tablosundan geliyor, sporcudan degil.
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, sport_id, external_ids')
    .in('sport_id', ['tennis'])
    .order('id');
  if (error) return new Response(error.message, { status: 500 });

  const failures: string[] = [];
  let upserted = 0;
  const diagnostics = createProviderDiagnostics('sync-rankings', async (issue) => {
    const { error } = await supabase.from('provider_issues').insert({
      run_id: issue.runId,
      job: issue.job,
      league_id: issue.leagueId,
      source: issue.source,
      kind: issue.kind,
      http_status: issue.status,
      observed_at: issue.observedAt,
    });
    if (error) throw error;
  });

  for (const league of (leagues ?? []) as LeagueRow[]) {
    const ref: LeagueRef = {
      leagueId: league.id,
      sportId: league.sport_id,
      externalIds: league.external_ids,
      onIssue: diagnostics.forLeague(league.id),
    };

    try {
      const players = await fetchRankings(ref);
      for (const player of players) {
        const { error: upsertError } = await supabase.rpc('upsert_player', {
          p_provider: 'espn',
          p_external_id: player.externalId,
          p_sport_id: league.sport_id,
          p_name: player.name,
          // Sira ancak turuyla anlamli: tenis icinde ATP'nin ve WTA'nin ayri
          // birincisi var.
          p_league_id: league.id,
          p_country_code: player.countryCode,
          p_country_flag_url: player.countryFlagUrl,
          p_headshot_url: player.headshotUrl,
          p_rank: player.rank,
          p_rank_points: player.points,
        });
        if (upsertError) {
          failures.push(`${player.name}: ${upsertError.message}`);
          continue;
        }
        upserted += 1;
      }
    } catch (fetchError) {
      ref.onIssue?.({ source: 'espn.rankings', kind: 'request', status: null });
      failures.push(`league ${league.id}: ${fetchError instanceof Error ? fetchError.name : 'UnknownError'}`);
    }
  }

  const diagnosticResult = await diagnostics.flush();
  for (const issue of diagnostics.issues) {
    failures.push(`${issue.source} ${issue.status ?? issue.kind} (league ${issue.leagueId})`);
  }
  if (!diagnosticResult.diagnosticsPersisted) failures.push('provider diagnostics could not be persisted');
  return Response.json({
    ...diagnosticResult,
    status: failures.length > 0 ? (upserted === 0 ? 'failed' : 'degraded') : 'ok',
    leagues: leagues?.length ?? 0,
    upserted,
    failures,
  }, { status: failures.length > 0 && upserted === 0 ? 502 : 200 });
});
