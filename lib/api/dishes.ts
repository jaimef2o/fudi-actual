import { supabase } from '../supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VisitDish = {
  id: string;
  visit_id: string;
  name: string;
  highlighted: boolean;
  position: number;
  created_at: string;
};

/** A friend's visit with their dishes, used in Journey B and restaurant page */
export type FriendVisitDishes = {
  visitId: string;
  userId: string;
  userName: string;
  userHandle: string | null;
  userAvatarUrl: string | null;
  visitedAt: string;
  sentiment: 'loved' | 'fine' | 'disliked' | null;
  dishes: { id: string; name: string; highlighted: boolean }[];
};

// ─── Per-visit CRUD ───────────────────────────────────────────────────────────

/** Get all dishes for a visit — highlighted first, then by insertion order */
export async function getVisitDishes(visitId: string): Promise<VisitDish[]> {
  const { data, error } = await supabase
    .from('visit_dishes')
    .select('id, visit_id, name, highlighted, position, created_at')
    .eq('visit_id', visitId)
    .order('highlighted', { ascending: false })
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VisitDish[];
}

/** Add a dish to a visit */
export async function addDish(
  visitId: string,
  name: string,
  position: number
): Promise<VisitDish> {
  const { data, error } = await supabase
    .from('visit_dishes')
    .insert({ visit_id: visitId, name: name.trim(), highlighted: false, position })
    .select('id, visit_id, name, highlighted, position, created_at')
    .single();
  if (error) throw error;
  return data as VisitDish;
}

/** Toggle the highlighted flag of a dish */
export async function toggleDishHighlight(
  dishId: string,
  highlighted: boolean
): Promise<void> {
  const { error } = await supabase
    .from('visit_dishes')
    .update({ highlighted })
    .eq('id', dishId);
  if (error) throw error;
}

/** Delete a dish from a visit */
export async function deleteDish(dishId: string): Promise<void> {
  const { error } = await supabase
    .from('visit_dishes')
    .delete()
    .eq('id', dishId);
  if (error) throw error;
}

// ─── Social queries ───────────────────────────────────────────────────────────

/**
 * Returns dishes from friends' visits to a restaurant, grouped by visit/person.
 * Used in Journey B ("¿Qué pedimos?") and restaurant page recent visits.
 * Order: most recent visit first. Only visits that have at least one dish.
 */
export async function getFriendDishesForRestaurant(
  restaurantIds: string[],
  myUserId: string
): Promise<FriendVisitDishes[]> {
  if (!restaurantIds.length) return [];

  // Bidirectional mutual detection: both must follow each other with status='active'
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('relationships')
      .select('target_id')
      .eq('user_id', myUserId)
      .in('type', ['mutual', 'following']),
    supabase
      .from('relationships')
      .select('user_id')
      .eq('target_id', myUserId)
      .in('type', ['mutual', 'following']),
  ]);

  const outgoingIds = (outgoing ?? []).map((r: { target_id: string }) => r.target_id);
  const incomingSet = new Set((incoming ?? []).map((r: { user_id: string }) => r.user_id));
  const friendIds = outgoingIds.filter((id) => incomingSet.has(id));
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      sentiment,
      user:users!user_id (id, name, handle, avatar_url),
      visit_dishes (id, name, highlighted, position)
    `)
    .in('restaurant_id', restaurantIds)
    .in('user_id', friendIds)
    .order('visited_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  type VisitWithJoins = {
    id: string;
    visited_at: string;
    sentiment: string | null;
    user: { id: string; name: string; handle: string | null; avatar_url: string | null } | null;
    visit_dishes: { id: string; name: string; highlighted: boolean; position: number }[] | null;
  };

  return ((data ?? []) as unknown as VisitWithJoins[])
    .map((v) => ({
      visitId: v.id,
      userId: v.user?.id ?? '',
      userName: v.user?.name ?? '',
      userHandle: v.user?.handle ?? null,
      userAvatarUrl: v.user?.avatar_url ?? null,
      visitedAt: v.visited_at ?? '',
      sentiment: (v.sentiment as 'loved' | 'fine' | 'disliked' | null) ?? null,
      dishes: (v.visit_dishes ?? [])
        .sort((a, b) =>
          (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0) || a.position - b.position
        )
        .map((d) => ({
          id: d.id,
          name: d.name,
          highlighted: d.highlighted ?? false,
        })),
    }))
    .filter((v) => v.dishes.length > 0);
}
