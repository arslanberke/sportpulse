import type { League } from '@/types';

/**
 * Competition types, in the order they should be listed.
 *
 * Futbolda bir brans altinda ligler, kitasal kupalar, ulke kupalari ve milli
 * takim turnuvalari yan yana duruyordu; hangisinin ne oldugu ancak isminden
 * anlasiliyordu. Ayri ayri listelenebilmesi icin tur burada belirlenir.
 */
export const LEAGUE_KINDS = ['league', 'continentalCup', 'domesticCup', 'nationalTeam'] as const;

export type LeagueKind = (typeof LEAGUE_KINDS)[number];

/** Bir ulkenin lig piramidi: "ger.1", "eng.2" gibi numarali kimlikler. */
const DOMESTIC_LEAGUE_ID = /^[a-z]{3}\.\d+$/;

/**
 * Turu saglayicinin kimliginden cikarir. Kimlikler sabittir; lig adlari ise
 * cevrilebilir oldugu icin ("Dunya Kupasi Elemeleri") ada bakmak kirilgan olur.
 *
 * Kupa kavrami veri kumesinde yalnizca futbolda var; diger branslarda tum
 * yarismalar lig sayilir ve ekran tek bir liste olarak gorunur. Ulkesi
 * olmamak tek basina kitasal kupa anlamina gelmez: EuroLeague, MotoGP ve ATP
 * Tour da ulkesizdir ama kupa degildir.
 *
 * Tur bir yarismanin kendi ozelligi oldugu icin dogru yeri leagues tablosunda
 * bir kolondur. Simdilik burada turetiliyor; kolon eklendiginde bu fonksiyonun
 * govdesi onu okumakla degistirilebilir, cagiranlar etkilenmez.
 */
export function leagueKind(league: Pick<League, 'countryCode' | 'externalIds'>): LeagueKind {
  const espn = league.externalIds?.espn ?? '';

  // FIFA turnuvalari ve Uluslar Ligi milli takimlarla oynanir.
  if (espn.startsWith('fifa.') || espn === 'uefa.nations') return 'nationalTeam';

  // Kalan UEFA yarismalari kulup kupalaridir: UCL, UEL, Konferans, Super Kupa.
  if (espn.startsWith('uefa.')) return 'continentalCup';

  // Bir ulkeye bagli ve numarali olmayan kimlik kupayi gosterir: "eng.fa",
  // "ger.dfb_pokal". Numarali olan ("ger.1") ligdir, noktasiz olan ("nba") da.
  if (league.countryCode !== null && espn.includes('.') && !DOMESTIC_LEAGUE_ID.test(espn)) {
    return 'domesticCup';
  }

  return 'league';
}

/** Aynı sirayi koruyarak turlere gore ayirir. */
export function groupByKind<T extends Pick<League, 'countryCode' | 'externalIds'>>(
  leagues: T[],
): { kind: LeagueKind; leagues: T[] }[] {
  return LEAGUE_KINDS.map((kind) => ({
    kind,
    leagues: leagues.filter((league) => leagueKind(league) === kind),
  })).filter((group) => group.leagues.length > 0);
}
