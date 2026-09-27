// Turkiye futbol yayinlari: BSD'nin toplu broadcasts ucu.
//
// Sporekrani (sync-broadcasts) gunluk ve tum sporlari kapsar ama takim adi
// eslestirmesine dayanir ve ileri tarih vermez. BSD'nin
// /broadcasts/?country_code=TR ucu gelecek ~7 gunu tek listelemede verir ve
// satirlarda event_id tasir -- ada bakmadan events.external_ids->>bsd
// uzerinden kesin esleme yapilir.
//
// Mac bazli kayitlar event_broadcasts'a yazilir; BSD'nin listeledigi maclarda
// onceki TR kayitlari once silinir (kanal degisikligi/iptali geri alinir).
// BSD kimligi tasiyan ama listede olmayan maclar "TR'de yayinlanmiyor" demek:
// bu yuzden kapsam gunleri 'football' boyutuyla yazilir ve istemci yalnizca
// external_ids.bsd'si olan maclarda lig varsayimini gizler.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fold } from '../../../src/lib/search.ts';

const API = 'https://sports.bzzoiro.com/api/v2';
const COUNTRY = 'TR';
const ISTANBUL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function num(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}
async function api(path: string, key: string) {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Token ${key}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
  return response.json();
}

Deno.serve(async (request) => {
  const authHeader = request.headers.get('Authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('SYNC_SECRET') ?? ''}`;
  if (!Deno.env.get('SYNC_SECRET') || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }
  const key = Deno.env.get('API_BSD_FOOTBALL_KEY');
  if (!key) return Response.json({ error: 'bsd key missing' }, { status: 500 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Gelecek haftanin TR yayin listesi (varsayilan pencere: simdiden 7 gune).
    interface Row { event_id: number; channel_name: string; event_date: string }
    const rows: Row[] = [];
    let offset = 0;
    let latest: string | null = null;
    for (let page = 0; page < 10; page++) {
      const body = object(await api(`/broadcasts/?country_code=${COUNTRY}&limit=200&offset=${offset}`, key));
      const pageRows = Array.isArray(body.results) ? body.results : [];
      for (const value of pageRows) {
        const b = object(value);
        const eventId = num(b.event_id); const channel = text(b.channel_name); const date = text(b.event_date);
        if (eventId === null || !channel) continue;
        rows.push({ event_id: eventId, channel_name: channel, event_date: date ?? '' });
        if (date && (!latest || date > latest)) latest = date;
      }
      if (!body.next || pageRows.length === 0) break;
      offset += pageRows.length;
    }

    // BSD event_id -> bizim event uuid
    const eventIds = [...new Set(rows.map((r) => r.event_id))];
    const { data: evRows } = eventIds.length
      ? await supabase.from('events').select('id,external_ids').in('external_ids->>bsd', eventIds.map(String))
      : { data: [] };
    const uuidByBsd = new Map<number, string>();
    for (const row of evRows ?? []) {
      const bsd = num(object(row.external_ids).bsd);
      if (bsd !== null) uuidByBsd.set(bsd, String(row.id));
    }

    // Kanallar: addan eslestir, yoksa yarat. BSD adlari bizimkilerden
    // farkli yazilabilir ("tabii" / "TABII Spor") -- fold ile karsilastirilir.
    const { data: channelRows } = await supabase
      .from('channels').select('id,name').eq('country_code', COUNTRY);
    const channelByName = new Map<string, string>();
    for (const row of channelRows ?? []) channelByName.set(fold(String(row.name)), String(row.id));

    let channelsCreated = 0;
    const wantedNames = [...new Set(rows.map((r) => r.channel_name))];
    for (const name of wantedNames) {
      if (channelByName.has(fold(name))) continue;
      const { data: inserted, error } = await supabase
        .from('channels').insert({ name, country_code: COUNTRY }).select('id').single();
      if (!error && inserted) {
        channelByName.set(fold(name), String(inserted.id));
        channelsCreated += 1;
      }
    }

    // Mac bazli kayitlar: eslenen maclarda once TR kayitlari silinir, sonra
    // BSD'nin son listesi yazilir (geride kalan kanal boylece temizlenir).
    const desired = new Map<string, Set<string>>();
    for (const row of rows) {
      const uuid = uuidByBsd.get(row.event_id);
      const channelId = channelByName.get(fold(row.channel_name));
      if (!uuid || !channelId) continue;
      const set = desired.get(uuid) ?? new Set<string>();
      set.add(channelId);
      desired.set(uuid, set);
    }
    const eventUuids = [...desired.keys()];
    const failures: string[] = [];
    if (eventUuids.length) {
      const { error } = await supabase
        .from('event_broadcasts').delete().in('event_id', eventUuids).eq('country_code', COUNTRY);
      if (error) failures.push(`delete: ${error.message}`);
      const inserts = eventUuids.flatMap((eventId) =>
        [...desired.get(eventId)!].map((channelId) => ({
          event_id: eventId, channel_id: channelId, country_code: COUNTRY,
        })));
      if (inserts.length) {
        const { error: insErr } = await supabase.from('event_broadcasts').insert(inserts);
        if (insErr) failures.push(`insert: ${insErr.message}`);
      }
    }

    // Kapsam: bugunden son BSD satirina kadar her gun 'football' olarak isaretli.
    // Sadece external_ids.bsd'li maclarda lig varsayimi gizlenir.
    const today = ISTANBUL_DAY.format(new Date());
    const end = latest ? ISTANBUL_DAY.format(new Date(latest)) : today;
    const coverageRows: { country_code: string; day: string; sport_id: string }[] = [];
    const cursor = new Date(`${today}T12:00:00Z`);
    const endDay = end > today ? end : today;
    while (ISTANBUL_DAY.format(cursor) <= endDay) {
      coverageRows.push({ country_code: COUNTRY, day: ISTANBUL_DAY.format(cursor), sport_id: 'football' });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (coverageRows.length > 14) break; // guvenlik: BSD penceresi ~7 gun
    }
    const { error: covErr } = await supabase
      .from('broadcast_coverage').upsert(coverageRows.map((r) => ({ ...r, synced_at: new Date().toISOString() })));
    if (covErr) failures.push(`coverage: ${covErr.message}`);

    return Response.json({
      listings: rows.length,
      eventsKnown: eventIds.length,
      matched: eventUuids.length,
      channelsCreated,
      coverageDays: coverageRows.length,
      failures,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 502 });
  }
});
