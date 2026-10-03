import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

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

// React Native has no window focus event; returning to the app counts as
// focus, so stale queries (live scores, running order) refetch right away.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => {
      setFocused(state === 'active');
    });
    return () => subscription.remove();
  });
}
