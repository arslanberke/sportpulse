import { supabase } from '@/services/supabase';
import type { AppNotification } from '@/types';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data as NotificationRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
