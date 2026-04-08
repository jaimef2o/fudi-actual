import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRestaurant,
  getRestaurantStats,
  getRecentVisits,
  getFriendStats,
  getDiscoverRestaurants,
} from '../api/restaurants';
export { useFriendDishesForRestaurant } from './useDishes';
import { getRelevantRestaurantIds } from '../chains';
import { getPlaceDetails, resolvePhotoUrl } from '../api/places';
import { supabase } from '../supabase';

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

  const queryClient = useQueryClient();
  const attemptedIdsRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['discover', currentUserId, mode, filterKey],
    queryFn: () => getDiscoverRestaurants(currentUserId!, mode, filters),
    enabled: !!currentUserId,
    staleTime: 5 * 60_000,   // 5 min — discovery results are semi-static
    gcTime:   15 * 60_000,
  });

  // After data is fetched, backfill missing cover photos from Google Places (fire-and-forget)
  useEffect(() => {
    if (!query.data?.length) return;

    const missing = query.data.filter(
      (r: any) => !r.cover_image_url && r.google_place_id && !attemptedIdsRef.current.has(r.id)
    );
    if (missing.length === 0) return;

    // Backfill max 3 at a time to avoid rate limits
    const batch = missing.slice(0, 3);
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      let didUpdate = false;

      for (const r of batch) {
        if (abortController.signal.aborted) break;

        attemptedIdsRef.current.add(r.id);
        try {
          const details = await getPlaceDetails(r.google_place_id);
          if (abortController.signal.aborted) break;

          const photoRef = details?.photos?.[0]?.photo_reference;
          if (!photoRef) continue;

          const url = await resolvePhotoUrl(photoRef);
          if (abortController.signal.aborted) break;
          if (!url) continue;

          await supabase
            .from('restaurants')
            .update({ cover_image_url: url })
            .eq('id', r.id);

          if (!didUpdate) {
            didUpdate = true;
            // Small delay so multiple concurrent updates batch into one invalidation
            timeoutId = setTimeout(() => {
              if (!abortController.signal.aborted) {
                queryClient.invalidateQueries({ queryKey: ['discover'] });
              }
            }, 500);
          }
        } catch {
          // Silently ignore — this is a best-effort backfill
        }
      }
    })();

    return () => {
      abortController.abort();
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [query.data]);

  return query;
}
