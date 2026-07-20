import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchNotifications, markNotificationRead } from '@/services/notifications';

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
