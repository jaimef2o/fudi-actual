// @ts-nocheck
import { supabase } from '../supabase';
import type { RestaurantRow } from '../database.types';
import { resolveChainId, extractBrandPrefixPublic } from '../chains';
import { extractCuisineType, extractPriceLabel, checkIsChainViaGoogle } from './places';

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
    // Backfill brand_name if missing (Google-verified chain detection)
    if (!(existing as any).brand_name) {
      const detected = extractBrandPrefixPublic(existing.name);
      if (detected?.hasLocationSuffix) {
        const isChain = await checkIsChainViaGoogle(
          detected.prefix,
          existing.lat ?? null,
          existing.lng ?? null
        ).catch(() => false);
        if (isChain) {
          const brand_name = detected.prefix.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          await supabase.from('restaurants').update({ brand_name } as any).eq('id', existing.id);
          return { ...existing, brand_name } as RestaurantRow;
        }
      }
    }
    // Backfill chain_id if missing
    if (!existing.chain_id) {
      const chain_id = await resolveChainId(existing.name).catch(() => null);
      if (chain_id) {
        await supabase.from('restaurants').update({ chain_id }).eq('id', existing.id);
        return { ...existing, chain_id } as RestaurantRow;
      }
    }
    return existing as RestaurantRow;
  }

  // 2. Detect brand_name via Google (chain verification), resolve chain_id, derive cuisine
  const detected = extractBrandPrefixPublic(restaurant.name);
  let brand_name: string | null = null;
  if (detected?.hasLocationSuffix) {
    const isChain = await checkIsChainViaGoogle(
      detected.prefix,
      restaurant.lat ?? null,
      restaurant.lng ?? null
    ).catch(() => false);
    if (isChain) {
      brand_name = detected.prefix.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  const chain_id = await resolveChainId(restaurant.name).catch(() => null);
  const cuisine = extractCuisineType(restaurant.google_types ?? []);
  const price_display = extractPriceLabel(restaurant.price_level ?? null);

  // 3. Insert — save cuisine as text label, price as € symbol string
  const { google_types, price_level, ...rest } = restaurant;
  const { data, error } = await supabase
    .from('restaurants')
    .insert({ ...rest, brand_name, chain_id, cuisine, price_level: price_display } as any)
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
  const { data: visits, error: visitsError } = await supabase
    .from('visits')
    .select('rank_score')
    .eq('restaurant_id', restaurantId);

  if (visitsError) throw visitsError;

  const scores = (visits ?? []).map((v) => v.rank_score).filter((s): s is number => s !== null);
  const avg_score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const { count: saved_count } = await supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  return {
    visit_count: visits?.length ?? 0,
    saved_count: saved_count ?? 0,
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
    const rid = (v as any).restaurant_id;
    const score = (v as any).rank_score as number;
    const visitedAt = (v as any).visited_at ? new Date((v as any).visited_at).getTime() : now;
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
    q = q.in('price_level', filters.prices);
  }

  const { data: restaurants } = await q;

  return (restaurants ?? [])
    .map((r) => ({
      ...(r as any),
      score: Math.round((statsMap[r.id].totalScore / statsMap[r.id].count) * 10) / 10,
      visitCount: statsMap[r.id].count,
      trendingScore: statsMap[r.id].trendingScore,
    }))
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

  const { data: rels } = await supabase
    .from('relationships')
    .select('target_id, type')
    .eq('user_id', currentUserId)
    .in('type', ['mutual', 'following']);

  const mutualSet = new Set(
    (rels ?? []).filter((r: any) => r.type === 'mutual').map((r: any) => r.target_id)
  );
  const followingIds = (rels ?? []).map((r: any) => r.target_id);

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      rank_score,
      note,
      sentiment,
      user_id,
      user:users!user_id (id, name, avatar_url),
      restaurant:restaurants!restaurant_id (id, name),
      visit_dishes (id, name, highlighted, position)
    `)
    .in('restaurant_id', restaurantIds)
    .in('user_id', [...followingIds, currentUserId])
    .order('visited_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as any[]).map((v) => ({
    ...v,
    is_mutual: mutualSet.has(v.user_id),
    dishes: ((v.visit_dishes ?? []) as any[])
      .sort((a: any, b: any) =>
        (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0) || a.position - b.position
      )
      .map((d: any) => ({ name: d.name as string, highlighted: (d.highlighted ?? false) as boolean }))
      .filter((d: any) => d.name),
  })) as RecentVisit[];
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

  const { data: rels } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', currentUserId)
    .in('type', ['mutual', 'following']);

  const friendIds = (rels ?? []).map((r: any) => r.target_id);
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

  const scores = (visits ?? []).map((v: any) => v.rank_score as number);
  const friendScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const friendSet = new Set(friendIds);
  const friendSavedCount = (savedItems ?? []).filter((item: any) =>
    friendSet.has(item.lists?.user_id)
  ).length;

  return { friendScore, friendVisitCount: scores.length, friendSavedCount };
}
