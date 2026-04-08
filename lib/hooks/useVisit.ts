import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisit,
  getUserRanking,
  createVisit,
  deleteVisit,
  updateVisit,
  updateVisitFull,
  toggleReaction,
  updateVisitRankPosition,
  bookmarkRestaurant,
  unbookmarkRestaurant,
  getSavedRestaurants,
  getRestaurantExistingScore,
  CreateVisitInput,
  UpdateVisitInput,
  UpdateVisitFullInput,
} from '../api/visits';
import { savePost, unsavePost, getSavedPosts, getVisitSaveCount } from '../api/savedPosts';

export function useVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => getVisit(visitId!),
    enabled: !!visitId,
    staleTime: 3 * 60_000,   // visit details change infrequently
    gcTime:   15 * 60_000,
  });
}

export function useUserRanking(userId: string | undefined) {
  return useQuery({
    queryKey: ['ranking', userId],
    queryFn: () => getUserRanking(userId!),
    enabled: !!userId,
    staleTime: 2 * 60_000,   // ranking changes only when user adds/updates a visit
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

      // ── Feed: invalidate so it refetches when the user navigates back ──
      queryClient.invalidateQueries({ queryKey: ['feed', uid] });
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

export function useUpdateVisitFull() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, userId, input }: { visitId: string; userId: string; input: UpdateVisitFullInput }) =>
      updateVisitFull(visitId, userId, input),
    onSuccess: (_, { visitId, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['feed'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['ranking', userId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['userFeed', userId] });
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
    staleTime: 2 * 60_000,   // scores don't change that frequently
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
    onSuccess: async (_, { restaurantId }) => {
      // Refetch saved list immediately so pendingFav can be cleared with correct derived state
      await queryClient.refetchQueries({ queryKey: ['savedRestaurants', userId] });
      // Background-invalidate the rest (non-blocking)
      queryClient.invalidateQueries({ queryKey: ['feed', userId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
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

/**
 * How many users saved this visit — only shown to the visit owner.
 */
export function useVisitSaveCount(visitId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['visitSaveCount', visitId],
    queryFn: () => getVisitSaveCount(visitId!),
    enabled: !!visitId && enabled,
    staleTime: 60_000,
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
