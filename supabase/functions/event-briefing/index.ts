// AI "what you need to know" briefing for a single event.
//
// Runs server-side so the Gemini key stays private and the client never calls
// the model or data provider directly. To avoid hallucination the model is fed
// ONLY real facts we fetch (head-to-head + recent form from apifootball.com)
// and is told to say when something is unknown. Results are cached on the event
// so we don't re-run the model on every view.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fetchApiFootballContext } from '../../../src/services/providers/apifootball.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Briefings change slowly (form/H2H), so cache them for several hours.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GEMINI_MODEL = 'gemini-flash-latest';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

interface EventRow {
  external_ids: Record<string, string>;
  sport_id: string;
  starts_at: string;
  venue: string | null;
  briefing_cache: string | null;
  briefing_cached_at: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
  league: { name: string } | null;
}

async function generate(
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();
  return text || null;
}

function buildPrompt(
  home: string,
  away: string,
  league: string,
  facts: string[],
): string {
  const factBlock = facts.length
    ? facts.map((f) => `- ${f}`).join('\n')
    : '- (Ek istatistik verisi yok.)';
  return [
    'Sen bir spor editörüsün. AŞAĞIDAKİ GERÇEKLER dışında hiçbir bilgi uydurma; emin olmadığın şeyi yazma.',
    `${home} - ${away} (${league}) etkinliği için taraftara "bilinmesi gerekenler" özeti yaz.`,
    'Türkçe, en fazla 4 kısa madde, her madde tek cümle. Markdown başlık kullanma, sadece "- " ile maddeler.',
    'Eğer aynı takımlar yakın tarihte oynadıysa ve bu iki ayaklı bir eşleşme olabilirse ilk maç skorunu belirt.',
    '',
    'GERÇEKLER:',
    factBlock,
  ].join('\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let eventId: string | null = null;
  try {
    const body = (await request.json()) as { eventId?: unknown };
    if (typeof body.eventId === 'string') eventId = body.eventId;
  } catch {
    // Fall through to the missing-id error below.
  }
  if (!eventId) return json({ error: 'eventId is required' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('events')
    .select(
      'external_ids, sport_id, starts_at, venue, briefing_cache, briefing_cached_at, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name), league:leagues(name)',
    )
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: 'event not found' }, 404);

  if (data.briefing_cache && data.briefing_cached_at) {
    const age = Date.now() - new Date(data.briefing_cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      return json({ available: true, briefing: data.briefing_cache });
    }
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json({ available: false, briefing: null });

  const home = data.home_team?.name ?? '';
  const away = data.away_team?.name ?? '';
  const league = data.league?.name ?? '';

  // Grounding facts: only football has H2H/form via apifootball.com today.
  const facts: string[] = [];
  const footballKey = Deno.env.get('API_FOOTBALL_KEY');
  const fixtureId = (data.external_ids ?? {}).apifootball;
  if (data.sport_id === 'football' && footballKey && fixtureId) {
    try {
      const ctx = await fetchApiFootballContext(fixtureId, footballKey);
      if (ctx) {
        for (const h of ctx.headToHead)
          facts.push(`Aralarındaki son maç: ${h}`);
        for (const f of ctx.homeForm) facts.push(`${home} son maç: ${f}`);
        for (const f of ctx.awayForm) facts.push(`${away} son maç: ${f}`);
      }
    } catch {
      // Fall through with whatever facts we have.
    }
  }

  // Not enough grounding to say anything useful without inventing it.
  if (facts.length === 0 || !home || !away) {
    return json({ available: false, briefing: null });
  }

  const briefing = await generate(
    geminiKey,
    buildPrompt(home, away, league, facts),
  );
  if (!briefing) return json({ available: false, briefing: null });

  await supabase
    .from('events')
    .update({
      briefing_cache: briefing,
      briefing_cached_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  return json({ available: true, briefing });
});
