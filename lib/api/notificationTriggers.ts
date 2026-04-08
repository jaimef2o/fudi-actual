/**
 * Notification Triggers — sends push notifications for key social events.
 *
 * These are client-side triggers that fire when the current user performs
 * an action that should notify other users. For production scale, these
 * should be moved to Supabase Edge Functions.
 */

import { supabase } from '../supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default';
};

/**
 * Send push notification via Expo Push API.
 * Fire-and-forget — errors are silently caught.
 */
async function sendPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    if (__DEV__) console.warn('[savry] Push notification send failed:', err);
  }
}

/**
 * Get push tokens for a list of user IDs.
 */
async function getTokens(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from('users')
    .select('id, push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);

  const map = new Map<string, string>();
  for (const u of (data ?? []) as { id: string; push_token: string | null }[]) {
    if (u.push_token) map.set(u.id, u.push_token);
  }
  return map;
}

// ─── Trigger: New visit from friend ──────────────────────────────────────────

/**
 * Notify mutual friends when a user creates a new visit.
 * "Carlos acaba de visitar Casa Botín — 9.2"
 */
export async function notifyNewVisit(
  userId: string,
  userName: string,
  restaurantName: string,
  score: number | null,
  visitId: string
): Promise<void> {
  // Get mutual friends
  const { data: iFollow } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', userId);

  const { data: followMe } = await supabase
    .from('relationships')
    .select('user_id')
    .eq('target_id', userId);

  const followMeSet = new Set((followMe ?? []).map((r: { user_id: string }) => r.user_id));
  const mutualIds = (iFollow ?? [])
    .map((r: { target_id: string }) => r.target_id)
    .filter((id: string) => followMeSet.has(id));

  const tokens = await getTokens(mutualIds);
  if (tokens.size === 0) return;

  const scoreText = score != null ? ` — ${score.toFixed(1)}` : '';
  const messages: PushMessage[] = [...tokens.values()].map((token) => ({
    to: token,
    title: 'Nueva visita',
    body: `${userName} acaba de visitar ${restaurantName}${scoreText}`,
    data: { visitId, type: 'new_visit' },
    sound: 'default',
  }));

  await sendPush(messages);
}

// ─── Trigger: Tagged in visit ────────────────────────────────────────────────

/**
 * Notify users when they are tagged in a visit.
 * "Marina te etiquetó en su visita a DiverXO"
 */
export async function notifyTaggedInVisit(
  taggerName: string,
  restaurantName: string,
  taggedUserIds: string[],
  visitId: string
): Promise<void> {
  const tokens = await getTokens(taggedUserIds);
  if (tokens.size === 0) return;

  const messages: PushMessage[] = [...tokens.entries()].map(([_, token]) => ({
    to: token,
    title: 'Te han etiquetado',
    body: `${taggerName} te etiquetó en su visita a ${restaurantName}`,
    data: { visitId, type: 'tagged' },
    sound: 'default',
  }));

  await sendPush(messages);
}

// ─── Trigger: New follow request ─────────────────────────────────────────────

/**
 * Notify a user when someone follows them.
 * Pending (private target): "Javier quiere seguirte en savry"
 * Active (public target):   "Javier te ha empezado a seguir"
 */
export async function notifyNewFollower(
  followerName: string,
  targetUserId: string,
  isPending: boolean = false
): Promise<void> {
  const tokens = await getTokens([targetUserId]);
  const token = tokens.get(targetUserId);
  if (!token) return;

  const title = isPending ? 'Nueva solicitud' : 'Nuevo seguidor';
  const body = isPending
    ? `${followerName} quiere seguirte en savry`
    : `${followerName} te ha empezado a seguir`;

  await sendPush([{
    to: token,
    title,
    body,
    data: { type: isPending ? 'follow_request' : 'new_follower' },
    sound: 'default',
  }]);
}

// ─── Trigger: New comment ────────────────────────────────────────────────────

/**
 * Notify visit owner when someone comments on their visit.
 */
export async function notifyNewComment(
  commenterName: string,
  visitOwnerId: string,
  restaurantName: string,
  visitId: string
): Promise<void> {
  const tokens = await getTokens([visitOwnerId]);
  const token = tokens.get(visitOwnerId);
  if (!token) return;

  await sendPush([{
    to: token,
    title: 'Nuevo comentario',
    body: `${commenterName} comentó en tu visita a ${restaurantName}`,
    data: { visitId, type: 'comment' },
    sound: 'default',
  }]);
}
