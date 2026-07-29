import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addFollow, addFollows, fetchFollows, removeFollow, removeFollows } from '@/services/follows';
import { useAuthStore } from '@/store/auth-store';
import type { FollowKind } from '@/types';

export function useFollows() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['follows', userId],
    queryFn: fetchFollows,
    enabled: Boolean(userId),
  });
}

/**
 * Applies a set of follow changes as one step: removals first, then
 * additions. Used when swapping a "follow everything" pick for the
 * individual rows it covered, so the list never lands in a half-state.
 */
export function useApplyFollowChanges() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      removeIds?: string[];
      add?: { kind: FollowKind; targetId: string }[];
    }) => {
      await removeFollows(params.removeIds ?? []);
      await addFollows({ userId: userId!, items: params.add ?? [] });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['follows'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useToggleFollow() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { kind: FollowKind; targetId: string; followId?: string }) => {
      if (params.followId) {
        await removeFollow(params.followId);
      } else {
        await addFollow({ userId: userId!, kind: params.kind, targetId: params.targetId });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['follows'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
