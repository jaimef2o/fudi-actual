import { supabase } from '../supabase';
import type { VisitRow, VisitDishRow, VisitPhotoRow } from '../database.types';
import { refreshAffinityForUser } from './affinity';
import { notifyNewVisit, notifyTaggedInVisit } from './notificationTriggers';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Simple dish input: free text, binary highlighted flag, insertion order */
export type DishInput = {
  name: string;
  highlighted: boolean;
  position: number;
};

export type CreateVisitInput = {
  user_id: string;
  restaurant_id: string;
  visited_at?: string;
  sentiment: 'loved' | 'fine' | 'disliked';
  rank_position?: number;
  rank_score?: number;
  note?: string;
  spend_per_person?: '0-20' | '20-35' | '35-60' | '60+' | null;
  visibility?: 'friends' | 'groups' | 'private';
  dishes?: DishInput[];
  photos?: { photo_url: string; type: 'restaurant' | 'dish' }[];
  restaurant_photo_urls?: string[]; // legacy
  tagged_user_ids?: string[];
  dish_photo_urls?: { dish_index: number; photo_url: string }[];
};

export type VisitDetail = VisitRow & {
  restaurant: { id: string; name: string; chain_name?: string | null; brand_name?: string | null; neighborhood: string | null; city: string | null; cover_image_url: string | null; cuisine: string | null; price_level: string | null };
  user: { id: string; name: string; avatar_url: string | null };
  dishes: (VisitDishRow & { photos: VisitPhotoRow[] })[];
  photos: VisitPhotoRow[];
  tags: { tagged_user: { id: string; name: string; avatar_url: string | null } }[];
};

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getVisit(visitId: string): Promise<VisitDetail | null> {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      restaurant:restaurants!restaurant_id (id, name, chain_name, brand_name, neighborhood, city, cover_image_url, cuisine, price_level),
      user:users!user_id (id, name, avatar_url),
      photos:visit_photos!visit_id (*),
      tags:visit_tags (
        tagged_user:users!tagged_user_id (id, name, avatar_url)
      )
    `)
    .eq('id', visitId)
    .single();

  if (error) throw error;
  return data as unknown as VisitDetail;
}

// User's personal ranking — one entry per restaurant (deduplicated, averaged score)
export async function getUserRanking(userId: string): Promise<VisitDetail[]> {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      restaurant:restaurants!restaurant_id (id, name, chain_name, brand_name, neighborhood, city, cuisine, price_level, cover_image_url),
      user:users!user_id (id, name, avatar_url),
      photos:visit_photos!visit_id (*),
      tags:visit_tags (tagged_user:users!tagged_user_id (id, name, avatar_url))
    `)
    .eq('user_id', userId)
    .not('rank_position', 'is', null)
    .order('rank_score', { ascending: false });

  if (error) throw error;
  const visits = (data ?? []) as unknown as VisitDetail[];

  // Deduplicate: one entry per restaurant (or per chain for franchise locations).
  // Rule: when multiple visits to the same restaurant/chain exist, the ranking score
  // comes from the MOST RECENT visit (by visited_at). Each post is preserved
  // independently — only the ranking representation uses the latest score.
  // For chains: all locations of the same chain collapse into one entry.
  const seen = new Map<string, { visit: VisitDetail; mostRecentScore: number }>();
  for (const v of visits) {
    const r = v.restaurant;
    // Group by chain_name if it exists, otherwise by restaurant id
    const groupKey = r.chain_name || r.id;
    const score = v.rank_score ?? 0;
    const visitedAt = v.visited_at ?? '';
    if (!seen.has(groupKey)) {
      seen.set(groupKey, { visit: v, mostRecentScore: score });
    } else {
      const entry = seen.get(groupKey)!;
      // Keep the most recent visit (by visited_at)
      const existingAt = entry.visit.visited_at ?? '';
      if (visitedAt > existingAt) {
        entry.visit = v;
        entry.mostRecentScore = score;
      }
    }
  }

  return Array.from(seen.values())
    .map(({ visit, mostRecentScore }) => ({
      ...visit,
      rank_score: mostRecentScore,
    }))
    .sort((a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0))
    .map((v, i) => ({ ...v, rank_position: i + 1 }));
}

/**
 * Returns the rank_score for a specific restaurant in the user's ranking.
 * When the restaurant has been visited multiple times, returns the score
 * from the MOST RECENT visit — consistent with getUserRankedVisits behaviour.
 * Returns null if the restaurant has never been ranked.
 */
export async function getRestaurantExistingScore(
  userId: string,
  restaurantId: string
): Promise<{ score: number; visitCount: number } | null> {
  // Parallel: fetch direct visits + restaurant chain_name at the same time
  const [visitsResult, restaurantResult] = await Promise.all([
    supabase
      .from('visits')
      .select('rank_score, visited_at')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .not('rank_score', 'is', null)
      .order('visited_at', { ascending: false }),
    supabase
      .from('restaurants')
      .select('chain_name')
      .eq('id', restaurantId)
      .single(),
  ]);

  const data = visitsResult.data;
  if (data && data.length > 0) {
    const mostRecent = data[0];
    const score = Math.round((mostRecent.rank_score as number) * 10) / 10;
    return { score, visitCount: data.length };
  }

  // No direct match — check chain siblings
  try {
    const restaurant = restaurantResult.data;
    if (restaurant?.chain_name) {
      const { data: chainVisits } = await supabase
        .from('visits')
        .select('rank_score, visited_at, restaurant:restaurants!restaurant_id(chain_name)')
        .eq('user_id', userId)
        .not('rank_score', 'is', null)
        .order('visited_at', { ascending: false });

      type ChainVisitRow = { rank_score: number | null; visited_at: string; restaurant: { chain_name: string | null } | null };
      const matches = ((chainVisits ?? []) as unknown as ChainVisitRow[]).filter(
        (v) => v.restaurant?.chain_name === restaurant.chain_name
      );
      if (matches.length > 0) {
        const mostRecent = matches[0];
        const score = Math.round((mostRecent.rank_score as number) * 10) / 10;
        return { score, visitCount: matches.length };
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[savry] chain score lookup failed:', err);
  }

  return null;
}

// Update rank position after comparison
export async function updateVisitRankPosition(
  visitId: string,
  rankPosition: number,
  rankScore: number
): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .update({ rank_position: rankPosition, rank_score: rankScore })
    .eq('id', visitId);
  if (error) throw error;
}

// ─── Score brackets ──────────────────────────────────────────────────────────
// Canonical score ranges per sentiment level (no overlap, full 1–10 coverage):
//   disliked → 1.0–4.9  |  fine → 5.0–7.4  |  loved → 7.5–10.0
export const SCORE_BRACKETS = {
  loved:    { min: 7.5, max: 10.0 },
  fine:     { min: 5.0, max: 7.4  },
  disliked: { min: 1.0, max: 4.9  },
} as const;

/**
 * After inserting a new visit, recompute rank_score and rank_position for
 * every scored visit of the user so the whole ranking stays consistent.
 *
 * Strategy:
 *  1. Fetch all scored visits ordered by current rank_score DESC.
 *  2. Group by sentiment (preserving relative order within each group).
 *  3. Distribute scores evenly across each bracket using the canonical ranges.
 *  4. Assign global rank_positions 1,2,3,… sorted by the new score DESC.
 *  5. Batch-update the DB.
 */
export async function recomputeRankPositions(userId: string): Promise<void> {
  const { data } = await supabase
    .from('visits')
    .select('id, rank_score, sentiment, restaurant_id')
    .eq('user_id', userId)
    .not('rank_score', 'is', null)
    .order('rank_score', { ascending: false });

  if (!data || data.length === 0) return;

  // ── Step 1: Deduplicate by restaurant, average scores ──────────────────────
  // Each restaurant gets one "slot" in the ranking. Its canonical score is the
  // average of all individual visit scores. Sentiment = first (highest) visit's.
  type RestaurantSlot = {
    ids: string[];           // all visit IDs for this restaurant
    avgScore: number;
    sentiment: string;
    totalScore: number;
    count: number;
  };
  const slots = new Map<string, RestaurantSlot>();
  for (const v of data) {
    const rid = v.restaurant_id as string;
    if (!slots.has(rid)) {
      slots.set(rid, { ids: [], avgScore: 0, sentiment: v.sentiment ?? 'fine', totalScore: 0, count: 0 });
    }
    const s = slots.get(rid)!;
    s.ids.push(v.id);
    s.totalScore += v.rank_score!;
    s.count += 1;
  }
  for (const s of slots.values()) {
    s.avgScore = s.totalScore / s.count;
  }

  // ── Step 2: Group restaurants by sentiment bracket ──────────────────────────
  const restaurants = Array.from(slots.values()).sort((a, b) => b.avgScore - a.avgScore);
  const groups: Record<string, RestaurantSlot[]> = { loved: [], fine: [], disliked: [] };
  for (const r of restaurants) {
    const key = r.sentiment ?? 'fine';
    if (groups[key]) groups[key].push(r);
  }

  // ── Step 3: Redistribute scores evenly within each bracket ─────────────────
  function recalcBracket(group: RestaurantSlot[], min: number, max: number) {
    const n = group.length;
    return group.map((r, i) => ({
      ...r,
      newScore: n === 1
        ? Math.round(((min + max) / 2) * 10) / 10
        : Math.round((max - (max - min) * i / (n - 1)) * 10) / 10,
    }));
  }

  const updated = [
    ...recalcBracket(groups.loved,    SCORE_BRACKETS.loved.min,    SCORE_BRACKETS.loved.max),
    ...recalcBracket(groups.fine,     SCORE_BRACKETS.fine.min,     SCORE_BRACKETS.fine.max),
    ...recalcBracket(groups.disliked, SCORE_BRACKETS.disliked.min, SCORE_BRACKETS.disliked.max),
  ].sort((a, b) => b.newScore - a.newScore);

  // ── Step 4: Write new score + position to ALL visits of each restaurant ─────
  // All visits for the same restaurant share the same score and position, so
  // the ranking always shows each restaurant exactly once.
  const writes: Promise<unknown>[] = [];
  updated.forEach((r, i) => {
    const position = i + 1;
    for (const visitId of r.ids) {
      writes.push(
        Promise.resolve(
          supabase
            .from('visits')
            .update({ rank_score: r.newScore, rank_position: position })
            .eq('id', visitId)
        )
      );
    }
  });
  const results = await Promise.allSettled(writes);
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`[fudi] ${failures.length} ranking updates failed`);
  }
}

/**
 * Swap rank_position + rank_score between two visits (used by refine-ranking).
 * Call recomputeRankPositions afterwards to normalise the full ranking.
 */
export async function swapVisitRanks(
  visitA: { id: string; rank_position: number | null; rank_score: number | null },
  visitB: { id: string; rank_position: number | null; rank_score: number | null }
): Promise<void> {
  await Promise.all([
    supabase
      .from('visits')
      .update({ rank_position: visitB.rank_position, rank_score: visitB.rank_score })
      .eq('id', visitA.id),
    supabase
      .from('visits')
      .update({ rank_position: visitA.rank_position, rank_score: visitA.rank_score })
      .eq('id', visitB.id),
  ]);
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Permanently deletes a visit and all its related data (dishes, photos, tags, reactions).
 * Cascades are handled at the DB level (ON DELETE CASCADE on FK constraints).
 * Also calls recomputeRankPositions so the ranking stays consistent.
 */
export async function deleteVisit(visitId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .delete()
    .eq('id', visitId)
    .eq('user_id', userId);  // safety: only own visits

  if (error) throw error;
  await recomputeRankPositions(userId);
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createVisit(input: CreateVisitInput): Promise<VisitRow> {
  const { dishes, photos, restaurant_photo_urls, tagged_user_ids, dish_photo_urls, ...visitData } = input;
  // Merge both photo formats
  const allRestaurantPhotoUrls = [
    ...(restaurant_photo_urls ?? []),
    ...(photos?.map((p) => p.photo_url) ?? []),
  ];

  // 0. Revisit detection — if user has a prior visit to this restaurant (or same chain),
  // blend the new score with the existing one (60% new, 40% old) for ranking continuity.
  if (visitData.rank_score != null) {
    try {
      // Check for same restaurant first
      const { data: priorVisits } = await supabase
        .from('visits')
        .select('rank_score, restaurant_id')
        .eq('user_id', visitData.user_id)
        .eq('restaurant_id', visitData.restaurant_id)
        .not('rank_score', 'is', null)
        .order('visited_at', { ascending: false })
        .limit(1);

      let priorScore: number | null = null;

      if (priorVisits?.length) {
        priorScore = priorVisits[0].rank_score;
      } else {
        // Check for same chain (different location)
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('chain_name')
          .eq('id', visitData.restaurant_id)
          .single();

        if (restaurant?.chain_name) {
          const { data: chainVisits } = await supabase
            .from('visits')
            .select('rank_score, restaurant:restaurants!restaurant_id(chain_name)')
            .eq('user_id', visitData.user_id)
            .not('rank_score', 'is', null)
            .order('visited_at', { ascending: false });

          type ChainVisitMatch = { rank_score: number | null; restaurant: { chain_name: string | null } | null };
          const chainMatch = ((chainVisits ?? []) as unknown as ChainVisitMatch[]).find(
            (v) => v.restaurant?.chain_name === restaurant.chain_name
          );
          if (chainMatch) priorScore = chainMatch.rank_score;
        }
      }

      // Weighted average: 60% new score, 40% prior score
      if (priorScore != null) {
        visitData.rank_score = Math.round((visitData.rank_score * 0.6 + priorScore * 0.4) * 10) / 10;
      }
    } catch (err) {
      if (__DEV__) console.warn('[savry] revisit detection failed:', err);
    }
  }

  // 1. Insert the visit
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      ...visitData,
      visited_at: visitData.visited_at ?? new Date().toISOString(),
      visibility: visitData.visibility ?? 'friends',
    })
    .select()
    .single();

  if (visitError) throw visitError;

  // 2. Insert dishes (free-text, binary highlighted flag, insertion order)
  const validDishes = (dishes ?? []).filter((d) => d.name?.trim());
  let insertedDishes: VisitDishRow[] = [];
  if (validDishes.length > 0) {
    const { data: dishData, error: dishesError } = await supabase
      .from('visit_dishes')
      .insert(
        validDishes.map((d, i) => ({
          visit_id: visit.id,
          name: d.name.trim(),
          highlighted: d.highlighted ?? false,
          position: d.position ?? i,
        }))
      )
      .select();
    if (dishesError) throw dishesError;
    insertedDishes = dishData ?? [];
  }

  // 2b. Insert per-dish photos (linked to dish IDs)
  if (dish_photo_urls && dish_photo_urls.length > 0 && insertedDishes.length > 0) {
    const dishPhotoRows = dish_photo_urls
      .filter((dp) => insertedDishes[dp.dish_index])
      .map((dp) => ({
        visit_id: visit.id,
        dish_id: insertedDishes[dp.dish_index].id,
        photo_url: dp.photo_url,
        type: 'dish' as const,
      }));
    if (dishPhotoRows.length > 0) {
      const { error: dpError } = await supabase.from('visit_photos').insert(dishPhotoRows);
      if (dpError) throw dpError;
    }
  }

  // 3. Insert restaurant photos
  if (allRestaurantPhotoUrls.length > 0) {
    const { error: photosError } = await supabase.from('visit_photos').insert(
      allRestaurantPhotoUrls.map((url) => ({
        visit_id: visit.id,
        dish_id: null,
        photo_url: url,
        type: 'restaurant' as const,
      }))
    );
    if (photosError) throw photosError;
  }

  // 4. Tag friends
  if (tagged_user_ids && tagged_user_ids.length > 0) {
    const { error: tagsError } = await supabase.from('visit_tags').insert(
      tagged_user_ids.map((uid) => ({ visit_id: visit.id, tagged_user_id: uid }))
    );
    if (tagsError) throw tagsError;
  }

  // Fire-and-forget: refresh affinity scores in background
  refreshAffinityForUser(input.user_id).catch((err) => {
    if (__DEV__) console.warn('[savry] refreshAffinityForUser failed:', err);
  });

  // Fire-and-forget: push notifications
  // Get restaurant name for notification text
  Promise.resolve(supabase.from('restaurants').select('name').eq('id', input.restaurant_id).single())
    .then(({ data: rest }) => {
      if (!rest) return;
      Promise.resolve(supabase.from('users').select('name').eq('id', input.user_id).single())
        .then(({ data: user }) => {
          if (!user) return;
          // Notify mutual friends about new visit
          notifyNewVisit(input.user_id, user.name, rest.name, input.rank_score ?? null, visit.id).catch((err: unknown) => {
            if (__DEV__) console.warn('[savry] notifyNewVisit failed:', err);
          });
          // Notify tagged users
          if (tagged_user_ids?.length) {
            notifyTaggedInVisit(user.name, rest.name, tagged_user_ids, visit.id).catch((err: unknown) => {
              if (__DEV__) console.warn('[savry] notifyTaggedInVisit failed:', err);
            });
          }
        });
    })
    .catch((err: unknown) => {
      if (__DEV__) console.warn('[savry] notification setup failed:', err);
    });

  return visit;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export type UpdateVisitInput = {
  note?: string | null;
  sentiment?: 'loved' | 'fine' | 'disliked';
  spend_per_person?: '0-20' | '20-35' | '35-60' | '60+' | null;
  visibility?: 'friends' | 'groups' | 'private';
};

export async function updateVisit(visitId: string, updates: UpdateVisitInput): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .update(updates)
    .eq('id', visitId);
  if (error) throw error;
}

export type UpdateVisitFullInput = UpdateVisitInput & {
  dishes?: { name: string; highlighted: boolean; position: number }[];
  new_restaurant_photo_urls?: string[];
  removed_photo_ids?: string[];
  dish_photo_urls?: { dish_index: number; photo_url: string }[];
};

export async function updateVisitFull(
  visitId: string,
  userId: string,
  input: UpdateVisitFullInput,
): Promise<void> {
  const { dishes, new_restaurant_photo_urls, removed_photo_ids, dish_photo_urls, ...visitUpdates } = input;

  // 1. Update visit fields
  const updateFields = Object.fromEntries(
    Object.entries(visitUpdates).filter(([, v]) => v !== undefined)
  );
  if (Object.keys(updateFields).length > 0) {
    const { error } = await supabase
      .from('visits')
      .update(updateFields)
      .eq('id', visitId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // 2. Replace dishes
  // ⚠️ Non-atomic: if insert fails after delete, dishes are lost.
  // TODO: Move to Supabase RPC with transaction for atomicity.
  if (dishes !== undefined) {
    const { error: delDishErr } = await supabase.from('visit_dishes').delete().eq('visit_id', visitId);
    if (delDishErr) throw delDishErr;
    let insertedDishes: VisitDishRow[] = [];
    if (dishes.length > 0) {
      const { data: dishData, error: dErr } = await supabase
        .from('visit_dishes')
        .insert(
          dishes.map((d, i) => ({
            visit_id: visitId,
            name: d.name.trim(),
            highlighted: d.highlighted,
            position: d.position ?? i,
          }))
        )
        .select();
      if (dErr) throw dErr;
      insertedDishes = dishData ?? [];
    }
    if (dish_photo_urls && dish_photo_urls.length > 0 && insertedDishes.length > 0) {
      const rows = dish_photo_urls
        .filter((dp) => insertedDishes[dp.dish_index])
        .map((dp) => ({
          visit_id: visitId,
          dish_id: insertedDishes[dp.dish_index].id,
          photo_url: dp.photo_url,
          type: 'dish' as const,
        }));
      if (rows.length > 0) {
        const { error: dishPhotoErr } = await supabase.from('visit_photos').insert(rows);
        if (dishPhotoErr) throw dishPhotoErr;
      }
    }
  }

  // 3. Remove specific photos
  if (removed_photo_ids && removed_photo_ids.length > 0) {
    const { error: rmPhotoErr } = await supabase.from('visit_photos').delete().in('id', removed_photo_ids);
    if (rmPhotoErr) throw rmPhotoErr;
  }

  // 4. Add new restaurant photos
  if (new_restaurant_photo_urls && new_restaurant_photo_urls.length > 0) {
    const { error: newPhotoErr } = await supabase.from('visit_photos').insert(
      new_restaurant_photo_urls.map((url) => ({
        visit_id: visitId,
        dish_id: null,
        photo_url: url,
        type: 'restaurant' as const,
      }))
    );
    if (newPhotoErr) throw newPhotoErr;
  }
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(
  visitId: string,
  userId: string,
  emoji: 'hungry' | 'fire'
) {
  // Check if already reacted
  const { data: existing, error: selectError } = await supabase
    .from('reactions')
    .select('id')
    .eq('visit_id', visitId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
    if (error) throw error;
    return false; // removed
  } else {
    const { error } = await supabase
      .from('reactions')
      .insert({ visit_id: visitId, user_id: userId, emoji });
    if (error) throw error;
    return true; // added
  }
}

// ─── Lists / Bookmarks ────────────────────────────────────────────────────────

/**
 * Returns the ID of the user's default "want" list, creating it if it doesn't exist.
 * This ensures list_items always has a valid FK reference.
 */
async function getOrCreateWantList(userId: string): Promise<string> {
  // Try to find an existing 'want' list for this user
  const { data: existing, error: fetchError } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'want')
    .limit(1)
    .maybeSingle();

  if (fetchError) console.error('[fudi:bookmark] SELECT lists error:', fetchError);
  if (existing?.id) return existing.id;

  // Create the default want list — handle race condition where another
  // concurrent request already created it between our SELECT and INSERT
  const { data: created, error } = await supabase
    .from('lists')
    .insert({ user_id: userId, name: 'Guardados', type: 'want' })
    .select('id')
    .single();

  if (error) {
    console.error('[fudi:bookmark] INSERT lists error:', error.code, error.message);
    // If duplicate (unique constraint), fetch the existing one
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'want')
        .single();
      if (retry?.id) return retry.id;
    }
    throw new Error(`[lists] ${error.code}: ${error.message}`);
  }
  return created.id;
}

export async function bookmarkRestaurant(userId: string, restaurantId: string) {
  const listId = await getOrCreateWantList(userId);
  // Delete first to avoid duplicate key error, then insert fresh
  const { error: delError } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId);
  if (delError) console.warn('[fudi:bookmark] DELETE list_items warning:', delError);

  const { error } = await supabase
    .from('list_items')
    .insert({ list_id: listId, restaurant_id: restaurantId });
  if (error) {
    console.error('[fudi:bookmark] INSERT list_items error:', error.code, error.message);
    throw new Error(`[list_items] ${error.code}: ${error.message}`);
  }
}

export async function getSavedRestaurants(userId: string) {
  const listId = await getOrCreateWantList(userId);

  const { data, error } = await supabase
    .from('list_items')
    .select(`
      added_at,
      restaurant:restaurants!restaurant_id (
        id, name, chain_name, brand_name, neighborhood, city, cuisine, price_level, cover_image_url
      )
    `)
    .eq('list_id', listId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function unbookmarkRestaurant(userId: string, restaurantId: string) {
  const listId = await getOrCreateWantList(userId);
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}
