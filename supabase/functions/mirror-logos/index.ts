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

const BUCKET = 'team-logos';
const BATCH = 40;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Extension from the content type, falling back to the URL's own suffix. */
function extensionFor(contentType: string | null, url: string): string {
  const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (EXTENSIONS[type]) return EXTENSIONS[type];
  const fromUrl = url.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i)?.[1];
  return fromUrl ? fromUrl.toLowerCase().replace('jpeg', 'jpg') : 'png';
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

  const { data: pending, error } = await supabase.rpc('teams_needing_logo_mirror', {
    p_limit: limit,
  });
  if (error) return new Response(error.message, { status: 500 });

  let mirrored = 0;
  const failures: string[] = [];

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

  return Response.json({
    considered: pending?.length ?? 0,
    mirrored,
    remaining: remaining ?? null,
    failures,
  });
});
