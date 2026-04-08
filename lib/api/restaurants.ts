import { supabase } from '../supabase';
import type { RestaurantRow, RestaurantInsert } from '../database.types';
import { matchChain } from '../chains';
import { extractCuisineType } from './places';

// ─── Restaurant ─────────────────────────────────────────────────────────────

export async function getRestaurant(restaurantId: string): Promise<RestaurantRow | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) throw error;
  return data;
}

// Upsert restaurant from Google Places data.
// Uses SELECT-then-INSERT to avoid needing an UPDATE RLS policy.
// Automatically resolves chain_id by matching the restaurant name against the chains catalog.
export async function upsertRestaurant(restaurant: {
  google_place_id: string;
  name: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  lat?: number;
  lng?: number;
  /** Raw Google Places types array — used to auto-derive cuisine label */
  google_types?: string[];
  /** Raw Google Places price_level integer (1–4) */
  price_level?: number;
  cover_image_url?: string;
}): Promise<RestaurantRow> {
  // 1. Check if already exists
  const { data: existing } = await supabase
    .from('restaurants')
    .select('*')
    .eq('google_place_id', restaurant.google_place_id)
    .maybeSingle();

  if (existing) {
    // Backfill missing fields on existing restaurants
    const updates: { chain_name?: string; cover_image_url?: string } = {};
    if (!existing.chain_name) {
      const match = matchChain(existing.name);
      if (match) updates.chain_name = match.chainId;
    }
    if (!existing.cover_image_url && restaurant.cover_image_url) {
      updates.cover_image_url = restaurant.cover_image_url;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('restaurants').update(updates).eq('id', existing.id);
      return { ...existing, ...updates } as RestaurantRow;
    }
    return existing as RestaurantRow;
  }

  // 2. Resolve chain_name from catalog, derive cuisine
  const match = matchChain(restaurant.name);
  const chain_name = match?.chainId ?? null;
  const cuisine = extractCuisineType(restaurant.google_types ?? []);
  // 3. Insert — save cuisine as text label, keep price_level as integer (1–4)
  const { google_types, ...rest } = restaurant;
  const insertData: RestaurantInsert = {
    ...rest,
    chain_name,
    cuisine,
  };
  const { data, error } = await supabase
    .from('restaurants')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export type RestaurantStats = {
  visit_count: number;
  saved_count: number;
  avg_score: number | null;
};

export async function getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
  // Parallel queries instead of sequential
  const [visitsResult, savedResult] = await Promise.all([
    supabase
      .from('visits')
      .select('rank_score')
      .eq('restaurant_id', restaurantId),
    supabase
      .from('list_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId),
  ]);

  if (visitsResult.error) throw visitsResult.error;

  const visits = visitsResult.data ?? [];
  const scores = visits.map((v) => v.rank_score).filter((s): s is number => s !== null);
  const avg_score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  return {
    visit_count: visits.length,
    saved_count: savedResult.count ?? 0,
    avg_score: avg_score !== null ? Math.round(avg_score * 10) / 10 : null,
  };
}

// ─── Discover feed ──────────────────────────────────────────────────────────

export type DiscoverRestaurant = RestaurantRow & {
  score: number;
  visitCount: number;
  trendingScore: number;
};

export async function getDiscoverRestaurants(
  currentUserId: string,
  mode: 'amigos' | 'global',
  filters: {
    city?: string;
    neighborhoods?: string[];
    cuisines?: string[];
    prices?: string[];
    search?: string;
    sortBy?: 'rating' | 'trending';
  } = {}
): Promise<DiscoverRestaurant[]> {
  let userIds: string[] | null = null;

  if (mode === 'amigos') {
    const { data: rels } = await supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', currentUserId)
      .in('type', ['mutual', 'following']);

    userIds = (rels ?? []).map((r) => r.target_id);
    if (userIds.length === 0) return [];
  }

  let visitsQuery = supabase
    .from('visits')
    .select('restaurant_id, rank_score, visited_at')
    .not('rank_score', 'is', null);

  if (userIds !== null) {
    visitsQuery = visitsQuery.in('user_id', userIds);
  }

  const { data: visits } = await visitsQuery;
  if (!visits || visits.length === 0) return [];

  // trending score: sum of 1/sqrt(daysSince) — recent visits weigh more
  const now = Date.now();
  const statsMap: Record<string, { totalScore: number; count: number; trendingScore: number }> = {};
  for (const v of visits) {
    const rid = v.restaurant_id as string;
    const score = v.rank_score as number;
    const visitedAt = v.visited_at ? new Date(v.visited_at).getTime() : now;
    const daysSince = Math.max(1, (now - visitedAt) / 86400000);
    const recencyWeight = 1 / Math.sqrt(daysSince);
    if (!statsMap[rid]) statsMap[rid] = { totalScore: 0, count: 0, trendingScore: 0 };
    statsMap[rid].totalScore += score;
    statsMap[rid].count += 1;
    statsMap[rid].trendingScore += recencyWeight;
  }

  const restaurantIds = Object.keys(statsMap);

  let q = supabase.from('restaurants').select('*').in('id', restaurantIds);

  if (filters.city?.trim()) {
    q = q.ilike('city', `%${filters.city.trim()}%`);
  }
  if (filters.neighborhoods && filters.neighborhoods.length > 0) {
    const nCond = filters.neighborhoods.map((n) => `neighborhood.ilike.%${n}%`).join(',');
    q = q.or(nCond);
  }
  if (filters.search?.trim()) {
    q = q.or(`name.ilike.%${filters.search.trim()}%,neighborhood.ilike.%${filters.search.trim()}%`);
  }
  if (filters.prices && filters.prices.length > 0) {
    // UI sends '€','€€',etc. — convert to integers for the DB column
    const symbolToInt: Record<string, number> = { '€': 1, '€€': 2, '€€€': 3, '€€€€': 4 };
    const priceInts = filters.prices.map((p) => symbolToInt[p] ?? parseInt(p, 10)).filter((n) => !isNaN(n));
    if (priceInts.length > 0) q = q.in('price_level', priceInts);
  }

  const { data: restaurants } = await q;

  // Fetch friend avatars per restaurant (up to 3 per restaurant)
  const friendAvatarMap: Record<string, { id: string; avatar_url: string | null }[]> = {};
  if (mode === 'amigos' && userIds && userIds.length > 0) {
    const { data: friendVisits } = await supabase
      .from('visits')
      .select('restaurant_id, user:users!user_id(id, avatar_url)')
      .in('restaurant_id', restaurantIds)
      .in('user_id', userIds);
    type FriendVisitRow = {
      restaurant_id: string;
      user: { id: string; avatar_url: string | null } | null;
    };
    for (const fv of (friendVisits ?? []) as unknown as FriendVisitRow[]) {
      const rid = fv.restaurant_id;
      const user = fv.user;
      if (!user) continue;
      if (!friendAvatarMap[rid]) friendAvatarMap[rid] = [];
      if (friendAvatarMap[rid].length < 3 && !friendAvatarMap[rid].some((u) => u.id === user.id)) {
        friendAvatarMap[rid].push({ id: user.id, avatar_url: user.avatar_url });
      }
    }
  }

  // Build enriched list
  type EnrichedRestaurant = RestaurantRow & {
    score: number;
    visitCount: number;
    trendingScore: number;
    friendAvatars: { id: string; avatar_url: string | null }[];
    chain_name: string | null;
    _locationCount?: number;
  };
  const enriched: EnrichedRestaurant[] = (restaurants ?? []).map((r) => ({
    ...(r as RestaurantRow),
    score: Math.round((statsMap[r.id].totalScore / statsMap[r.id].count) * 10) / 10,
    visitCount: statsMap[r.id].count,
    trendingScore: statsMap[r.id].trendingScore,
    friendAvatars: friendAvatarMap[r.id] ?? [],
  }));

  // Deduplicate by chain_name: merge all locations of the same chain into one entry.
  // Use the location with the highest score as representative.
  // Aggregate visitCount, trendingScore, and friendAvatars across locations.
  const chainGroups = new Map<string, EnrichedRestaurant[]>();
  const independents: EnrichedRestaurant[] = [];
  for (const r of enriched) {
    if (r.chain_name) {
      if (!chainGroups.has(r.chain_name)) chainGroups.set(r.chain_name, []);
      chainGroups.get(r.chain_name)!.push(r);
    } else {
      independents.push(r);
    }
  }

  const deduped: EnrichedRestaurant[] = [...independents];
  for (const [, group] of chainGroups) {
    // Pick the location with the highest score as the representative
    group.sort((a, b) => b.score - a.score);
    const best: EnrichedRestaurant = { ...group[0] };
    // Aggregate stats across all locations
    best.visitCount = group.reduce((s: number, r) => s + r.visitCount, 0);
    best.trendingScore = group.reduce((s: number, r) => s + r.trendingScore, 0);
    // Aggregate friend avatars (deduplicated, max 3)
    const allAvatars: { id: string; avatar_url: string | null }[] = [];
    const seenAvatarIds = new Set<string>();
    for (const r of group) {
      for (const a of r.friendAvatars ?? []) {
        if (!seenAvatarIds.has(a.id) && allAvatars.length < 3) {
          seenAvatarIds.add(a.id);
          allAvatars.push(a);
        }
      }
    }
    best.friendAvatars = allAvatars;
    // Average score across all locations
    best.score = Math.round((group.reduce((s: number, r) => s + r.score * r.visitCount, 0) / best.visitCount) * 10) / 10;
    // Mark as multi-location chain
    best._locationCount = group.length;
    deduped.push(best);
  }

  return deduped
    .sort((a, b) =>
      filters.sortBy === 'trending'
        ? b.trendingScore - a.trendingScore
        : b.score - a.score
    ) as DiscoverRestaurant[];
}

// ─── Recent visits — chain-aware ─────────────────────────────────────────────
//
// restaurantIds: from getRelevantRestaurantIds().
// Includes restaurant name so the UI can show "McDonald's Gran Vía" for chains.

export type RecentVisit = {
  id: string;
  visited_at: string;
  rank_score: number | null;
  note: string | null;
  sentiment: 'loved' | 'fine' | 'disliked' | null;
  user_id: string;
  is_mutual: boolean;
  dishes: string[];
  user: { id: string; name: string; avatar_url: string | null };
  /** Present for all visits — use to show location name on chain restaurants. */
  restaurant: { id: string; name: string };
};

export async function getRecentVisits(
  restaurantIds: string[],
  currentUserId: string,
  limit = 10
): Promise<RecentVisit[]> {
  if (!restaurantIds.length) return [];

  // Bidirectional mutual detection
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', currentUserId)
      .in('type', ['mutual', 'following']),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', currentUserId)
      .in('type', ['mutual', 'following']),
  ]);

  const followingIds = (outgoing ?? []).map((r: { target_id: string }) => r.target_id);
  const incomingSet = new Set((incoming ?? []).map((r: { user_id: string }) => r.user_id));
  const mutualSet = new Set(followingIds.filter((id) => incomingSet.has(id)));

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      rank_score,
      note,
      sentiment,
      user_id,
      user:users!user_id (id, name, handle, avatar_url),
      restaurant:restaurants!restaurant_id (id, name),
      visit_dishes (id, name, highlighted, position)
    `)
    .in('restaurant_id', restaurantIds)
    .in('user_id', [...followingIds, currentUserId])
    .in('visibility', ['friends'])
    .order('visited_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  type RawRecentVisitRow = {
    user_id: string;
    visit_dishes?: { id: string; name: string | null; highlighted: boolean; position: number }[];
  };
  return ((data ?? []) as unknown as RawRecentVisitRow[]).map((v) => ({
    ...v,
    is_mutual: mutualSet.has(v.user_id),
    dishes: (v.visit_dishes ?? [])
      .sort((a, b) =>
        (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0) || a.position - b.position
      )
      .map((d) => ({ name: d.name as string, highlighted: (d.highlighted ?? false) as boolean }))
      .filter((d) => d.name),
  })) as unknown as RecentVisit[];
}

// ─── Friend stats for a restaurant ───────────────────────────────────────────

export type FriendStats = {
  friendScore: number | null;
  friendVisitCount: number;
  friendSavedCount: number;
};

export async function getFriendStats(
  restaurantIds: string[],
  currentUserId: string
): Promise<FriendStats> {
  if (!restaurantIds.length) return { friendScore: null, friendVisitCount: 0, friendSavedCount: 0 };

  // Only mutual friends (bidirectional follows)
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', currentUserId)
      .in('type', ['mutual', 'following']),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', currentUserId)
      .in('type', ['mutual', 'following']),
  ]);

  const outgoingIds = (outgoing ?? []).map((r: { target_id: string }) => r.target_id);
  const incomingSet = new Set((incoming ?? []).map((r: { user_id: string }) => r.user_id));
  const friendIds = outgoingIds.filter((id) => incomingSet.has(id));
  if (friendIds.length === 0) return { friendScore: null, friendVisitCount: 0, friendSavedCount: 0 };

  const [{ data: visits }, { data: savedItems }] = await Promise.all([
    supabase
      .from('visits')
      .select('rank_score')
      .in('restaurant_id', restaurantIds)
      .in('user_id', friendIds)
      .not('rank_score', 'is', null),
    supabase
      .from('list_items')
      .select('lists!inner(user_id)')
      .in('restaurant_id', restaurantIds),
  ]);

  const scores = (visits ?? [])
    .map((v) => v.rank_score)
    .filter((s): s is number => s !== null);
  const friendScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  type SavedItemRow = { lists: { user_id: string } | null };
  const friendSet = new Set(friendIds);
  const friendSavedCount = ((savedItems ?? []) as unknown as SavedItemRow[]).filter((item) =>
    friendSet.has(item.lists?.user_id ?? '')
  ).length;

  return { friendScore, friendVisitCount: scores.length, friendSavedCount };
}
