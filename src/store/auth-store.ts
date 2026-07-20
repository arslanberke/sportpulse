import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  session: Session | null;
  /** True until the persisted session has been loaded on app start. */
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
}

/**
 * Global auth state. Kept intentionally small: Supabase owns the session,
 * this store just mirrors it so any component can react to login/logout.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
}));
