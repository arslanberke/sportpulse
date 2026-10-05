import type { Language } from '@/lib/i18n';

/**
 * Turkish renderings of provider text (team names, rounds, session names,
 * live status, match incidents). Providers only send English; unknown text
 * is returned unchanged.
 */

const COUNTRIES: Record<string, string> = {
  Albania: 'Arnavutluk', Algeria: 'Cezayir', Andorra: 'Andorra', Argentina: 'Arjantin', Armenia: 'Ermenistan',
  Australia: 'Avustralya', Austria: 'Avusturya', Azerbaijan: 'Azerbaycan', Bahrain: 'Bahreyn', Belarus: 'Belarus',
  Belgium: 'Belçika', Benin: 'Benin', Bolivia: 'Bolivya', 'Bosnia & Herzegovina': 'Bosna-Hersek',
  'Bosnia-Herzegovina': 'Bosna-Hersek', 'Bosnia and Herzegovina': 'Bosna-Hersek', Botswana: 'Botsvana',
  Brazil: 'Brezilya', Bulgaria: 'Bulgaristan', 'Burkina Faso': 'Burkina Faso', Cameroon: 'Kamerun', Canada: 'Kanada',
  Chile: 'Şili', China: 'Çin', 'China PR': 'Çin', Colombia: 'Kolombiya', 'Congo DR': 'Kongo DC', 'DR Congo': 'Kongo DC',
  'Costa Rica': 'Kosta Rika', Croatia: 'Hırvatistan', Cuba: 'Küba', Cyprus: 'Kıbrıs', 'Czech Republic': 'Çekya',
  Czechia: 'Çekya', Denmark: 'Danimarka', Ecuador: 'Ekvador', Egypt: 'Mısır', England: 'İngiltere', Estonia: 'Estonya',
  Eswatini: 'Esvatini', 'Faroe Islands': 'Faroe Adaları', Finland: 'Finlandiya', France: 'Fransa', Georgia: 'Gürcistan',
  Germany: 'Almanya', Ghana: 'Gana', Gibraltar: 'Cebelitarık', Greece: 'Yunanistan', 'Hong Kong': 'Hong Kong',
  Hungary: 'Macaristan', Iceland: 'İzlanda', India: 'Hindistan', Indonesia: 'Endonezya', Iran: 'İran', Iraq: 'Irak',
  Ireland: 'İrlanda', 'Republic of Ireland': 'İrlanda', Israel: 'İsrail', Italy: 'İtalya', 'Ivory Coast': 'Fildişi Sahili',
  "Côte d'Ivoire": 'Fildişi Sahili', Jamaica: 'Jamaika', Japan: 'Japonya', Jordan: 'Ürdün', Kazakhstan: 'Kazakistan',
  Kenya: 'Kenya', Kosovo: 'Kosova', Kuwait: 'Kuveyt', 'Kyrgyz Republic': 'Kırgızistan', Kyrgyzstan: 'Kırgızistan',
  Latvia: 'Letonya', Lebanon: 'Lübnan', Liechtenstein: 'Lihtenştayn', Lithuania: 'Litvanya', Luxembourg: 'Lüksemburg',
  Mali: 'Mali', Malta: 'Malta', Mexico: 'Meksika', Moldova: 'Moldova', Montenegro: 'Karadağ', Morocco: 'Fas',
  Mozambique: 'Mozambik', Myanmar: 'Myanmar', Namibia: 'Namibya', Netherlands: 'Hollanda', 'New Zealand': 'Yeni Zelanda',
  Nigeria: 'Nijerya', 'North Macedonia': 'Kuzey Makedonya', 'Northern Ireland': 'Kuzey İrlanda', Norway: 'Norveç',
  Oman: 'Umman', Palestine: 'Filistin', Panama: 'Panama', Paraguay: 'Paraguay', Peru: 'Peru', Poland: 'Polonya',
  Portugal: 'Portekiz', Qatar: 'Katar', Romania: 'Romanya', Russia: 'Rusya', Rwanda: 'Ruanda', 'San Marino': 'San Marino',
  'Saudi Arabia': 'Suudi Arabistan', Scotland: 'İskoçya', Senegal: 'Senegal', Serbia: 'Sırbistan', Singapore: 'Singapur',
  Slovakia: 'Slovakya', Slovenia: 'Slovenya', 'South Africa': 'Güney Afrika', 'South Korea': 'Güney Kore',
  'Korea Republic': 'Güney Kore', Spain: 'İspanya', Sweden: 'İsveç', Switzerland: 'İsviçre', Syria: 'Suriye',
  Tajikistan: 'Tacikistan', Tanzania: 'Tanzanya', Thailand: 'Tayland', Togo: 'Togo', Tunisia: 'Tunus', Turkey: 'Türkiye',
  Türkiye: 'Türkiye', Ukraine: 'Ukrayna', 'United Arab Emirates': 'Birleşik Arap Emirlikleri', UAE: 'BAE',
  'United States': 'ABD', USA: 'ABD', Uruguay: 'Uruguay', Uzbekistan: 'Özbekistan', Venezuela: 'Venezuela',
  Vietnam: 'Vietnam', Wales: 'Galler', Yemen: 'Yemen',
};

/** "Turkey U21" -> "Türkiye U21", "Spain Women" -> "İspanya (K)". Clubs stay as they are. */
export function localizeTeamName(name: string, language: Language): string {
  if (language !== 'tr') return name;
  const m = name.match(/^(.+?)(?: (U\d{2}|Women|W))?$/);
  if (!m) return name;
  const country = COUNTRIES[m[1]];
  if (!country) return name;
  if (!m[2]) return country;
  return `${country} ${m[2] === 'Women' || m[2] === 'W' ? '(K)' : m[2]}`;
}

const ord = (s: string) => s.replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, '$1.');

/** Tennis/cup round names: "Qualifying 1st Round" -> "Eleme 1. tur". */
export function localizeRound(round: string, language: Language): string {
  if (language !== 'tr') return round;
  const r = round.trim();
  const qual = /^qualif(?:ying|ication)\s*/i.test(r);
  const rest = r.replace(/^qualif(?:ying|ication)\s*/i, '');
  let out: string | null = null;
  let m: RegExpMatchArray | null;
  if (/^quarter-?finals?$/i.test(rest)) out = 'Çeyrek final';
  else if (/^semi-?finals?$/i.test(rest)) out = 'Yarı final';
  else if (/^finals?$/i.test(rest)) out = 'Final';
  else if ((m = rest.match(/^round of (\d+)$/i))) out = `Son ${m[1]}`;
  else if ((m = rest.match(/^round (\d+)$/i))) out = `${m[1]}. tur`;
  else if ((m = rest.match(/^(\d+)(?:st|nd|rd|th) round$/i))) out = `${m[1]}. tur`;
  else if (/^group stage$/i.test(rest)) out = 'Grup aşaması';
  else if (qual && rest === '') out = '';
  if (out === null) return round;
  if (!qual) return out;
  if (out === '') return 'Eleme';
  return out === 'Final' ? 'Eleme finali' : `Eleme ${out.charAt(0).toLowerCase()}${out.slice(1)}`;
}

const SESSIONS: [RegExp, (n?: string) => string][] = [
  [/(?:free )?practice (\d)$/i, (n) => `${n}. antrenman`],
  [/(?:free )?practice$/i, () => 'Antrenman'],
  [/sprint (?:qualifying|shootout)$/i, () => 'Sprint sıralaması'],
  [/qualifying (\d)$/i, (n) => `${n}. sıralama`],
  [/qualifying$/i, () => 'Sıralama'],
  [/sprint(?: race)?$/i, () => 'Sprint'],
  [/race (\d)$/i, (n) => `${n}. yarış`],
  [/warm ?up$/i, () => 'Isınma'],
  [/race$/i, () => 'Yarış'],
];

const GP_ADJECTIVES: Record<string, string> = {
  Australian: 'Avustralya', Austrian: 'Avusturya', Belgian: 'Belçika', Brazilian: 'Brezilya', British: 'Britanya',
  Canadian: 'Kanada', Chinese: 'Çin', Dutch: 'Hollanda', French: 'Fransa', German: 'Almanya', Hungarian: 'Macaristan',
  Italian: 'İtalya', Japanese: 'Japonya', Mexican: 'Meksika', Portuguese: 'Portekiz', 'Saudi Arabian': 'Suudi Arabistan',
  Spanish: 'İspanya', Thai: 'Tayland', Malaysian: 'Malezya', Indonesian: 'Endonezya', Argentine: 'Arjantin',
  Malaysia: 'Malezya', Thailand: 'Tayland', Monaco: 'Monako', Catalunya: 'Katalonya', Valencia: 'Valensiya',
  'Mexico City': 'Meksika', 'United States': 'ABD', 'Abu Dhabi': 'Abu Dabi',
};

/** "Malaysia Grand Prix" -> "Malezya Grand Prix". */
function localizeGpName(title: string): string {
  const m = title.match(/^(.+?) Grand Prix/) ?? title.match(/^(\S+) /);
  if (!m) return title;
  const tr = GP_ADJECTIVES[m[1]] ?? COUNTRIES[m[1]];
  return tr ? tr + title.slice(m[1].length) : title;
}

/** Trailing motorsport session name: "Malaysia Grand Prix Practice 1" -> "... 1. antrenman". */
export function localizeSessionTitle(title: string, language: Language): string {
  if (language !== 'tr') return title;
  title = localizeGpName(title);
  for (const [re, fmt] of SESSIONS) {
    const m = title.match(re);
    if (m) {
      const head = title.slice(0, m.index).trimEnd();
      if (/grand prix$/i.test(title) && re.source.startsWith('race')) return title;
      return head ? `${head} ${fmt(m[1])}` : fmt(m[1]).charAt(0).toUpperCase() + fmt(m[1]).slice(1);
    }
  }
  return title;
}

/** Event title with team names / session name in the app language. */
export function localizeEventTitle(title: string, sportId: string, language: Language): string {
  if (language !== 'tr') return title;
  if (sportId === 'f1' || sportId === 'motogp') return localizeSessionTitle(title, language);
  const parts = title.split(' vs ');
  if (parts.length === 2) return parts.map((p) => localizeTeamName(p, language)).join(' - ');
  return title;
}

const STATUS_WORDS: [RegExp, string][] = [
  [/^half ?time$|^ht$/i, 'Devre arası'],
  [/^final\/ot$/i, 'Bitti (UZ)'],
  [/^final$|^ft$|^full ?time$/i, 'Bitti'],
  [/^in progress$/i, 'Canlı'],
  [/^(?:start )?delayed$/i, 'Gecikmeli'],
  [/^rain delay$/i, 'Yağmur arası'],
  [/^suspended$/i, 'Durduruldu'],
  [/^postponed$/i, 'Ertelendi'],
  [/^canceled$|^cancelled$/i, 'İptal'],
  [/^overtime$|^ot$/i, 'Uzatma'],
  [/^extra time$|^et$/i, 'Uzatma'],
  [/^penalties$|^pen$/i, 'Penaltılar'],
];

const UNITS: Record<string, string> = {
  quarter: 'çeyrek', half: 'devre', set: 'set', period: 'periyot', round: 'raunt', inning: 'devre', lap: 'tur',
};

/** Live status text from ESPN/BSD: "End of 1st Quarter" -> "1. çeyrek sonu", "2nd Set" -> "2. set". */
export function localizeStatus(detail: string, language: Language): string {
  if (language !== 'tr') return detail;
  const d = detail.trim();
  for (const [re, tr] of STATUS_WORDS) if (re.test(d)) return tr;
  const unit = (s: string) =>
    ord(s).replace(/\b(quarter|half|set|period|round|inning|lap)s?\b/gi, (w) => UNITS[w.toLowerCase().replace(/s$/, '')] ?? w);
  const rnd = (x: string) => x.replace(/\bround (\d+)\b/gi, '$1. raunt');
  const end = d.match(/^end of (.+)$/i);
  if (end) return `${unit(rnd(end[1]))} sonu`;
  const start = d.match(/^start of (.+)$/i);
  if (start) return `${unit(rnd(start[1]))} başı`;
  return unit(rnd(d)).replace(/\bOT\b/, 'UZ');
}

const INCIDENTS: Record<string, string> = {
  yellow: 'Sarı kart', red: 'Kırmızı kart', yellowred: 'İkinci sarıdan kırmızı', 'yellow card': 'Sarı kart',
  'red card': 'Kırmızı kart', 'second yellow card': 'İkinci sarıdan kırmızı', 'normal goal': 'Gol', regular: 'Gol',
  goal: 'Gol', 'own goal': 'Kendi kalesine', owngoal: 'Kendi kalesine', penalty: 'Penaltı', 'missed penalty': 'Kaçan penaltı',
  substitution: 'Oyuncu değişikliği', injurytime: 'Uzatma süresi', penaltynotawarded: 'Penaltı verilmedi',
  redcardgiven: 'Kırmızı kart verildi', 'card upgrade confirmed': 'Kart yükseltildi', review: 'VAR incelemesi',
  var: 'VAR', 'goal cancelled': 'Gol iptal', 'goal disallowed': 'Gol iptal', 'penalty confirmed': 'Penaltı onaylandı',
  'penalty cancelled': 'Penaltı iptal', foul: 'Faul', argument: 'İtiraz', dissent: 'İtiraz',
  'persistent fouling': 'Sürekli faul', simulation: 'Simülasyon', 'time wasting': 'Zaman geçirme',
  'violent conduct': 'Şiddet içeren hareket', 'professional foul last man': 'Son adam faulü',
  'professional foul': 'Taktik faul', handball: 'Elle oynama', 'unsporting behaviour': 'Sportmenlik dışı hareket',
  'unsporting behavior': 'Sportmenlik dışı hareket', holding: 'Tutma', tripping: 'Çelme', 'rough play': 'Sert oyun',
  'serious foul play': 'Ciddi faul', elbowing: 'Dirsek', 'dangerous play': 'Tehlikeli oyun',
  'off the ball foul': 'Topsuz alanda faul', 'entering field': 'İzinsiz sahaya giriş',
  'leaving field': 'İzinsiz sahayı terk', encroachment: 'Mesafe ihlali', 'delay of game': 'Oyunu geciktirme',
  pushing: 'İtme', 'spitting': 'Tükürme', 'bench': 'Yedek kulübesi', 'not on pitch': 'Saha dışında',
};

/** Match incident text: "yellow · Foul" -> "Sarı kart · Faul". Player names pass through. */
export function localizeIncident(text: string, language: Language): string {
  if (language !== 'tr') return text;
  return text
    .split(' · ')
    .map((part) => INCIDENTS[part.trim().toLowerCase()] ?? part)
    .join(' · ');
}

/** Label for the venue row: stadium, arena or circuit depending on the sport. */
export function venueLabelKey(sportId: string): 'event.venueStadium' | 'event.venueArena' | 'event.motorsport.venue' | 'event.venue' {
  if (sportId === 'football') return 'event.venueStadium';
  if (sportId === 'basketball' || sportId === 'volleyball' || sportId === 'ufc') return 'event.venueArena';
  if (sportId === 'f1' || sportId === 'motogp') return 'event.motorsport.venue';
  return 'event.venue';
}
