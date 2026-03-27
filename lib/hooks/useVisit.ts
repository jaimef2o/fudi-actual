import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisit,
  getUserRanking,
  createVisit,
  deleteVisit,
  updateVisit,
  toggleReaction,
  updateVisitRankPosition,
  bookmarkRestaurant,
  unbookmarkRestaurant,
  getSavedRestaurants,
  getRestaurantExistingScore,
  CreateVisitInput,
  UpdateVisitInput,
} from '../api/visits';
import { savePost, unsavePost, getSavedPosts } from '../api/savedPosts';

export function useVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => getVisit(visitId!),
    enabled: !!visitId,
    staleTime: 5 * 60_000,   // visit details rarely change
    gcTime:   15 * 60_000,
  });
}

export function useUserRanking(userId: string | undefined) {
  return useQuery({
    queryKey: ['ranking', userId],
    queryFn: () => getUserRanking(userId!),
    enabled: !!userId,
    staleTime: 3 * 60_000,   // ranking changes only when user adds/updates a visit
    gcTime:   10 * 60_000,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVisitInput) => createVisit(input),
    onSuccess: (visit, variables) => {
      const uid = variables.user_id;
      const rid = variables.restaurant_id;

      // ── Feed: refetch NOW (in background) so it's ready when user navigates back ──
      // refetchQueries triggers an immediate fetch even if the component isn't mounted
      queryClient.refetchQueries({ queryKey: ['feed', uid], exact: true });
      queryClient.invalidateQueries({ queryKey: ['userFeed', uid] });

      // ── Ranking ───────────────────────────────────────────────────────────
      queryClient.invalidateQueries({ queryKey: ['ranking', uid] });

      // ── Restaurant stats & related ────────────────────────────────────────
      queryClient.invalidateQueries({ queryKey: ['restaurantStats', rid] });
      queryClient.invalidateQueries({ queryKey: ['friendDishes', rid] });
      queryClient.invalidateQueries({ queryKey: ['recentVisits', rid] });
      queryClient.invalidateQueries({ queryKey: ['dishStats', rid] });
      queryClient.invalidateQueries({ queryKey: ['topDishes', rid] });

      // ── Discover ──────────────────────────────────────────────────────────
      queryClient.invalidateQueries({ queryKey: ['discover'], exact: false });
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, updates }: { visitId: string; updates: UpdateVisitInput }) =>
      updateVisit(visitId, updates),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['feed'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['ranking'], exact: false });
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, userId }: { visitId: string; userId: string }) =>
      deleteVisit(visitId, userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['ranking', userId] });
      queryClient.invalidateQueries({ queryKey: ['feed', userId] });
      queryClient.invalidateQueries({ queryKey: ['userFeed', userId] });
      queryClient.invalidateQueries({ queryKey: ['savedPosts', userId] });
    },
  });
}

export function useUpdateVisitRank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      rankPosition,
      rankScore,
    }: {
      visitId: string;
      rankPosition: number;
      rankScore: number;
    }) => updateVisitRankPosition(visitId, rankPosition, rankScore),
    onSuccess: (_, { visitId }) => {
      // Only invalidate the current user's ranking, not everyone's
      queryClient.invalidateQueries({ queryKey: ['ranking'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['feed'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
    },
  });
}

export function useToggleReaction(visitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, emoji }: { userId: string; emoji: 'hungry' | 'fire' }) =>
      toggleReaction(visitId, userId, emoji),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
      // Only invalidate the reacting user's feed, not all feeds
      queryClient.invalidateQueries({ queryKey: ['feed', userId] });
    },
  });
}

/**
 * Returns the current averaged score for a restaurant in the user's ranking.
 * Used in registrar-visita to inform the user they're updating an existing entry.
 */
export function useRestaurantExistingScore(
  userId: string | undefined,
  restaurantId: string | undefined
) {
  return useQuery({
    queryKey: ['restaurantExistingScore', userId, restaurantId],
    queryFn: () => getRestaurantExistingScore(userId!, restaurantId!),
    enabled: !!userId && !!restaurantId,
    staleTime: 0,   // always fresh — checked right before comparison
    gcTime: 60_000,
  });
}

export function useSavedRestaurants(userId: string | undefined) {
  return useQuery({
    queryKey: ['savedRestaurants', userId],
    queryFn: () => getSavedRestaurants(userId!),
    enabled: !!userId,
    staleTime: 2 * 60_000,   // 2 min — bookmarks don't change often
    gcTime:   10 * 60_000,
  });
}

export function useBookmark(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      save,
    }: {
      restaurantId: string;
      save: boolean;
    }) =>
      save
        ? bookmarkRestaurant(userId!, restaurantId)
        : unbookmarkRestaurant(userId!, restaurantId),
    onSuccess: (_, { restaurantId }) => {
      // Update the saved list in Mis Listas
      queryClient.invalidateQueries({ queryKey: ['savedRestaurants', userId] });
      // Update the bookmark icon in feed cards
      queryClient.invalidateQueries({ queryKey: ['feed', userId] });
      // Update the ♡ button in restaurant detail
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      // Update the stats counters (global + friend saved counts)
      queryClient.invalidateQueries({ queryKey: ['restaurantStats', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['friendStats'] });
    },
  });
}

export function useSavedPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['savedPosts', userId],
    queryFn: () => getSavedPosts(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useSavePost(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, save }: { visitId: string; save: boolean }) =>
      save ? savePost(userId!, visitId) : unsavePost(userId!, visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPosts', userId] });
    },
  });
}
