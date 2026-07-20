import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchProfile, updateProfile } from '@/services/profile';
import { useAuthStore } from '@/store/auth-store';

export function useProfile() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}
