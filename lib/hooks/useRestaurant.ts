import { useQuery } from '@tanstack/react-query';
import {
  getRestaurant,
  getRestaurantStats,
  getFriendDishes,
  getRecentVisits,
  getDiscoverRestaurants,
} from '../api/restaurants';

export function useRestaurant(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => getRestaurant(restaurantId!),
    enabled: !!restaurantId,
  });
}

export function useRestaurantStats(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurantStats', restaurantId],
    queryFn: () => getRestaurantStats(restaurantId!),
    enabled: !!restaurantId,
  });
}

export function useFriendDishes(
  restaurantId: string | undefined,
  currentUserId: string | undefined
) {
  return useQuery({
    queryKey: ['friendDishes', restaurantId, currentUserId],
    queryFn: () => getFriendDishes(restaurantId!, currentUserId!),
    enabled: !!restaurantId && !!currentUserId,
  });
}

export function useRecentVisits(
  restaurantId: string | undefined,
  currentUserId: string | undefined
) {
  return useQuery({
    queryKey: ['recentVisits', restaurantId, currentUserId],
    queryFn: () => getRecentVisits(restaurantId!, currentUserId!),
    enabled: !!restaurantId && !!currentUserId,
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
  }
) {
  return useQuery({
    queryKey: ['discover', currentUserId, mode, JSON.stringify(filters)],
    queryFn: () => getDiscoverRestaurants(currentUserId!, mode, filters),
    enabled: !!currentUserId,
    staleTime: 60_000,
  });
}
