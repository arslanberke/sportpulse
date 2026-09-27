/**
 * Serbest metin aramasi icin metin normalizasyonu.
 *
 * Saglayici verisi Turkce karakterlerde tutarsiz: futbol Fenerbahce'si
 * "Fenerbahce", voleybol ve basketbol takimlari "Fenerbahçe" olarak kayitli.
 * Kullanicinin hangi yazimi kullandigi da belli olmaz, bu yuzden iki taraf da
 * ayni sadelestirmeden gecirilir.
 */
const FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
  ó: 'o',
  é: 'e',
  á: 'a',
  í: 'i',
  ú: 'u',
  ñ: 'n',
  ć: 'c',
  č: 'c',
  š: 's',
  ž: 'z',
  đ: 'd',
  ø: 'o',
  å: 'a',
  ä: 'a',
  ë: 'e',
  ï: 'i',
};

export function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıİöşüâîûóéáíúñćčšžđøåäëï]/g, (ch) => FOLD[ch] ?? ch)
    .trim();
}

/**
 * Yaygin yarismalarin Turkce adlari. Katalogda adlar saglayicidan geldigi gibi
 * ingilizce duruyor ("UEFA Europa League"), oysa kullanici "avrupa ligi" yazar.
 * Terim bu adlardan biriyle baslarsa arama ingilizce karsiligiyla da yapilir.
 */
const ALIASES: [alias: string, canonical: string][] = [
  ['sampiyonlar ligi', 'champions league'],
  ['devler ligi', 'champions league'],
  ['avrupa ligi', 'europa league'],
  ['konferans ligi', 'conference league'],
  ['super kupa', 'super cup'],
  ['uluslar ligi', 'nations league'],
  ['ingiltere ligi', 'premier league'],
  ['ispanya ligi', 'laliga'],
  ['almanya ligi', 'bundesliga'],
  ['italya ligi', 'serie a'],
  ['fransa ligi', 'ligue 1'],
  ['hollanda ligi', 'eredivisie'],
];

/**
 * Aranacak terimin tum yazilislari: kullanicinin yazdigi (sadelestirilmis) hali
 * ve varsa yarisma adinin ingilizce karsiligi.
 */
export function searchNeedles(term: string): string[] {
  const needle = fold(term);
  if (needle === '') return [];
  const canonical = ALIASES.filter(([alias]) => alias.startsWith(needle) || needle.startsWith(alias))
    .map(([, value]) => value);
  return [needle, ...canonical];
}

/** Alanlardan herhangi biri terimlerden herhangi birini iceriyor mu. */
export function matchesAny(fields: (string | null | undefined)[], needles: string[]): boolean {
  if (needles.length === 0) return true;
  const haystack = fields.filter(Boolean).map((field) => fold(field as string));
  return needles.some((needle) => haystack.some((field) => field.includes(needle)));
}
