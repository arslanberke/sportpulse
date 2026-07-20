import { useEffect } from 'react';

import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/auth-store';

/**
 * Bootstraps auth on app start: loads the persisted session and keeps the
 * global store in sync with every future login/logout event.
 * Mount this once, in the root layout.
 */
export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setLoading]);
}
