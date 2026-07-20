import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addFollow, fetchFollows, removeFollow } from '@/services/follows';
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
