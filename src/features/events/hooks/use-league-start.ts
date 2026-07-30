import { useQuery } from '@tanstack/react-query';

import { fetchLeagueNextEvent } from '@/services/events';
import type { League } from '@/types';

/**
 * Fikstur yalnizca 14 gun ileriye senkronlandigi icin, sezon bilgisi olmayan
 * ligler icin ilk macin uzakligina bakilir: lig oynanirken maclar birkac gun
 * arayla gelir, ara donemde ise ilk mac haftalar sonradir.
 */
const BREAK_THRESHOLD_DAYS = 7;

function daysFromNow(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function hasPassed(date: Date): boolean {
  return date.getTime() <= Date.now();
}

/**
 * Sezon baslamadan once ilk maca kalan sure; lig oynanirken null.
 *
 * Once yarismanin sezon araligina bakilir (bkz. migration 0032): bu aralik
 * icindeysek lig oynaniyordur ve geri sayim gosterilmez -- ligin arasi uzun
 * surse bile (kis arasi) dogru davranis budur. Aralik baslamadiysa ilk maca
 * geri sayilir; bu, fikstur tablosunda henuz hicbir mac olmasa da calisir.
 *
 * Sezon bilgisi olmayan yarismalarda (saglayici takvimi yayinlamiyorsa) bilinen
 * ilk macin uzakligina dusulur.
 */
interface LeagueStart {
  startsAt: Date | null;
  daysUntil: number | null;
  /**
   * Tarihin saati anlamli mi. Sezon takvimi yalnizca gunu bildirir (saat alani
   * saglayicinin gun sinirini tasir, mac saatini degil); fikstur satirindan
   * gelen tarihte ise gercek baslama saati vardir.
   */
  hasTime: boolean;
}

const NONE: LeagueStart = { startsAt: null, daysUntil: null, hasTime: false };

export function useLeagueStart(league: League | undefined): LeagueStart {
  const { data: nextEvent, isLoading } = useQuery({
    queryKey: ['league-next-event', league?.id],
    queryFn: () => fetchLeagueNextEvent(league!.id),
    enabled: league !== undefined,
  });

  const seasonStart = league?.seasonStart ? new Date(league.seasonStart) : null;
  const seasonEnd = league?.seasonEnd ? new Date(league.seasonEnd) : null;

  if (seasonStart) {
    const started = hasPassed(seasonStart);
    const ended = seasonEnd !== null && hasPassed(seasonEnd);
    // Sezon suruyor: geri sayim yok.
    if (started && !ended) return NONE;
    if (!started) {
      return { startsAt: seasonStart, daysUntil: daysFromNow(seasonStart), hasTime: false };
    }
    // Sezon bitmis: siradaki sezonun tarihi henuz bilinmiyor, alta dusulur.
  }

  if (isLoading || !nextEvent) return NONE;

  const startsAt = new Date(nextEvent.startsAt);
  const daysUntil = daysFromNow(startsAt);
  if (daysUntil < BREAK_THRESHOLD_DAYS) return NONE;

  return { startsAt, daysUntil, hasTime: true };
}
