import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';

interface ProfileRow {
  id: string;
  full_name: string;
  country_code: string;
  avatar_url: string | null;
  created_at: string;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, country_code, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ProfileRow;
  return {
    id: row.id,
    fullName: row.full_name,
    countryCode: row.country_code,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export async function updateProfile(params: {
  userId: string;
  fullName?: string;
  countryCode?: string;
}) {
  const updates: Record<string, string> = {};
  if (params.fullName !== undefined) updates.full_name = params.fullName;
  if (params.countryCode !== undefined) updates.country_code = params.countryCode;
  const { error } = await supabase.from('profiles').update(updates).eq('id', params.userId);
  if (error) throw error;
}
