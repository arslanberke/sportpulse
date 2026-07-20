import { supabase } from '@/services/supabase';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

export async function signUp({ email, password, fullName }: SignUpParams) {
  // Metadata is picked up by a database trigger that creates the profile row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
