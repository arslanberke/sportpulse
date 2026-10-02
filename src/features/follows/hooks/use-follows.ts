import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addFollow, addFollows, fetchFollows, removeFollow, removeFollows } from '@/services/follows';
import { useAuthStore } from '@/store/auth-store';
import type { FollowKind, UserFollow } from '@/types';

type FollowChange = {
  removeIds?: string[];
  add?: { kind: FollowKind; targetId: string }[];
};

function optimisticFollow(kind: FollowKind, targetId: string): UserFollow {
  return {
    id: `pending-${kind}-${targetId}`,
    kind,
    sportId: kind === 'sport' ? targetId : null,
    leagueId: kind === 'league' ? targetId : null,
    teamId: kind === 'team' ? targetId : null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Isaret ag cevabini beklemeden degisir; aksi halde kutu iki istek ve bir
 * yeniden yukleme boyunca eski halinde kaliyor, ikinci dokunus takibi geri
 * aliyordu. Hata olursa onceki liste geri yuklenir.
 */
function useOptimisticFollows() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['follows', userId];
  return {
    onMutate: async (change: FollowChange) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserFollow[]>(key);
      const removed = new Set(change.removeIds ?? []);
      queryClient.setQueryData<UserFollow[]>(key, [
        ...(previous ?? []).filter((f) => !removed.has(f.id)),
        ...(change.add ?? []).map((a) => optimisticFollow(a.kind, a.targetId)),
      ]);
      return { previous };
    },
    onError: (_error: unknown, _change: unknown, context?: { previous?: UserFollow[] }) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['follows'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  };
}

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
  const optimistic = useOptimisticFollows();
  return useMutation({
    mutationFn: async (params: FollowChange) => {
      await removeFollows((params.removeIds ?? []).filter((id) => !id.startsWith('pending-')));
      await addFollows({ userId: userId!, items: params.add ?? [] });
    },
    ...optimistic,
  });
}

export function useToggleFollow() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const optimistic = useOptimisticFollows();
  return useMutation({
    mutationFn: async (params: { kind: FollowKind; targetId: string; followId?: string }) => {
      if (params.followId) {
        await removeFollow(params.followId);
      } else {
        await addFollow({ userId: userId!, kind: params.kind, targetId: params.targetId });
      }
    },
    onMutate: (params: { kind: FollowKind; targetId: string; followId?: string }) =>
      optimistic.onMutate(
        params.followId
          ? { removeIds: [params.followId] }
          : { add: [{ kind: params.kind, targetId: params.targetId }] },
      ),
    onError: optimistic.onError,
    onSettled: optimistic.onSettled,
  });
}
