// @ts-nocheck
import { supabase } from '../supabase';
import type { VisitRow, VisitDishRow, VisitPhotoRow } from '../database.types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DishInput = {
  dish_name: string;
  rank_position: number;
  note?: string;
  photo_url?: string; // single photo per dish for now
};

export type CreateVisitInput = {
  user_id: string;
  restaurant_id: string;
  visited_at?: string;
  sentiment: 'loved' | 'fine' | 'disliked';
  rank_position?: number;
  rank_score?: number;
  note?: string;
  visibility?: 'friends' | 'groups' | 'private';
  dishes?: DishInput[];
  photos?: { photo_url: string; type: 'restaurant' | 'dish' }[];
  restaurant_photo_urls?: string[]; // legacy
  tagged_user_ids?: string[];
};

export type VisitDetail = VisitRow & {
  restaurant: { id: string; name: string; neighborhood: string | null; cover_image_url: string | null };
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
      restaurant:restaurants!restaurant_id (id, name, neighborhood, cover_image_url),
      user:users!user_id (id, name, avatar_url),
      dishes:visit_dishes (
        *,
        photos:visit_photos (*)
      ),
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

// User's personal ranking (ordered by rank_position)
export async function getUserRanking(userId: string): Promise<VisitDetail[]> {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      restaurant:restaurants!restaurant_id (id, name, neighborhood, city, cuisine, price_level, cover_image_url),
      user:users!user_id (id, name, avatar_url),
      dishes:visit_dishes (*, photos:visit_photos (*)),
      photos:visit_photos!visit_id (*),
      tags:visit_tags (tagged_user:users!tagged_user_id (id, name, avatar_url))
    `)
    .eq('user_id', userId)
    .not('rank_position', 'is', null)
    .order('rank_position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as VisitDetail[];
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

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createVisit(input: CreateVisitInput): Promise<VisitRow> {
  const { dishes, photos, restaurant_photo_urls, tagged_user_ids, ...visitData } = input;
  // Merge both photo formats
  const allRestaurantPhotoUrls = [
    ...(restaurant_photo_urls ?? []),
    ...(photos?.map((p) => p.photo_url) ?? []),
  ];

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

  // 2. Insert dishes
  if (dishes && dishes.length > 0) {
    const { data: insertedDishes, error: dishesError } = await supabase
      .from('visit_dishes')
      .insert(
        dishes.map((d) => ({
          visit_id: visit.id,
          dish_name: d.dish_name,
          rank_position: d.rank_position,
          note: d.note ?? null,
        }))
      )
      .select();

    if (dishesError) throw dishesError;

    // 3. Insert dish photos
    const dishPhotoRows = (insertedDishes ?? [])
      .flatMap((insertedDish, i) => {
        const dish = dishes[i];
        if (!dish?.photo_url) return [];
        return [{ visit_id: visit.id, dish_id: insertedDish.id, photo_url: dish.photo_url, type: 'dish' as const }];
      });

    if (dishPhotoRows.length > 0) {
      const { error: dishPhotosError } = await supabase.from('visit_photos').insert(dishPhotoRows);
      if (dishPhotosError) throw dishPhotosError;
    }
  }

  // 4. Insert restaurant photos
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

  // 5. Tag friends
  if (tagged_user_ids && tagged_user_ids.length > 0) {
    const { error: tagsError } = await supabase.from('visit_tags').insert(
      tagged_user_ids.map((uid) => ({ visit_id: visit.id, tagged_user_id: uid }))
    );
    if (tagsError) throw tagsError;
  }

  return visit;
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(
  visitId: string,
  userId: string,
  emoji: 'hungry' | 'fire'
) {
  // Check if already reacted
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('visit_id', visitId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

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

export async function getSavedRestaurants(userId: string) {
  const { data, error } = await supabase
    .from('list_items')
    .select(`
      added_at,
      restaurant:restaurants!restaurant_id (*)
    `)
    .eq('list_id', userId) // using user_id as list_id for default "want" list
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function bookmarkRestaurant(listId: string, restaurantId: string) {
  const { error } = await supabase
    .from('list_items')
    .upsert({ list_id: listId, restaurant_id: restaurantId });
  if (error) throw error;
}

export async function unbookmarkRestaurant(listId: string, restaurantId: string) {
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}
