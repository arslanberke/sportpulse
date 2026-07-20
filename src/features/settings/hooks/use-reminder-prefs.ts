import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchReminderPrefs, saveReminderPrefs } from '@/services/reminder-prefs';
import { useAuthStore } from '@/store/auth-store';
import type { ReminderPrefs } from '@/types';

export function useReminderPrefs() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['reminder-prefs', userId],
    queryFn: fetchReminderPrefs,
    enabled: Boolean(userId),
  });
}

export function useSaveReminderPrefs() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: ReminderPrefs) => saveReminderPrefs({ userId: userId!, prefs }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reminder-prefs'] }),
  });
}
