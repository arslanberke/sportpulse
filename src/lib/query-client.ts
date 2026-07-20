import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Server data (lessons, students, ...) will be
 * fetched through React Query so caching and refetching are handled for us.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});
