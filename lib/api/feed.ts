// @ts-nocheck
import { supabase } from '../supabase';

// Shape returned for each feed post
export type FeedPost = {
  id: string;
  visited_at: string;
  note: string | null;
  rank_score: number | null;
  visibility: 'friends' | 'groups' | 'private';
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    neighborhood: string | null;
    city: string | null;
    cover_image_url: string | null;
  };
  dishes: { dish_name: string; rank_position: number | null }[];
  photos: { photo_url: string; type: 'restaurant' | 'dish' }[];
  tags: { tagged_user: { id: string; name: string; avatar_url: string | null } }[];
};

// Feed: visits from mutual friends, newest first
export async function getFeed(
  currentUserId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<FeedPost[]> {
  // Get mutual friend IDs first
  const { data: rels, error: relsError } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', currentUserId)
    .eq('type', 'mutual');

  if (relsError) throw relsError;

  const friendIds = (rels ?? []).map((r) => r.target_id);

  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      note,
      rank_score,
      visibility,
      user:users!user_id (id, name, avatar_url),
      restaurant:restaurants!restaurant_id (id, name, neighborhood, city, cover_image_url),
      dishes:visit_dishes (dish_name, rank_position),
      photos:visit_photos (photo_url, type),
      tags:visit_tags (
        tagged_user:users!tagged_user_id (id, name, avatar_url)
      )
    `)
    .in('user_id', friendIds)
    .eq('visibility', 'friends')
    .order('visited_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

// Own visits (for profile)
export async function getUserFeed(
  userId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      note,
      rank_score,
      visibility,
      user:users!user_id (id, name, avatar_url),
      restaurant:restaurants!restaurant_id (id, name, neighborhood, city, cover_image_url),
      dishes:visit_dishes (dish_name, rank_position),
      photos:visit_photos (photo_url, type),
      tags:visit_tags (
        tagged_user:users!tagged_user_id (id, name, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .order('visited_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}
