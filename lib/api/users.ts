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

export type RelationshipStatus = 'none' | 'pending' | 'following' | 'mutual';

/**
 * Follow a user. Checks if the target is public or private:
 * - Public: upsert with status 'active'
 * - Private: upsert with status 'pending'
 * Returns the resulting status ('active' | 'pending').
 */
export async function followUser(
  userId: string,
  targetId: string
): Promise<'active' | 'pending'> {
  // Check if target user is public
  const { data: targetUser, error: userErr } = await supabase
    .from('users')
    .select('is_public')
    .eq('id', targetId)
    .single();

  if (userErr) throw userErr;

  const status = targetUser?.is_public === false ? 'pending' : 'active';

  const { error } = await supabase
    .from('relationships')
    .upsert(
      { user_id: userId, target_id: targetId, type: 'following', status },
      { onConflict: 'user_id,target_id' }
    );
  if (error) throw error;

  // Fire-and-forget: notify the target user
  Promise.resolve(supabase.from('users').select('name').eq('id', userId).single())
    .then(({ data }) => {
      if (data?.name) notifyNewFollower(data.name, targetId, status === 'pending').catch((err: unknown) => {
        if (__DEV__) console.warn('[savry] notifyNewFollower failed:', err);
      });
    })
    .catch((err: unknown) => {
      if (__DEV__) console.warn('[savry] followUser notification setup failed:', err);
    });

  return status;
}

/** Unfollow: delete the row regardless of status. */
export async function unfollowUser(userId: string, targetId: string) {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('user_id', userId)
    .eq('target_id', targetId);
  if (error) throw error;
}

/**
 * Respond to an incoming follow request.
 * - accept: update status from 'pending' to 'active'
 * - reject: delete the row
 */
export async function respondToFollowRequest(
  myId: string,
  requesterId: string,
  accept: boolean
): Promise<void> {
  if (accept) {
    const { error } = await supabase
      .from('relationships')
      .update({ status: 'active' })
      .eq('user_id', requesterId)
      .eq('target_id', myId)
      .eq('status', 'pending');
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('relationships')
      .delete()
      .eq('user_id', requesterId)
      .eq('target_id', myId)
      .eq('status', 'pending');
    if (error) throw error;
  }
}

/**
 * Get the relationship status between two users:
 * - 'mutual': both follow each other with status='active'
 * - 'following': only userId follows targetId with status='active'
 * - 'pending': userId has a pending follow request to targetId
 * - 'none': no relationship
 */
export async function getRelationship(
  userId: string,
  targetId: string
): Promise<RelationshipStatus> {
  const [{ data: iFollowRow }, { data: theyFollowRow }] = await Promise.all([
    supabase
      .from('relationships')
      .select('type, status')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .maybeSingle(),
    supabase
      .from('relationships')
      .select('type, status')
      .eq('user_id', targetId)
      .eq('target_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  // I have a pending request to them
  if (iFollowRow && iFollowRow.status === 'pending') return 'pending';

  const iFollow = !!iFollowRow && iFollowRow.status === 'active';
  const theyFollow = !!theyFollowRow;

  if (iFollow && theyFollow) return 'mutual';
  if (iFollow) return 'following';
  return 'none';
}

/**
 * Return array of user IDs who are mutual friends (both directions active).
 */
export async function getMutualFriendIds(userId: string): Promise<string[]> {
  const [{ data: iFollow, error: e1 }, { data: followMe, error: e2 }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following']),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following']),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const followMeSet = new Set((followMe ?? []).map((r: { user_id: string }) => r.user_id));
  return (iFollow ?? [])
    .map((r: { target_id: string }) => r.target_id)
    .filter((id: string) => followMeSet.has(id));
}

/**
 * Mutual friends — bidirectional check, both directions must have status='active'.
 */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  const [{ data: iFollow, error: e1 }, { data: followMe, error: e2 }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id, affinity_score, friend:users!target_id(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following']),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following']),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  type RelWithFriend = { target_id: string; affinity_score: number | null; friend: UserRow };
  const followMeSet = new Set((followMe ?? []).map((r: { user_id: string }) => r.user_id));
  // Mutual = I follow them AND they follow me, both active
  const mutuals = ((iFollow ?? []) as unknown as RelWithFriend[]).filter((r) => followMeSet.has(r.target_id));

  // Fetch visit stats (count + avg score) for each mutual friend
  const friendIds = mutuals.map((r) => r.target_id);
  if (friendIds.length > 0) {
    const { data: visitStats } = await supabase
      .from('visits')
      .select('user_id, rank_score')
      .in('user_id', friendIds);

    const statsMap: Record<string, { count: number; total: number }> = {};
    (visitStats ?? []).forEach((v: { user_id: string; rank_score: number | null }) => {
      if (!statsMap[v.user_id]) statsMap[v.user_id] = { count: 0, total: 0 };
      statsMap[v.user_id].count += 1;
      if (v.rank_score != null) statsMap[v.user_id].total += Number(v.rank_score);
    });

    return mutuals.map((r) => {
      const stats = statsMap[r.target_id];
      return {
        ...r,
        visit_count: stats?.count ?? 0,
        avg_score: stats && stats.count > 0 ? stats.total / stats.count : 0,
      };
    }) as unknown as FriendWithProfile[];
  }

  return mutuals as unknown as FriendWithProfile[];
}

/**
 * People I follow (active) who haven't followed back yet (outgoing one-way).
 */
export async function getFollowing(userId: string): Promise<FriendWithProfile[]> {
  const [{ data: iFollow, error: e1 }, { data: followMe, error: e2 }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id, friend:users!target_id(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following']),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following']),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const followMeSet = new Set((followMe ?? []).map((r: { user_id: string }) => r.user_id));
  // One-way: I follow them (active) but they don't follow me back
  type RelWithFriendFollowing = { target_id: string; friend: UserRow };
  return ((iFollow ?? []) as unknown as RelWithFriendFollowing[]).filter((r) => !followMeSet.has(r.target_id)) as unknown as FriendWithProfile[];
}

/**
 * Pending incoming follow requests (status='pending' where target_id=userId).
 */
export async function getFollowRequests(userId: string): Promise<FollowRequest[]> {
  const { data, error } = await supabase
    .from('relationships')
    .select('user_id, created_at, requester:users!user_id(*)')
    .eq('target_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return (data ?? []) as unknown as FollowRequest[];
}

/**
 * People who follow me (active) but I don't follow back yet.
 * These are "new followers" the user can follow back.
 */
export async function getNewFollowers(userId: string): Promise<FollowRequest[]> {
  const [{ data: followMe, error: e1 }, { data: iFollow, error: e2 }] = await Promise.all([
    supabase
      .from('relationships')
      .select('user_id, created_at, requester:users!user_id(*)')
      .eq('target_id', userId)
      .eq('status', 'active')
      .in('type', ['mutual', 'following'])
      .order('created_at', { ascending: false }),
    supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const iFollowSet = new Set((iFollow ?? []).map((r: { target_id: string }) => r.target_id));
  // Only return followers I haven't followed back
  type FollowMeRow = { user_id: string; created_at: string; requester: UserRow };
  return ((followMe ?? []) as unknown as FollowMeRow[]).filter(
    (r) => !iFollowSet.has(r.user_id)
  ) as unknown as FollowRequest[];
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
 * Deletes the relationship row where requester follows you with status='pending'.
 */
export async function rejectFollowRequest(
  requesterId: string,
  currentUserId: string
): Promise<void> {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('user_id', requesterId)
    .eq('target_id', currentUserId)
    .eq('status', 'pending');
  if (error) throw error;
}

// ─── Update visit ─────────────────────────────────────────────────────────────

// ─── Follower / Following counts ─────────────────────────────────────────────

export async function getFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('relationships')
    .select('*', { count: 'exact', head: true })
    .eq('target_id', userId)
    .in('type', ['mutual', 'following']);
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('relationships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['mutual', 'following']);
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
    [(currentUserId), ...((rels ?? []).map((r: { target_id: string }) => r.target_id))]
  );

  // Find users with most visits not already followed
  const { data: visitCounts } = await supabase
    .from('visits')
    .select('user_id')
    .eq('visibility', 'friends');

  if (!visitCounts || visitCounts.length === 0) {
    // Fallback: just return some recent public users
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUserId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).filter((u: UserRow) => !alreadyFollowing.has(u.id)).slice(0, limit);
  }

  // Count visits per user
  const countMap: Record<string, number> = {};
  for (const v of visitCounts) {
    const uid = v.user_id as string;
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
    .in('id', topUserIds)
    .eq('is_public', true);

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
