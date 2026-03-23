// @ts-nocheck
import { supabase } from '../supabase';
import type { RestaurantRow } from '../database.types';

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

// Upsert restaurant from Google Places data
export async function upsertRestaurant(restaurant: {
  google_place_id: string;
  name: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  lat?: number;
  lng?: number;
  cuisine?: string;
  price_level?: number;
  cover_image_url?: string;
}): Promise<RestaurantRow> {
  const { data, error } = await supabase
    .from('restaurants')
    .upsert(restaurant, { onConflict: 'google_place_id' })
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

// ─── Dishes ordered by friends ───────────────────────────────────────────────

export type FriendDish = {
  dish_name: string;
  times_ordered: number;
  photo_url: string | null;
  friends: { id: string; name: string; avatar_url: string | null }[];
};

export async function getFriendDishes(
  restaurantId: string,
  currentUserId: string
): Promise<FriendDish[]> {
  // Get mutual friend IDs
  const { data: rels, error: relsError } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', currentUserId)
    .eq('type', 'mutual');

  if (relsError) throw relsError;

  const friendIds = (rels ?? []).map((r) => r.target_id);
  if (friendIds.length === 0) return [];

  // Get all visits to this restaurant by friends, including dishes and photos
  const { data, error } = await supabase
    .from('visits')
    .select(`
      user_id,
      user:users!user_id (id, name, avatar_url),
      visit_dishes (dish_name, rank_position, id,
        visit_photos (photo_url)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .in('user_id', friendIds);

  if (error) throw error;

  // Aggregate by dish name
  const dishMap = new Map<string, FriendDish>();

  for (const visit of data ?? []) {
    const user = (visit as any).user;
    for (const dish of (visit as any).visit_dishes ?? []) {
      const existing = dishMap.get(dish.dish_name);
      const photo = dish.visit_photos?.[0]?.photo_url ?? null;

      if (existing) {
        existing.times_ordered += 1;
        if (!existing.friends.find((f) => f.id === user.id)) {
          existing.friends.push(user);
        }
        if (!existing.photo_url && photo) existing.photo_url = photo;
      } else {
        dishMap.set(dish.dish_name, {
          dish_name: dish.dish_name,
          times_ordered: 1,
          photo_url: photo,
          friends: [user],
        });
      }
    }
  }

  return Array.from(dishMap.values()).sort((a, b) => b.times_ordered - a.times_ordered);
}

// ─── Discover feed ──────────────────────────────────────────────────────────

export type DiscoverRestaurant = RestaurantRow & {
  score: number;    // avg rank_score
  visitCount: number;
};

export async function getDiscoverRestaurants(
  currentUserId: string,
  mode: 'amigos' | 'global',
  filters: {
    city?: string;
    neighborhoods?: string[];
    cuisines?: string[];
    prices?: string[]; // '$' | '$$' | '$$$'
    search?: string;
  } = {}
): Promise<DiscoverRestaurant[]> {
  // Step 1: Resolve which user IDs to include
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

  // Step 2: Fetch visits with rank_scores
  let visitsQuery = supabase
    .from('visits')
    .select('restaurant_id, rank_score')
    .not('rank_score', 'is', null);

  if (userIds !== null) {
    visitsQuery = visitsQuery.in('user_id', userIds);
  }

  const { data: visits } = await visitsQuery;
  if (!visits || visits.length === 0) return [];

  // Step 3: Aggregate scores by restaurant
  const statsMap: Record<string, { totalScore: number; count: number }> = {};
  for (const v of visits) {
    const rid = (v as any).restaurant_id;
    const score = (v as any).rank_score as number;
    if (!statsMap[rid]) statsMap[rid] = { totalScore: 0, count: 0 };
    statsMap[rid].totalScore += score;
    statsMap[rid].count += 1;
  }

  const restaurantIds = Object.keys(statsMap);

  // Step 4: Fetch restaurant details with optional filters
  let q = supabase.from('restaurants').select('*').in('id', restaurantIds);

  if (filters.city?.trim()) {
    q = q.ilike('city', `%${filters.city.trim()}%`);
  }
  if (filters.neighborhoods && filters.neighborhoods.length > 0) {
    // ilike any neighborhood
    const nCond = filters.neighborhoods.map((n) => `neighborhood.ilike.%${n}%`).join(',');
    q = q.or(nCond);
  }
  if (filters.search?.trim()) {
    q = q.or(`name.ilike.%${filters.search.trim()}%,neighborhood.ilike.%${filters.search.trim()}%`);
  }
  if (filters.prices && filters.prices.length > 0) {
    const levels = filters.prices.map((p) => p.length); // '$'→1, '$$'→2, '$$$'→3
    q = q.in('price_level', levels);
  }

  const { data: restaurants } = await q;

  return (restaurants ?? [])
    .map((r) => ({
      ...(r as any),
      score: Math.round((statsMap[r.id].totalScore / statsMap[r.id].count) * 10) / 10,
      visitCount: statsMap[r.id].count,
    }))
    .sort((a, b) => b.score - a.score) as DiscoverRestaurant[];
}

// ─── Recent visits to a restaurant ──────────────────────────────────────────

export type RecentVisit = {
  id: string;
  visited_at: string;
  rank_score: number | null;
  note: string | null;
  user: { id: string; name: string; avatar_url: string | null };
};

export async function getRecentVisits(
  restaurantId: string,
  currentUserId: string,
  limit = 10
): Promise<RecentVisit[]> {
  const { data: rels } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', currentUserId)
    .eq('type', 'mutual');

  const friendIds = (rels ?? []).map((r) => r.target_id);

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      rank_score,
      note,
      user:users!user_id (id, name, avatar_url)
    `)
    .eq('restaurant_id', restaurantId)
    .in('user_id', [...friendIds, currentUserId])
    .order('visited_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as RecentVisit[];
}
