import { supabase } from '../supabase';

type SavedVisitRow = {
  visit_id: string;
  created_at: string;
  visit: {
    id: string;
    visited_at: string;
    note: string | null;
    rank_score: number | null;
    user: { id: string; name: string; avatar_url: string | null };
    restaurant: {
      id: string;
      name: string;
      chain_name: string | null;
      brand_name: string | null;
      neighborhood: string | null;
      city: string | null;
      cover_image_url: string | null;
      cuisine: string | null;
      price_level: number | null;
    };
    dishes: { id: string; name: string; highlighted: boolean; position: number }[];
    photos: { photo_url: string; type: string; dish_id: string | null }[];
  } | null;
};

export async function savePost(userId: string, visitId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_visits')
    .insert({ user_id: userId, visit_id: visitId });
  // Code '23505' = unique_violation (post already saved) — safe to ignore
  if (error && error.code !== '23505') throw error;
}

export async function unsavePost(userId: string, visitId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_visits')
    .delete()
    .eq('user_id', userId)
    .eq('visit_id', visitId);
  if (error) throw error;
}

export async function getSavedPosts(userId: string) {
  const { data, error } = await supabase
    .from('saved_visits')
    .select(`
      visit_id,
      created_at,
      visit:visits (
        id,
        visited_at,
        note,
        rank_score,
        user:users!user_id (id, name, avatar_url),
        restaurant:restaurants!restaurant_id (id, name, chain_name, brand_name, neighborhood, city, cover_image_url, cuisine, price_level),
        dishes:visit_dishes!visit_id (id, name, highlighted, position),
        photos:visit_photos!visit_id (photo_url, type, dish_id)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as SavedVisitRow[]).map((row) => row.visit).filter(Boolean);
}

export async function isPostSaved(userId: string, visitId: string): Promise<boolean> {
  const { data } = await supabase
    .from('saved_visits')
    .select('id')
    .eq('user_id', userId)
    .eq('visit_id', visitId)
    .maybeSingle();
  return !!data;
}
