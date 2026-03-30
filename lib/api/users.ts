// @ts-nocheck
import { supabase } from '../supabase';
import type { UserRow, RelationshipRow } from '../database.types';
import { notifyNewFollower } from './notificationTriggers';

// ─── Handle utilities ──────────────────────────────────────────────────────

/**
 * Convert a display name into a valid handle candidate:
 * lowercase, accents removed, only [a-z0-9_], max 20 chars.
 */
export function nameToHandle(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')      // keep only allowed chars
    .slice(0, 20)
    || 'usuario';
}

/**
 * Validate handle format: 3–20 chars, only [a-z0-9_], no leading/trailing underscore.
 * Returns an error string or null if valid.
 */
export function validateHandleFormat(handle: string): string | null {
  if (handle.length < 3) return 'Mínimo 3 caracteres.';
  if (handle.length > 20) return 'Máximo 20 caracteres.';
  if (!/^[a-z0-9_]+$/.test(handle)) return 'Solo letras minúsculas, números y _.';
  if (handle.startsWith('_') || handle.endsWith('_')) return 'No puede empezar ni terminar con _.';
  return null;
}

/** Returns true if the handle is available (not taken). */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('handle', handle);
  return (count ?? 0) === 0;
}

// ─── Profile ───────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: {
    name?: string;
    bio?: string;
    city?: string;
    avatar_url?: string;
    dietary_restrictions?: string[];
    cuisine_dislikes?: string[];
  }
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Relationships ──────────────────────────────────────────────────────────

export type FriendWithProfile = RelationshipRow & { friend: UserRow };

export type FollowRequest = {
  user_id: string;
  created_at: string;
  requester: UserRow;
};

// Mutual friends — bidirectional check (avoids needing type='mutual' which requires cross-user RLS)
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  // Everyone I follow
  const { data: iFollow, error: e1 } = await supabase
    .from('relationships')
    .select('target_id, friend:users!target_id(*)')
    .eq('user_id', userId);
  if (e1) throw e1;

  // Everyone who follows me
  const { data: followMe, error: e2 } = await supabase
    .from('relationships')
    .select('user_id')
    .eq('target_id', userId);
  if (e2) throw e2;

  const followMeSet = new Set((followMe ?? []).map((r: any) => r.user_id));
  // Mutual = I follow them AND they follow me
  return (iFollow ?? []).filter((r: any) => followMeSet.has(r.target_id)) as FriendWithProfile[];
}

// People I follow who haven't followed back yet (outgoing one-way)
export async function getFollowing(userId: string): Promise<FriendWithProfile[]> {
  const { data: iFollow, error: e1 } = await supabase
    .from('relationships')
    .select('target_id, friend:users!target_id(*)')
    .eq('user_id', userId);
  if (e1) throw e1;

  const { data: followMe, error: e2 } = await supabase
    .from('relationships')
    .select('user_id')
    .eq('target_id', userId);
  if (e2) throw e2;

  const followMeSet = new Set((followMe ?? []).map((r: any) => r.user_id));
  // One-way: I follow them but they don't follow me back
  return (iFollow ?? []).filter((r: any) => !followMeSet.has(r.target_id)) as FriendWithProfile[];
}

// People who follow me but I haven't followed back (incoming requests)
export async function getFollowRequests(userId: string): Promise<FollowRequest[]> {
  // Everyone who follows me
  const { data: followMe, error: e1 } = await supabase
    .from('relationships')
    .select('user_id, created_at, requester:users!user_id(*)')
    .eq('target_id', userId);
  if (e1) throw e1;

  // Everyone I follow
  const { data: iFollow, error: e2 } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', userId);
  if (e2) throw e2;

  const iFollowSet = new Set((iFollow ?? []).map((r: any) => r.target_id));
  // Requests = they follow me but I haven't followed back
  return (followMe ?? []).filter((r: any) => !iFollowSet.has(r.user_id)) as unknown as FollowRequest[];
}

export async function getRelationship(
  userId: string,
  targetId: string
): Promise<RelationshipRow | null> {
  const { data } = await supabase
    .from('relationships')
    .select('*')
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .maybeSingle();

  return data;
}

// Follow: only manage own row — mutuality is detected bidirectionally at query time
export async function followUser(userId: string, targetId: string) {
  const { error } = await supabase
    .from('relationships')
    .upsert(
      { user_id: userId, target_id: targetId, type: 'following' },
      { onConflict: 'user_id,target_id' }
    );
  if (error) throw error;

  // Fire-and-forget: notify the target user
  supabase.from('users').select('name').eq('id', userId).single()
    .then(({ data }) => {
      if (data?.name) notifyNewFollower(data.name, targetId).catch(() => {});
    })
    .catch(() => {});
}

// Unfollow: just delete own row — no cross-user update needed
export async function unfollowUser(userId: string, targetId: string) {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('user_id', userId)
    .eq('target_id', targetId);
  if (error) throw error;
}

// ─── Invitations ────────────────────────────────────────────────────────────

export type InvitationRow = {
  id: string;
  inviter_user_id: string;
  token: string;
  claimed_by_user_id: string | null;
  created_at: string;
  claimed_at: string | null;
  inviter?: Pick<UserRow, 'id' | 'name' | 'avatar_url'>;
};

/** Generate a cryptographically random URL-safe token. */
function randomToken(): string {
  const bytes = new Uint8Array(16);
  // Works in React Native (Hermes) and browsers
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Create a new invitation token for the current user. */
export async function createInvitation(inviterUserId: string): Promise<InvitationRow> {
  const token = randomToken();

  const { data, error } = await supabase
    .from('invitations')
    .insert({ inviter_user_id: inviterUserId, token })
    .select()
    .single();

  if (error) throw error;
  return data as InvitationRow;
}

/** Look up an invitation by token (includes inviter profile). */
export async function getInvitation(token: string): Promise<InvitationRow | null> {
  const { data } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:users!inviter_user_id (id, name, avatar_url)
    `)
    .eq('token', token)
    .maybeSingle();

  return data as InvitationRow | null;
}

export type ClaimResult = 'ok' | 'already_claimed' | 'not_found' | 'error';

/**
 * Claim an invitation — marks it as used and creates a mutual following
 * relationship between inviter and new user.
 * Returns a status so callers can show the right message.
 */
export async function claimInvitation(token: string, newUserId: string): Promise<ClaimResult> {
  try {
    const { data: inv, error } = await supabase
      .from('invitations')
      .select('id, inviter_user_id, claimed_by_user_id')
      .eq('token', token)
      .maybeSingle();

    if (error) return 'error';
    if (!inv) return 'not_found';
    if (inv.claimed_by_user_id) {
      // Allow the same user to re-claim their own invite (e.g. re-install)
      if (inv.claimed_by_user_id === newUserId) return 'ok';
      return 'already_claimed';
    }

    const { error: updateErr } = await supabase
      .from('invitations')
      .update({ claimed_by_user_id: newUserId, claimed_at: new Date().toISOString() })
      .eq('id', inv.id);

    if (updateErr) return 'error';

    // Mutual follow: inviter ↔ new user
    await followUser(inv.inviter_user_id, newUserId);
    await followUser(newUserId, inv.inviter_user_id);

    return 'ok';
  } catch {
    return 'error';
  }
}

// ─── Reject follow request ───────────────────────────────────────────────────

/**
 * Reject/dismiss an incoming follow request.
 * Deletes the relationship row where requester follows you (before you've followed back).
 */
export async function rejectFollowRequest(
  requesterId: string,
  currentUserId: string
): Promise<void> {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('user_id', requesterId)
    .eq('target_id', currentUserId);
  if (error) throw error;
}

// ─── Update visit ─────────────────────────────────────────────────────────────

// ─── Follower / Following counts ─────────────────────────────────────────────

export async function getFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('relationships')
    .select('*', { count: 'exact', head: true })
    .eq('target_id', userId);
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('relationships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

// ─── Suggested users (people with visits that current user doesn't follow) ───

export async function getSuggestedUsers(
  currentUserId: string,
  limit = 10
): Promise<UserRow[]> {
  // Get IDs already followed (including self)
  const { data: rels } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', currentUserId);

  const alreadyFollowing = new Set<string>(
    [(currentUserId), ...((rels ?? []).map((r: any) => r.target_id))]
  );

  // Find users with most visits not already followed
  const { data: visitCounts } = await supabase
    .from('visits')
    .select('user_id')
    .eq('visibility', 'friends');

  if (!visitCounts || visitCounts.length === 0) {
    // Fallback: just return some recent users
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).filter((u: UserRow) => !alreadyFollowing.has(u.id)).slice(0, limit);
  }

  // Count visits per user
  const countMap: Record<string, number> = {};
  for (const v of visitCounts) {
    const uid = (v as any).user_id;
    if (!alreadyFollowing.has(uid)) {
      countMap[uid] = (countMap[uid] ?? 0) + 1;
    }
  }

  const topUserIds = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);

  if (topUserIds.length === 0) return [];

  const { data } = await supabase
    .from('users')
    .select('*')
    .in('id', topUserIds);

  // Preserve visit-count order
  const userMap = new Map((data ?? []).map((u: UserRow) => [u.id, u]));
  return topUserIds.map((id) => userMap.get(id)).filter(Boolean) as UserRow[];
}

// Search users by name or handle
export async function searchUsers(query: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`name.ilike.%${query}%,handle.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data ?? [];
}
