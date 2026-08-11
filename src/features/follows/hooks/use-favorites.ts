import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
    addFavoriteTeam,
    fetchFavoriteTeamIds,
    removeFavoriteTeam,
} from '@/services/favorites';
import { useAuthStore } from '@/store/auth-store';
import type { SportEvent } from '@/types';

/** Yildizlanan kuluplerin kimlikleri. */
export function useFavoriteTeams() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useQuery({
    queryKey: ['favorites', userId],
    queryFn: fetchFavoriteTeamIds,
    enabled: Boolean(userId),
  });

  const ids = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { ...query, favoriteTeamIds: ids };
}

export function useToggleFavoriteTeam() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { teamId: string; isFavorite: boolean }) => {
      if (params.isFavorite) {
        await removeFavoriteTeam({ userId: userId!, teamId: params.teamId });
      } else {
        await addFavoriteTeam({ userId: userId!, teamId: params.teamId });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/** Maçin taraflarindan biri yildizli mi. */
export function isFavoriteEvent(event: SportEvent, favoriteTeamIds: Set<string>): boolean {
  if (favoriteTeamIds.size === 0) return false;
  return Boolean(
    (event.homeTeamId && favoriteTeamIds.has(event.homeTeamId)) ||
      (event.awayTeamId && favoriteTeamIds.has(event.awayTeamId)),
  );
}
