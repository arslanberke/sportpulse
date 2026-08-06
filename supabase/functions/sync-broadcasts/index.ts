// Yayin kanali senkronu.
//
// Kanal bilgisi lig basina sabit bir eslemeden geliyordu ("UEFA kupalari ->
// TRT 1, TABii"). Bu varsayim Turk takimlarinin Avrupa maclarinda yaniliyor:
// yayin hakki lig genelinde TRT'de olsa da Fenerbahce - Sturm Graz ve
// Hradec Kralove - Besiktas TV100'de yayinlandi.
//
// Kaynak gunun yayin akisini takim adlari ve kanallariyla veriyor; eslesen
// maclara `event_broadcasts` uzerinden mac bazinda kanal yaziliyor ve bu kayit
// lig eslemesini gecersiz kiliyor. Eslesmeyen maclar lig eslemesiyle
// gosterilmeye devam eder, yani kaynak bozulursa uygulama eski davranisina
// doner.
//
// Kaynak yalnizca icinde bulunulan gunu veriyor, bu yuzden is gun icinde
// birkac kez calismali (bkz. supabase/functions/README.md).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { fetchTurkishBroadcasts } from '../../../src/services/providers/sporekrani.ts';

const COUNTRY = 'TR';

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

  let listings;
  try {
    listings = await fetchTurkishBroadcasts();
  } catch (error) {
    return new Response(`source failed: ${String(error)}`, { status: 502 });
  }

  // Kaynak okunabildi: bu gun kapsanmis sayilir. Istemci, kapsanan gunde mac
  // bazli kaydi olmayan maclarda lig varsayimini gostermez -- kaynak o maclari
  // listelemiyorsa buyuk olasilikla Turkiye'de yayinlanmiyorlar. Kayit yazma
  // eslestirmeden once yapiliyor: kaynagin bos dondugu (mac olmayan) bir gun de
  // kapsanmis bir gundur.
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const { error: coverageError } = await supabase
    .from('broadcast_coverage')
    .upsert({ country_code: COUNTRY, day, synced_at: new Date().toISOString() });

  const failures: string[] = [];
  if (coverageError) failures.push(`coverage: ${coverageError.message}`);
  let matched = 0;
  let skipped = 0;

  for (const listing of listings) {
    // Iki takim da bilinmeden eslestirme denenmez: tek ada bakmak, ayni kulubun
    // ayni gun oynanan baska bir brans macina yayin yazabilir.
    if (!listing.homeName || !listing.awayName) {
      skipped += 1;
      continue;
    }

    const { data, error } = await supabase.rpc('set_event_broadcast', {
      p_home: listing.homeName,
      p_away: listing.awayName,
      p_starts_at: listing.startsAtUtc,
      p_country_code: COUNTRY,
      p_channels: listing.channels.map((c) => ({ name: c.name, logo: c.logoUrl })),
    });

    if (error) {
      failures.push(`${listing.homeName} - ${listing.awayName}: ${error.message}`);
      continue;
    }
    // Kaynak katalogda olmayan yarismalari da listeliyor (padel, yerel ligler);
    // karsiligi bulunmayan yayin bir hata degil.
    if (data) matched += 1;
    else skipped += 1;
  }

  return Response.json({ listings: listings.length, matched, skipped, failures });
});
