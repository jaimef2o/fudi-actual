import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVisit, getUserRanking, createVisit, toggleReaction, updateVisitRankPosition, bookmarkRestaurant, unbookmarkRestaurant, getSavedRestaurants, CreateVisitInput } from '../api/visits';

export function useVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => getVisit(visitId!),
    enabled: !!visitId,
  });
}

export function useUserRanking(userId: string | undefined) {
  return useQuery({
    queryKey: ['ranking', userId],
    queryFn: () => getUserRanking(userId!),
    enabled: !!userId,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVisitInput) => createVisit(input),
    onSuccess: (_, variables) => {
      // Invalidate feed and ranking after creating a visit
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['ranking', variables.user_id] });
      queryClient.invalidateQueries({ queryKey: ['restaurantStats', variables.restaurant_id] });
    },
  });
}

export function useUpdateVisitRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, rankPosition, rankScore }: { visitId: string; rankPosition: number; rankScore: number }) =>
      updateVisitRankPosition(visitId, rankPosition, rankScore),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useToggleReaction(visitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, emoji }: { userId: string; emoji: 'hungry' | 'fire' }) =>
      toggleReaction(visitId, userId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useSavedRestaurants(userId: string | undefined) {
  return useQuery({
    queryKey: ['savedRestaurants', userId],
    queryFn: () => getSavedRestaurants(userId!),
    enabled: !!userId,
  });
}

export function useBookmark(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ restaurantId, save }: { restaurantId: string; save: boolean }) =>
      save
        ? bookmarkRestaurant(userId!, restaurantId)
        : unbookmarkRestaurant(userId!, restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedRestaurants', userId] });
    },
  });
}
