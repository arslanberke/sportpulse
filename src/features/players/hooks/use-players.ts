import { useQuery } from '@tanstack/react-query';

import { fetchPlayer } from '@/services/players';
import { fetchPlayerEvents } from '@/services/events';

const PLAYER_STALE_MS = 60 * 60 * 1000; // siralama gunde bir yenilenir

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => fetchPlayer(playerId!),
    enabled: Boolean(playerId),
    staleTime: PLAYER_STALE_MS,
  });
}

/** Sporcunun yaklasan maclari; turnuva adiyla birlikte. */
export function usePlayerEvents(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-events', playerId],
    queryFn: () => fetchPlayerEvents(playerId!),
    enabled: Boolean(playerId),
    staleTime: 5 * 60_000,
  });
}
