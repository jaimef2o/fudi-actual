// @ts-nocheck
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

  const { data: rels } = await supabase
    .from('relationships')
    .select('target_id')
    .eq('user_id', myUserId)
    .in('type', ['mutual', 'following']);

  const friendIds = (rels ?? []).map((r: any) => r.target_id as string);
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      user:users!user_id (id, name, handle, avatar_url),
      visit_dishes (id, name, highlighted, position)
    `)
    .in('restaurant_id', restaurantIds)
    .in('user_id', friendIds)
    .order('visited_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data ?? []) as any[])
    .map((v) => ({
      visitId: v.id as string,
      userId: (v.user?.id ?? '') as string,
      userName: (v.user?.name ?? '') as string,
      userHandle: (v.user?.handle ?? null) as string | null,
      userAvatarUrl: (v.user?.avatar_url ?? null) as string | null,
      visitedAt: (v.visited_at ?? '') as string,
      dishes: ((v.visit_dishes ?? []) as any[])
        .sort((a, b) =>
          (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0) || a.position - b.position
        )
        .map((d) => ({
          id: d.id as string,
          name: d.name as string,
          highlighted: (d.highlighted ?? false) as boolean,
        })),
    }))
    .filter((v) => v.dishes.length > 0);
}
