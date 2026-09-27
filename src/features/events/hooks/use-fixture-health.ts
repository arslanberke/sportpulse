import { useQuery } from '@tanstack/react-query';

import { needsFixtureWarning } from '@/features/events/lib/fixture-health';
import { useNow } from '@/lib/now';
import { fetchFixtureHealth } from '@/services/fixture-health';
import { useAuthStore } from '@/store/auth-store';
import type { UserFollow } from '@/types';

export function useFixtureHealth(follows: UserFollow[] | undefined, favoritePlayerIds: Set<string>) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const now = useNow();
  const players = [...favoritePlayerIds].sort();
  const query = useQuery({
    queryKey: ['fixture-health', userId, (follows ?? []).map((f) => f.id).sort().join(','), players.join(',')],
    queryFn: () => fetchFixtureHealth(follows ?? [], players),
    enabled: Boolean(userId) && follows !== undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  return { ...query, hasIssues: query.isError || (query.data ?? []).some((row) => needsFixtureWarning(row, now)) };
}
