import { warnHttp } from './log.ts';

/**
 * sporekrani.com — Turkiye'deki yayin kanali kaynagi.
 *
 * Kanal bilgisi bugune kadar lig basina sabit bir eslemeden geliyordu
 * ("UEFA kupalari -> TRT 1, TABii"). Bu varsayim Turk takimlarinin Avrupa
 * maclarinda bozuluyor: yayin hakki lig genelinde TRT'de olsa da Fenerbahce -
 * Sturm Graz TV100'de yayinlandi ve uygulama yanlis kanal gosterdi.
 *
 * Denenip elenen kaynaklar: Nesine bulteninde yayin alani var ama tum maclarda
 * bos; iddaa yayin bilgisi tasimiyor; Sofascore 403, FotMob uc noktasi kapali;
 * apifootball ve TheSportsDB'de yayin verisi hic yok. Ucretli seceneklerde
 * (Sportmonks, Broadage) veri var ama TV100 gibi yerel alt lisanslari
 * gorecekleri belirsiz.
 *
 * Burasi sayfanin sunucu tarafinda gomdugu duruma bakiyor: `__INITIAL_STATE__`
 * icinde gunun butun yayinlari takim adlari ve kanallariyla duruyor, futbol
 * disindaki branslar dahil.
 *
 * Sinir: yalnizca icinde bulunulan gun. Tarih parametresi, tarih bazli adres ve
 * API uc noktasi denendi, hepsi ayni gunu donduruyor. Bu yuzden ilerideki
 * maclar lig eslemesiyle gosterilmeye devam eder.
 */

const URL_TR = 'https://www.sporekrani.com/';
/** Sayfa bir tarayici bekliyor; varsayilan Deno kimligiyle icerik degisebiliyor. */
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

export interface BroadcastChannel {
  name: string;
  logoUrl: string | null;
}

export interface BroadcastListing {
  /** Kaynagin yazdigi takim adlari; eslestirme veritabaninda yapilir. */
  homeName: string | null;
  awayName: string | null;
  /** Mac adi (takimlar ayri verilmediginde tek satir olarak gelir). */
  title: string | null;
  startsAtUtc: string;
  channels: BroadcastChannel[];
}

interface StateEvent {
  home_name?: string | null;
  away_name?: string | null;
  name?: string | null;
  date_time?: string | null;
  channels?: { name?: string | null; icon?: string | null }[] | null;
}

/**
 * Sayfaya gomulu durum nesnesi.
 *
 * `JSON.parse` dogrudan calismaz: atamadan sonra betigin kendini silen kodu
 * geliyor. Bu yuzden nesne, ilk dengeli suslu parantez blogu alinarak
 * ayristiriliyor.
 */
function extractState(html: string): unknown | null {
  const marker = 'window.__INITIAL_STATE__';
  const assign = html.indexOf(marker);
  if (assign === -1) return null;
  const start = html.indexOf('{', assign);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Kaynak saatleri Turkiye saatiyle, bolge eki olmadan yaziyor
 * ("2026-08-06 21:00:00"). Boyle bir dize UTC sanilirsa mac uc saat kayar.
 */
function toUtc(local: string): string | null {
  const match = local.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const asUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  const TR_OFFSET_MS = 3 * 3_600_000;
  const parsed = new Date(asUtc - TR_OFFSET_MS);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Bugun Turkiye'de yayinlanacak karsilasmalar ve kanallari. */
export async function fetchTurkishBroadcasts(): Promise<BroadcastListing[]> {
  const response = await fetch(URL_TR, { headers: HEADERS });
  if (!response.ok) return warnHttp('sporekrani.page', response, []);

  const state = extractState(await response.text());
  const events = (state as { common?: { events?: StateEvent[] } })?.common?.events;
  if (!Array.isArray(events)) {
    console.warn('[providers] sporekrani: sayfada beklenen durum nesnesi yok');
    return [];
  }

  const listings: BroadcastListing[] = [];
  for (const event of events) {
    const startsAtUtc = event.date_time ? toUtc(event.date_time) : null;
    if (!startsAtUtc) continue;

    const channels = (event.channels ?? [])
      .filter((c): c is { name: string; icon?: string | null } => Boolean(c?.name))
      .map((c) => ({ name: c.name.trim(), logoUrl: c.icon ?? null }));
    if (channels.length === 0) continue;

    listings.push({
      homeName: event.home_name?.trim() || null,
      awayName: event.away_name?.trim() || null,
      title: event.name?.trim() || null,
      startsAtUtc,
      channels,
    });
  }
  return listings;
}
