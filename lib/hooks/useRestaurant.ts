import { useQuery } from '@tanstack/react-query';
import {
  getRestaurant,
  getRestaurantStats,
  getRecentVisits,
  getFriendStats,
  getDiscoverRestaurants,
} from '../api/restaurants';
export { useFriendDishesForRestaurant } from './useDishes';
import { getRelevantRestaurantIds } from '../chains';

/**
 * Resolves all sibling location IDs for a restaurant (chain-aware).
 * For independent restaurants returns [restaurantId].
 * For chains returns all locations sharing the same chain_id.
 */
export function useRelevantRestaurantIds(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['relevantRestaurantIds', restaurantId],
    queryFn: () => getRelevantRestaurantIds(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 30 * 60_000,  // chain membership rarely changes
    gcTime:   60 * 60_000,
  });
}

export function useRestaurant(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => getRestaurant(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 10 * 60_000,  // restaurant metadata barely changes
    gcTime:   30 * 60_000,
  });
}

export function useRestaurantStats(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurantStats', restaurantId],
    queryFn: () => getRestaurantStats(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 2 * 60_000,   // counts update when visits/bookmarks come in
    gcTime:   10 * 60_000,
  });
}


export function useRecentVisits(
  restaurantIds: string[] | undefined,
  currentUserId: string | undefined
) {
  const ids = restaurantIds ?? [];
  return useQuery({
    queryKey: ['recentVisits', ids, currentUserId],
    queryFn: () => getRecentVisits(ids, currentUserId!),
    enabled: ids.length > 0 && !!currentUserId,
    staleTime: 2 * 60_000,
    gcTime:   10 * 60_000,
  });
}

export function useFriendStats(
  restaurantIds: string[] | undefined,
  currentUserId: string | undefined
) {
  const ids = restaurantIds ?? [];
  return useQuery({
    queryKey: ['friendStats', ids, currentUserId],
    queryFn: () => getFriendStats(ids, currentUserId!),
    enabled: ids.length > 0 && !!currentUserId,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useDiscoverRestaurants(
  currentUserId: string | undefined,
  mode: 'amigos' | 'global',
  filters: {
    city?: string;
    neighborhoods?: string[];
    cuisines?: string[];
    prices?: string[];
    search?: string;
    sortBy?: 'rating' | 'trending';
  }
) {
  // Stable serialization: sort keys so order never causes cache misses
  const filterKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))
        .sort(([a], [b]) => a.localeCompare(b))
    )
  );

  return useQuery({
    queryKey: ['discover', currentUserId, mode, filterKey],
    queryFn: () => getDiscoverRestaurants(currentUserId!, mode, filters),
    enabled: !!currentUserId,
    staleTime: 5 * 60_000,   // 5 min — discovery results are semi-static
    gcTime:   15 * 60_000,
  });
}
