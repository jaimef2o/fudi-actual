import { supabase } from '../supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'follow_request'
  | 'new_follower'
  | 'new_visit'
  | 'tagged'
  | 'comment'
  | 'follow_accepted'
  | 'post_saved';

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  actor_id: string | null;
  visit_id: string | null;
  restaurant_id: string | null;
  read_at: string | null;
  created_at: string;
  actor?: {
    id: string;
    name: string;
    avatar_url: string | null;
    handle: string | null;
  } | null;
};

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Fetch notifications for a user, ordered by newest first.
 * Joins actor profile for avatar/name display.
 */
export async function getNotifications(
  userId: string,
  limit = 50
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:users!notifications_actor_id_fkey(id, name, avatar_url, handle)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}

/**
 * Count unread notifications.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

/**
 * Create a notification (used by triggers).
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: string;
  visitId?: string;
  restaurantId?: string;
}): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    actor_id: input.actorId ?? null,
    visit_id: input.visitId ?? null,
    restaurant_id: input.restaurantId ?? null,
  });
}
