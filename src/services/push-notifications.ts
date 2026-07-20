import { supabase } from '@/services/supabase';

/** Save (or re-save) a push token for the current user. */
export async function registerPushToken(params: {
  userId: string;
  token: string;
  platform?: string;
}) {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: params.userId,
      token: params.token,
      platform: params.platform ?? null,
    },
    { onConflict: 'user_id,token' },
  );
  if (error) throw error;
}

/** Remove a push token when the user logs out or revokes permission. */
export async function unregisterPushToken(token: string) {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);
  if (error) throw error;
}
