// Team squad resolver: given our internal teams.id, returns the club's current
// squad from whichever provider can serve it.
//
//   external_ids.bsd        -> BSD /teams/{id}/squad/   (football, profiles exist)
//   external_ids.thesportsdb -> lookup_all_players.php   (any sport, view-only rows)
//
// Players are not synced into our database; every call is a live upstream
// request, so the squad list reflects the provider's current roster.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}
function number(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

async function hasUser(supabase: ReturnType<typeof createClient>, request: Request) {
  const jwt = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  return jwt ? (await supabase.auth.getUser(jwt)).data.user !== null : false;
}

const bsdPhoto = (id: number) => `https://sports.bzzoiro.com/img/player/${id}/?sor=true&bg=transparent`;

// TheSportsDB sport names differ from our slugs ("Soccer" vs "football");
// rows from the wrong branch are dropped so a shared club id cannot mix in.
const TSDB_SPORT: Record<string, string> = {
  football: 'Soccer',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  f1: 'Motorsport',
  motogp: 'Motorsport',
  ufc: 'Fighting',
};

interface SquadMember {
  id: string;
  /** BSD oyuncu kimligi; yalnizca bunu tasiyan satirlar profil acabilir. */
  bsdId: string | null;
  name: string;
  position: string | null;
  jerseyNumber: number | null;
  nationality: string | null;
  dateOfBirth: string | null;
  availability: string | null;
  injuryType: string | null;
  injuryExpectedReturn: string | null;
  photoUrl: string | null;
}

async function bsdSquad(bsdTeamId: string, key: string): Promise<SquadMember[]> {
  const response = await fetch(`https://sports.bzzoiro.com/api/v2/teams/${bsdTeamId}/squad/`, {
    headers: { Authorization: `Token ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const body = await response.json();
  const rows = Array.isArray(body?.players) ? body.players : [];
  return rows.map((value: unknown) => {
    const p = object(value);
    const pid = number(p.id);
    return {
      id: String(pid ?? p.name),
      bsdId: pid !== null ? String(pid) : null,
      name: text(p.name) ?? '',
      position: text(p.position),
      jerseyNumber: number(p.jersey_number),
      nationality: text(p.nationality),
      dateOfBirth: text(p.date_of_birth),
      availability: text(p.availability),
      injuryType: text(p.injury_type),
      injuryExpectedReturn: text(p.injury_expected_return),
      photoUrl: pid !== null ? bsdPhoto(pid) : null,
    } satisfies SquadMember;
  });
}

async function tsdbSquad(tsdbTeamId: string, sportId: string | null): Promise<SquadMember[]> {
  const response = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${encodeURIComponent(tsdbTeamId)}`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(`http_${response.status}`);
  const body = await response.json();
  const rows = Array.isArray(body?.player) ? body.player : [];
  const expected = sportId ? TSDB_SPORT[sportId] : undefined;
  return rows
    .map(object)
    .filter((p) => !expected || text(p.strSport) === expected)
    .map((p) => {
      const pid = text(p.idPlayer);
      return {
        id: `tsdb:${pid ?? p.strPlayer}`,
        bsdId: null,
        name: text(p.strPlayer) ?? '',
        position: text(p.strPosition),
        jerseyNumber: number(p.strNumber),
        nationality: text(p.strNationality),
        dateOfBirth: text(p.dateBorn),
        availability: null,
        injuryType: null,
        injuryExpectedReturn: null,
        photoUrl: text(p.strCutout) ?? text(p.strThumb) ?? text(p.strRender),
      } satisfies SquadMember;
    });
}

function byJerseyThenName(a: SquadMember, b: SquadMember) {
  if (a.jerseyNumber !== null && b.jerseyNumber !== null) return a.jerseyNumber - b.jerseyNumber;
  if (a.jerseyNumber !== null) return -1;
  if (b.jerseyNumber !== null) return 1;
  return a.name.localeCompare(b.name);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let teamId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body.teamId === 'string') teamId = body.teamId;
  } catch { /* govde yok */ }
  if (!teamId) return json({ error: 'teamId required' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  if (!(await hasUser(supabase, request))) return json({ error: 'unauthorized' }, 401);

  const { data: team } = await supabase
    .from('teams')
    .select('name, sport_id, external_ids')
    .eq('id', teamId)
    .maybeSingle();
  if (!team) return json({ players: [] });

  let ids = object(team.external_ids);

  // Kulup her ligde ayri satir; secilen satir kimliksizse ayni kulubun
  // (istemcideki clubKey ile ayni katlama) kimlik tasiyan kardes satirina
  // dusulur: "Besiktas JK" (UEL) -> "Besiktas" (Super Lig, bsd:196).
  if (!text(ids.bsd) && !text(ids.thesportsdb)) {
    const folded = (name: string) =>
      name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/sportif faaliyetler|futbol kulubu|football club/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(fc|cf|sc|ac|sk|fk|sfk|jk|bb|bk|bc|as|club)\b/g, ' ')
        .replace(/spor\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
    const target = folded(String(team.name));
    const { data: candidates } = await supabase
      .from('teams')
      .select('name, external_ids')
      .eq('sport_id', team.sport_id)
      .neq('id', teamId);
    for (const cand of candidates ?? []) {
      const candIds = object(cand.external_ids);
      if ((!text(candIds.bsd) && !text(candIds.thesportsdb)) || !text(cand.name)) continue;
      if (folded(String(cand.name)) === target) { ids = candIds; break; }
    }
  }

  const bsdId = text(ids.bsd);
  const tsdbId = text(ids.thesportsdb);

  // BSD once: futbolcu profillerine baglanabilen tek kaynak o. Bos donerse ya
  // da hata verirse TheSportsDB'ye dusulur.
  if (bsdId && team.sport_id === 'football') {
    const key = Deno.env.get('API_BSD_FOOTBALL_KEY');
    if (key) {
      try {
        const players = await bsdSquad(bsdId, key);
        if (players.length > 0) return json({ players, source: 'bsd' });
      } catch { /* yedege dus */ }
    }
  }
  if (tsdbId) {
    try {
      const players = (await tsdbSquad(tsdbId, team.sport_id)).sort(byJerseyThenName);
      return json({ players, source: 'thesportsdb' });
    } catch (caught) {
      return json({ players: [], error: caught instanceof Error ? caught.message : 'unknown' });
    }
  }
  return json({ players: [] });
});
