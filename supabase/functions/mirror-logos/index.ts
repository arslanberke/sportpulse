// Copies team crests into our own storage bucket.
//
// Why: a third of the crests are hosted on upload.wikimedia.org, which rate
// limits (HTTP 429) and asks apps not to hotlink its files — badges would
// intermittently fail to load in the app. Each crest is fetched once, stored
// in the public `team-logos` bucket, and `teams.logo_url` is repointed there.
//
// The pass is incremental: it takes a bounded batch per run (the function has
// a ~150s budget and the upstreams throttle), so a cron every 30 minutes
// works through the backlog and afterwards only picks up changed crests.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { searchTeamCrest } from '../../../src/services/providers/thesportsdb.ts';

const BUCKET = 'team-logos';
const BATCH = 40;
/**
 * Arama basina bir istek gidiyor ve kaynak dakikada ~30 istege izin veriyor;
 * aynalama da ayni butceyi paylastigi icin tur basina az tutulur. Eksikler
 * birikmis olsa bile cron her 20 dakikada bir calisiyor.
 */
const CREST_LOOKUP_BATCH = 8;
// Wikimedia throttles bursts, so the batch is walked with a small gap.
const GAP_MS = 250;
// Wikimedia's user-agent policy: identify the app, not a browser.
const USER_AGENT = 'SportPulse/1.0 (sports fixture reminder app)';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

interface PendingTeam {
  id: string;
  logo_source_url: string;
}

interface MissingCrestTeam {
  id: string;
  name: string;
  sport_id: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Extension from the content type, falling back to the URL's own suffix. */
function extensionFor(contentType: string | null, url: string): string {
  const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (EXTENSIONS[type]) return EXTENSIONS[type];
  const fromUrl = url.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i)?.[1];
  return fromUrl ? fromUrl.toLowerCase().replace('jpeg', 'jpg') : 'png';
}

/**
 * Armasi olmayan kuluplerin armasini adiyla arayip doldurur.
 *
 * Fikstur ucu her kulup icin arma vermiyor (ESPN'de bazi kuluplerin alani bos
 * geliyor) ve arma olmayinca kartin ust bolumunde yer tutucu cikiyor.
 *
 * Yazma karari veritabaninda: `set_team_crest` bulunanin gercekten ayni kulup
 * oldugunu ad sadelestirmesiyle dogrular, tutmazsa arma yazilmaz. Arama benzer
 * adli baska bir kulubu dondurebilir ve yanlis arma, eksik armadan kotudur.
 */
async function fillMissingCrests(
  supabase: ReturnType<typeof createClient>,
  failures: string[],
): Promise<number> {
  const { data: missing, error } = await supabase
    .from('teams')
    .select('id, name, sport_id')
    .is('logo_url', null)
    .limit(CREST_LOOKUP_BATCH);
  if (error) {
    failures.push(`crest lookup: ${error.message}`);
    return 0;
  }

  let filled = 0;
  for (const team of (missing ?? []) as MissingCrestTeam[]) {
    try {
      const hit = await searchTeamCrest(team.name, team.sport_id);
      if (!hit) continue;

      const { data: written, error: writeError } = await supabase.rpc('set_team_crest', {
        p_team_id: team.id,
        p_found_name: hit.name,
        p_crest_url: hit.crestUrl,
      });
      if (writeError) {
        failures.push(`crest ${team.name}: ${writeError.message}`);
        continue;
      }
      if (written) filled += 1;
      else console.warn(`[crest] ${team.name} icin bulunan "${hit.name}" ad dogrulamasini gecmedi`);
    } catch (lookupError) {
      failures.push(`crest ${team.name}: ${String(lookupError)}`);
    }
  }
  return filled;
}

Deno.serve(async (request) => {
  const authHeader = request.headers.get('Authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('SYNC_SECRET') ?? ''}`;
  if (!Deno.env.get('SYNC_SECRET') || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const limitParam = Number(new URL(request.url).searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : BATCH;

  const failures: string[] = [];
  // Once eksik armalar aranir, sonra eldeki armalar aynalanir. Ayni turda
  // bulunan bir arma bir sonraki turda aynalanir; siralamanin onemi yok.
  const found = await fillMissingCrests(supabase, failures);

  const { data: pending, error } = await supabase.rpc('teams_needing_logo_mirror', {
    p_limit: limit,
  });
  if (error) return new Response(error.message, { status: 500 });

  let mirrored = 0;

  for (const team of (pending ?? []) as PendingTeam[]) {
    const source = team.logo_source_url;
    try {
      const response = await fetch(source, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) {
        failures.push(`${team.id}: HTTP ${response.status}`);
        await sleep(GAP_MS);
        continue;
      }

      const contentType = response.headers.get('Content-Type');
      const extension = extensionFor(contentType, source);
      const body = new Uint8Array(await response.arrayBuffer());
      if (body.byteLength === 0) {
        failures.push(`${team.id}: empty body`);
        continue;
      }

      const path = `${team.id}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, body, {
          contentType: contentType ?? 'image/png',
          upsert: true,
          cacheControl: '604800', // a week; crests rarely change
        });
      if (uploadError) {
        failures.push(`${team.id}: ${uploadError.message}`);
        continue;
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl, logo_mirrored_from: source })
        .eq('id', team.id);
      if (updateError) {
        failures.push(`${team.id}: ${updateError.message}`);
        continue;
      }

      mirrored += 1;
    } catch (fetchError) {
      failures.push(`${team.id}: ${String(fetchError)}`);
    }
    await sleep(GAP_MS);
  }

  const { count: remaining } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .not('logo_source_url', 'is', null)
    .is('logo_mirrored_from', null);

  const { count: crestless } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .is('logo_url', null);

  return Response.json({
    considered: pending?.length ?? 0,
    mirrored,
    crestsFound: found,
    crestless: crestless ?? null,
    remaining: remaining ?? null,
    failures,
  });
});
