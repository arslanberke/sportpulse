import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
    addFavoritePlayer,
    addFavoriteTeam,
    fetchFavorites,
    removeFavoritePlayer,
    removeFavoriteTeam,
} from '@/services/favorites';
import { useAuthStore } from '@/store/auth-store';
import type { SportEvent } from '@/types';

/**
 * Yildizlananlar: kulupler ve sporcular.
 *
 * Ikisi ayni tabloda tutuluyor, boylece "yildizlarim" tek istekle geliyor.
 */
export function useFavorites() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useQuery({
    queryKey: ['favorites', userId],
    queryFn: fetchFavorites,
    enabled: Boolean(userId),
  });

  const teamIds = useMemo(() => new Set(query.data?.teamIds ?? []), [query.data]);
  const playerIds = useMemo(() => new Set(query.data?.playerIds ?? []), [query.data]);
  return { ...query, favoriteTeamIds: teamIds, favoritePlayerIds: playerIds };
}

/** Geriye donuk ad: yalnizca kulup kimlikleri gerektiginde. */
export function useFavoriteTeams() {
  const { favoriteTeamIds, ...rest } = useFavorites();
  return { ...rest, favoriteTeamIds };
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
      // Yildizli oyuncularin maclari ana listeye giriyor; liste yenilenmeli.
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useToggleFavoritePlayer() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { playerId: string; isFavorite: boolean }) => {
      if (params.isFavorite) {
        await removeFavoritePlayer({ userId: userId!, playerId: params.playerId });
      } else {
        await addFavoritePlayer({ userId: userId!, playerId: params.playerId });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/** Maçin taraflarindan biri yildizli mi: kulup ya da sporcu. */
export function isFavoriteEvent(
  event: SportEvent,
  favoriteTeamIds: Set<string>,
  favoritePlayerIds?: Set<string>,
): boolean {
  if (
    (event.homeTeamId && favoriteTeamIds.has(event.homeTeamId)) ||
    (event.awayTeamId && favoriteTeamIds.has(event.awayTeamId))
  ) {
    return true;
  }
  if (!favoritePlayerIds || favoritePlayerIds.size === 0) return false;
  return Boolean(
    (event.homePlayerId && favoritePlayerIds.has(event.homePlayerId)) ||
      (event.awayPlayerId && favoritePlayerIds.has(event.awayPlayerId)),
  );
}
