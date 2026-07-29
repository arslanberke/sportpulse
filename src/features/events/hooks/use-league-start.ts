import { useQuery } from '@tanstack/react-query';

import { fetchLeagueNextEvent } from '@/services/events';

/**
 * Sezon baslamadan once, ilk maca kalan gun sayisi.
 *
 * Sema sezon tarihi tutmuyor, bu yuzden "lig basladi mi" bilgisi bilinen ilk
 * macin ne kadar uzakta oldugundan cikarilir: lig oynanirken maclar birkac
 * gun arayla gelir, ara donemde ise ilk mac haftalar sonradir. Esigin altinda
 * kalan her sey "lig basladi" sayilir ve geri sayim gosterilmez.
 *
 * Ligin arasi bu esikten uzun surerse (ornegin Bundesliga'nin kis arasi) geri
 * sayim yeniden gorunur; sezon tarihleri veriye eklenmedikce bu ayirt
 * edilemez.
 */
const BREAK_THRESHOLD_DAYS = 7;

export function useLeagueStart(leagueId: string | undefined) {
  const { data: nextEvent, isLoading } = useQuery({
    queryKey: ['league-next-event', leagueId],
    queryFn: () => fetchLeagueNextEvent(leagueId!),
    enabled: leagueId !== undefined,
  });

  if (isLoading || !nextEvent) return { startsAt: null, daysUntil: null };

  const startsAt = new Date(nextEvent.startsAt);
  const daysUntil = Math.ceil((startsAt.getTime() - Date.now()) / 86_400_000);
  if (daysUntil < BREAK_THRESHOLD_DAYS) return { startsAt: null, daysUntil: null };

  return { startsAt, daysUntil };
}
