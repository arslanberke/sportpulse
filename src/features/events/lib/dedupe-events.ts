import type { SportEvent } from '../../../types/index.ts';

const SAME_PAIR_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Ayni mac birden fazla kaynaktan (bsd, espn, thesportsdb, goal) ayri satir
 * olarak gelebiliyor; takim adlari kaynaklar arasinda farkli yazildiginda
 * ("Lens" / "RC Lens") taraflardan biri ayri takim satirina baglaniyor.
 *
 * Ayni mac sayilanlar:
 * - ayni iki takim, baslangiclar arasi en fazla 12 saat;
 * - ya da ayni baslangic ve ortak bir taraf (ev sahibi ya da deplasman).
 *   Bir takim ayni anda iki mac oynamaz; ayni saatte baslayan farkli Konferans
 *   Ligi maclari ortak takim tasimadigi icin birlesmez.
 *
 * Kalan satir once bsd kimligi tasiyan (canli skor, kadro ve istatistik
 * sunucuda satirin kendi bsd kimligiyle cekilir), sonra en cok kaynak kimligi
 * tasiyandir; digerlerinin kimlikleri ve
 * eksikse skor bilgisi ona aktarilir.
 */
export function dedupeEvents(events: SportEvent[]): SportEvent[] {
  const kept: SportEvent[] = [];
  for (const event of events) {
    const index = kept.findIndex((other) => sameMatch(other, event));
    if (index === -1) {
      kept.push(event);
    } else {
      kept[index] = merge(kept[index], event);
    }
  }
  return kept;
}

function sameMatch(a: SportEvent, b: SportEvent): boolean {
  if (a.sportId !== b.sportId) return false;
  if (!a.homeTeamId || !a.awayTeamId || !b.homeTeamId || !b.awayTeamId) return false;
  const gap = Math.abs(new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  if (a.homeTeamId === b.homeTeamId && a.awayTeamId === b.awayTeamId) {
    return gap <= SAME_PAIR_WINDOW_MS;
  }
  return gap === 0 && (a.homeTeamId === b.homeTeamId || a.awayTeamId === b.awayTeamId);
}

function rank(event: SportEvent): number {
  return Number('bsd' in event.externalIds) * 100 + Object.keys(event.externalIds).length;
}

function merge(a: SportEvent, b: SportEvent): SportEvent {
  const [winner, loser] = rank(b) > rank(a) ? [b, a] : [a, b];
  return {
    ...winner,
    externalIds: { ...loser.externalIds, ...winner.externalIds },
    homeScore: winner.homeScore ?? loser.homeScore,
    awayScore: winner.awayScore ?? loser.awayScore,
    resultStatus: winner.resultStatus ?? loser.resultStatus,
  };
}
