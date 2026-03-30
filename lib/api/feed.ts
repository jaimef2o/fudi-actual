// @ts-nocheck
import { supabase } from '../supabase';

// Shape returned for each feed post
export type FeedPost = {
  id: string;
  visited_at: string;
  note: string | null;
  spend_per_person: '0-20' | '20-35' | '35-60' | '60+' | null;
  rank_score: number | null;
  sentiment: 'loved' | 'fine' | 'disliked' | null;
  visibility: 'friends' | 'groups' | 'private';
  /** True if this user is a mutual friend, false if only followed (one-way) */
  is_mutual: boolean;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    chain_name?: string | null;
    brand_name?: string | null;
    neighborhood: string | null;
    city: string | null;
    cover_image_url: string | null;
    cuisine: string | null;
    price_level: number | null;  // integer 1–4 in DB, convert with extractPriceLabel() for display
  };
  dishes: { id: string; name: string; highlighted: boolean; position: number }[];
  photos: { photo_url: string; type: 'restaurant' | 'dish'; dish_id: string | null }[];
  tags: { tagged_user: { id: string; name: string; avatar_url: string | null } }[];
  reactions: { id: string; emoji: string; user_id: string }[];
};

// Feed: visits from followed + mutual friends, mutuos first then chronological
export async function getFeed(
  currentUserId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<FeedPost[]> {
  // Get all outgoing relationships (following + mutual)
  const { data: rels, error: relsError } = await supabase
    .from('relationships')
    .select('target_id, type, affinity_score')
    .eq('user_id', currentUserId)
    .in('type', ['following', 'mutual']);

  if (relsError) throw relsError;

  const followingIds = (rels ?? []).map((r) => r.target_id);
  // Build a Set of mutual friend IDs for quick lookup
  const mutualSet = new Set(
    (rels ?? []).filter((r) => r.type === 'mutual').map((r) => r.target_id)
  );

  const affinityMap = new Map<string, number>();
  for (const r of (rels ?? [])) {
    if (r.affinity_score != null) affinityMap.set(r.target_id, r.affinity_score);
  }

  // Always include own posts in "Para ti"
  const queryIds = [...new Set([...followingIds, currentUserId])];

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
    .in('user_id', queryIds)
    .in('visibility', ['friends', 'private'])
    .order('visited_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Annotate with is_mutual; own posts count as mutual for the "Amigos" filter
  const posts = ((data ?? []) as any[]).map((p) => ({
    ...p,
    is_mutual: p.user_id === currentUserId || mutualSet.has(p.user_id),
  }));

  // Algorithmic feed score: affinity × quality × recency
  const now = Date.now();
  function feedScore(p: any): number {
    // Affinity factor (0-1): higher affinity friends rank higher
    const affinity = affinityMap.get(p.user_id) ?? (p.is_mutual ? 50 : 20);
    const affinityFactor = affinity / 100;

    // Quality factor (0-1): higher rank_score = better content
    const quality = p.rank_score != null ? p.rank_score / 10 : 0.5;

    // Recency decay: posts lose ~50% value per day
    const hoursAgo = (now - new Date(p.visited_at).getTime()) / (1000 * 60 * 60);
    const recency = 1 / (1 + hoursAgo / 24);

    // Own posts always on top
    if (p.user_id === currentUserId) return 1000 + recency;

    // Combined score: weighted sum
    return (affinityFactor * 0.35) + (quality * 0.25) + (recency * 0.40);
  }

  posts.sort((a, b) => feedScore(b) - feedScore(a));

  return posts as unknown as FeedPost[];
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
      spend_per_person,
      rank_score,
      sentiment,
      visibility,
      user:users!user_id (id, name, avatar_url),
      restaurant:restaurants!restaurant_id (id, name, chain_name, neighborhood, city, cover_image_url, cuisine, price_level),
      dishes:visit_dishes (id, name, highlighted, position),
      photos:visit_photos!visit_id (photo_url, type, dish_id),
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
