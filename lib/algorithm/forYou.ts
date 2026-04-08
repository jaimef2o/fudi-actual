// ─── For You Feed — Orchestration ────────────────────────────────────────────
import { supabase } from '../supabase';
import {
  ForYouCandidate,
  TasteCache,
  tasteAffinityScore,
  geoProximityScore,
  socialProximityScore,
  engagementScore,
  contentQualityScore,
  recencyScore,
} from './signals';
import {
  WEIGHTS,
  FOR_YOU_PAGE_SIZE,
  MAX_AUTHOR_PER_PAGE,
  INITIAL_CANDIDATE_DAYS,
  MAX_CANDIDATE_DAYS,
  MIN_CANDIDATES,
} from './constants';
import type { FeedPost } from '../api/feed';

// ─── Taste Cache ─────────────────────────────────────────────────────────────

export async function getUserTasteCache(userId: string): Promise<TasteCache> {
  // Build taste cache from user's own visits
  const { data: visits } = await supabase
    .from('visits')
    .select('sentiment, restaurant:restaurants!restaurant_id (cuisine)')
    .eq('user_id', userId);

  const cuisineMap: Record<string, { total: number; count: number }> = {};
  for (const v of (visits ?? []) as any[]) {
    const cuisine = v.restaurant?.cuisine;
    if (!cuisine || !v.sentiment) continue;
    if (!cuisineMap[cuisine]) cuisineMap[cuisine] = { total: 0, count: 0 };
    cuisineMap[cuisine].count += 1;
    cuisineMap[cuisine].total +=
      v.sentiment === 'loved' ? 1.0 :
      v.sentiment === 'fine'  ? 0.5 : 0.0;
  }

  const cuisine_scores: Record<string, number> = {};
  for (const [cuisine, { total, count }] of Object.entries(cuisineMap)) {
    cuisine_scores[cuisine] = total / count;
  }

  return { cuisine_scores };
}

// ─── Candidate Fetching ──────────────────────────────────────────────────────

async function fetchCandidates(
  userId: string,
  days: number
): Promise<ForYouCandidate[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Get user's social graph for social signals
  const [{ data: iFollow }, { data: followMe }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', userId)
      .eq('status', 'active'),
  ]);

  const iFollowSet = new Set((iFollow ?? []).map((r: any) => r.target_id));
  const followMeSet = new Set((followMe ?? []).map((r: any) => r.user_id));
  const mutualSet = new Set([...iFollowSet].filter(id => followMeSet.has(id)));

  // 2. Build friends-of-friends map for social proof
  // For each user I follow, get who they follow — to compute mutual_friends_following_author
  const { data: fofData } = await supabase
    .from('relationships')
    .select('user_id, target_id')
    .in('user_id', [...iFollowSet])
    .eq('status', 'active');

  const fofCount: Map<string, number> = new Map();
  for (const r of (fofData ?? []) as any[]) {
    if (r.target_id !== userId) {
      fofCount.set(r.target_id, (fofCount.get(r.target_id) ?? 0) + 1);
    }
  }

  // 3. Fetch public visits from public users (excluding self)
  const { data: visits, error } = await supabase
    .from('visits')
    .select(`
      id,
      user_id,
      restaurant_id,
      visited_at,
      created_at,
      sentiment,
      rank_score,
      note,
      visibility,
      restaurant:restaurants!restaurant_id (name, lat, lng, cuisine, city),
      user:users!user_id (name, handle, avatar_url, city, is_public)
    `)
    .neq('user_id', userId)
    .neq('visibility', 'private')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  // Filter to only public users on the client side
  const publicVisits = ((visits ?? []) as any[]).filter(
    (v) => v.user?.is_public !== false
  );

  // 4. Batch-fetch engagement counts
  const visitIds = publicVisits.map((v: any) => v.id);

  const [{ data: reactionData }, { data: photoData }, { data: dishData }] = await Promise.all([
    visitIds.length > 0
      ? supabase.from('reactions').select('visit_id').in('visit_id', visitIds)
      : { data: [] },
    visitIds.length > 0
      ? supabase.from('visit_photos').select('visit_id').in('visit_id', visitIds)
      : { data: [] },
    visitIds.length > 0
      ? supabase.from('visit_dishes').select('visit_id').in('visit_id', visitIds)
      : { data: [] },
  ]);

  const reactionCounts: Record<string, number> = {};
  for (const r of (reactionData ?? []) as any[]) {
    reactionCounts[r.visit_id] = (reactionCounts[r.visit_id] ?? 0) + 1;
  }
  const photoCounts: Record<string, number> = {};
  for (const p of (photoData ?? []) as any[]) {
    photoCounts[p.visit_id] = (photoCounts[p.visit_id] ?? 0) + 1;
  }
  const dishCounts: Record<string, number> = {};
  for (const d of (dishData ?? []) as any[]) {
    dishCounts[d.visit_id] = (dishCounts[d.visit_id] ?? 0) + 1;
  }

  // 5. Map to ForYouCandidate shape
  return publicVisits.map((v: any) => ({
    visit_id: v.id,
    author_id: v.user_id,
    restaurant_id: v.restaurant_id,
    visited_at: v.visited_at,
    created_at: v.created_at,
    sentiment: v.sentiment,
    rank_score: v.rank_score,
    note: v.note,
    restaurant_name: v.restaurant?.name ?? '',
    lat: v.restaurant?.lat ? Number(v.restaurant.lat) : null,
    lng: v.restaurant?.lng ? Number(v.restaurant.lng) : null,
    cuisine: v.restaurant?.cuisine ?? null,
    city: v.restaurant?.city ?? null,
    author_name: v.user?.name ?? '',
    author_handle: v.user?.handle ?? null,
    author_avatar: v.user?.avatar_url ?? null,
    author_city: v.user?.city ?? null,
    i_follow_author: iFollowSet.has(v.user_id),
    is_mutual: mutualSet.has(v.user_id),
    mutual_friends_following_author: fofCount.get(v.user_id) ?? 0,
    reaction_count: reactionCounts[v.id] ?? 0,
    total_saves: 0, // saves are tracked per restaurant, skip for v1
    photo_count: photoCounts[v.id] ?? 0,
    dish_count: dishCounts[v.id] ?? 0,
  }));
}

export async function getCandidates(userId: string): Promise<ForYouCandidate[]> {
  let days = INITIAL_CANDIDATE_DAYS;
  let candidates = await fetchCandidates(userId, days);

  while (candidates.length < MIN_CANDIDATES && days < MAX_CANDIDATE_DAYS) {
    days *= 2;
    candidates = await fetchCandidates(userId, days);
  }

  return candidates;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export type ScoredCandidate = ForYouCandidate & { score: number };

export function scoreCandidate(
  candidate: ForYouCandidate,
  userTaste: TasteCache,
  userCity: string | null,
  userLat?: number | null,
  userLng?: number | null
): number {
  const taste   = tasteAffinityScore(candidate, userTaste);
  const geo     = geoProximityScore(candidate, userCity, userLat, userLng);
  const social  = socialProximityScore(candidate);
  const engage  = engagementScore(candidate);
  const quality = contentQualityScore(candidate);
  const recency = recencyScore(candidate);

  return (
    taste   * WEIGHTS.taste +
    geo     * WEIGHTS.geo +
    social  * WEIGHTS.social +
    engage  * WEIGHTS.engage +
    quality * WEIGHTS.quality +
    recency * WEIGHTS.recency
  );
}

// ─── Diversification ─────────────────────────────────────────────────────────

export function diversify(
  ranked: ScoredCandidate[],
  pageSize: number = FOR_YOU_PAGE_SIZE
): ScoredCandidate[] {
  const result: ScoredCandidate[] = [];
  const authorCount = new Map<string, number>();
  const restaurantSeen = new Set<string>();

  for (const candidate of ranked) {
    const authorPosts = authorCount.get(candidate.author_id) ?? 0;
    if (authorPosts >= MAX_AUTHOR_PER_PAGE) continue;
    if (restaurantSeen.has(candidate.restaurant_id)) continue;

    result.push(candidate);
    authorCount.set(candidate.author_id, authorPosts + 1);
    restaurantSeen.add(candidate.restaurant_id);

    if (result.length >= pageSize) break;
  }

  return result;
}

// ─── Full pipeline ───────────────────────────────────────────────────────────

export async function getForYouFeed(
  userId: string,
  offset: number = 0,
  pageSize: number = FOR_YOU_PAGE_SIZE
): Promise<FeedPost[]> {
  // 1. Candidates
  const candidates = await getCandidates(userId);

  // 2. User context for scoring
  const [userTaste, { data: userProfile }] = await Promise.all([
    getUserTasteCache(userId),
    supabase.from('users').select('city').eq('id', userId).single(),
  ]);
  const userCity = (userProfile as any)?.city ?? null;

  // 3. Score all candidates
  const scored: ScoredCandidate[] = candidates
    .map(c => ({ ...c, score: scoreCandidate(c, userTaste, userCity) }))
    .sort((a, b) => b.score - a.score);

  // 4. Skip already-seen (offset-based)
  const sliced = scored.slice(offset);

  // 5. Diversify the page
  const page = diversify(sliced, pageSize);

  // 6. Hydrate into FeedPost shape (fetch full post data for the page)
  if (page.length === 0) return [];

  const visitIds = page.map(c => c.visit_id);
  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      note,
      spend_per_person,
      rank_score,
      sentiment,
      visibility,
      user_id,
      user:users!user_id (id, name, avatar_url),
      restaurant:restaurants!restaurant_id (id, name, chain_name, neighborhood, city, cover_image_url, cuisine, price_level),
      dishes:visit_dishes (id, name, highlighted, position),
      photos:visit_photos!visit_id (photo_url, type, dish_id),
      tags:visit_tags (
        tagged_user:users!tagged_user_id (id, name, avatar_url)
      ),
      reactions:reactions (id, emoji, user_id)
    `)
    .in('id', visitIds);

  if (error) throw error;

  // Preserve algorithm order and annotate
  const postMap = new Map((data ?? []).map((p: any) => [p.id, p]));
  const scoreMap = new Map(page.map(c => [c.visit_id, c]));

  return page
    .map(c => {
      const post = postMap.get(c.visit_id);
      if (!post) return null;
      return {
        ...post,
        is_mutual: c.is_mutual,
        _iFollowAuthor: c.i_follow_author,
      };
    })
    .filter(Boolean) as unknown as FeedPost[];
}
