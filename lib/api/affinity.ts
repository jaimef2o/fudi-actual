// @ts-nocheck
import { supabase } from '../supabase';

/**
 * Compute affinity score between two users based on:
 * - Restaurant overlap (visited same places)
 * - Sentiment agreement (both loved/disliked same places)
 * - Score proximity (similar rank_scores for shared restaurants)
 *
 * Returns 0-100 score
 */
export async function computeAffinity(
  userA: string,
  userB: string
): Promise<number> {
  // Get all visits for both users
  const [{ data: visitsA }, { data: visitsB }] = await Promise.all([
    supabase
      .from('visits')
      .select('restaurant_id, sentiment, rank_score')
      .eq('user_id', userA),
    supabase
      .from('visits')
      .select('restaurant_id, sentiment, rank_score')
      .eq('user_id', userB),
  ]);

  if (!visitsA?.length || !visitsB?.length) return 0;

  // Build maps: restaurant_id → { sentiment, rank_score }
  // Use most recent visit per restaurant
  const mapA = new Map<string, { sentiment: string | null; score: number | null }>();
  for (const v of visitsA) {
    mapA.set(v.restaurant_id, { sentiment: v.sentiment, score: v.rank_score });
  }

  const mapB = new Map<string, { sentiment: string | null; score: number | null }>();
  for (const v of visitsB) {
    mapB.set(v.restaurant_id, { sentiment: v.sentiment, score: v.rank_score });
  }

  // Find shared restaurants
  const shared: string[] = [];
  for (const rid of mapA.keys()) {
    if (mapB.has(rid)) shared.push(rid);
  }

  if (shared.length === 0) {
    // No overlap — give a small base score for being connected
    return 5;
  }

  // 1. Overlap ratio (0-40 points)
  const totalUnique = new Set([...mapA.keys(), ...mapB.keys()]).size;
  const overlapRatio = shared.length / totalUnique;
  const overlapScore = overlapRatio * 40;

  // 2. Sentiment agreement (0-30 points)
  let sentimentMatches = 0;
  let sentimentTotal = 0;
  for (const rid of shared) {
    const sA = mapA.get(rid)?.sentiment;
    const sB = mapB.get(rid)?.sentiment;
    if (sA && sB) {
      sentimentTotal++;
      if (sA === sB) sentimentMatches++;
    }
  }
  const sentimentScore = sentimentTotal > 0
    ? (sentimentMatches / sentimentTotal) * 30
    : 15; // neutral if no sentiment data

  // 3. Score proximity (0-30 points)
  let scoreDiffs: number[] = [];
  for (const rid of shared) {
    const scoreA = mapA.get(rid)?.score;
    const scoreB = mapB.get(rid)?.score;
    if (scoreA != null && scoreB != null) {
      scoreDiffs.push(Math.abs(scoreA - scoreB));
    }
  }
  let scoreProximity = 15; // neutral default
  if (scoreDiffs.length > 0) {
    const avgDiff = scoreDiffs.reduce((a, b) => a + b, 0) / scoreDiffs.length;
    // avgDiff 0 → 30 points, avgDiff 5+ → 0 points
    scoreProximity = Math.max(0, 30 * (1 - avgDiff / 5));
  }

  return Math.round(Math.min(100, overlapScore + sentimentScore + scoreProximity));
}

/**
 * Recompute affinity for all mutual relationships of a given user.
 * Call this after a user creates/updates a visit.
 */
export async function refreshAffinityForUser(userId: string): Promise<void> {
  // Get all people this user follows
  const { data: rels } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', userId);

  if (!rels?.length) return;

  // Get who follows this user back (mutual)
  const { data: reverseRels } = await supabase
    .from('relationships')
    .select('user_id')
    .eq('target_id', userId);

  const reverseSet = new Set((reverseRels ?? []).map((r: any) => r.user_id));
  const mutualIds = (rels ?? [])
    .map((r: any) => r.target_id)
    .filter((id: string) => reverseSet.has(id));

  // Compute affinity for each mutual friend (limit to 50 to avoid timeout)
  const batch = mutualIds.slice(0, 50);
  const updates = await Promise.all(
    batch.map(async (friendId: string) => {
      const score = await computeAffinity(userId, friendId);
      return { userId, friendId, score };
    })
  );

  // Update both directions
  for (const { userId: uid, friendId, score } of updates) {
    await supabase
      .from('relationships')
      .update({ affinity_score: score })
      .eq('user_id', uid)
      .eq('target_id', friendId);

    await supabase
      .from('relationships')
      .update({ affinity_score: score })
      .eq('user_id', friendId)
      .eq('target_id', uid);
  }
}

/**
 * Get affinity score between two users (from cache in relationships table).
 * Returns null if not yet computed.
 */
export async function getAffinity(
  userA: string,
  userB: string
): Promise<number | null> {
  const { data } = await supabase
    .from('relationships')
    .select('affinity_score')
    .eq('user_id', userA)
    .eq('target_id', userB)
    .maybeSingle();

  return data?.affinity_score ?? null;
}
