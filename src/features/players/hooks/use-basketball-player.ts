import { useQuery } from '@tanstack/react-query';

import { fetchEventIdsByEspn } from '@/services/events';
import { fetchBasketballPlayer } from '@/services/providers/espn-athlete';

/** ESPN basketball player profile; slow-changing, so cached for 30 min. */
export function useBasketballPlayer(league: string | undefined, espnId: string | undefined) {
  return useQuery({
    queryKey: ['basketball-player', league, espnId],
    queryFn: () => fetchBasketballPlayer(league!, espnId!),
    enabled: Boolean(league && espnId),
    staleTime: 30 * 60 * 1000,
  });
}

/** Maps the game log's ESPN event ids to our match pages. */
export function useEspnEventLinks(espnIds: string[]) {
  return useQuery({
    queryKey: ['espn-event-links', espnIds],
    queryFn: () => fetchEventIdsByEspn(espnIds),
    enabled: espnIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}
