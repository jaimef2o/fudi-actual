import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisitDishes,
  addDish,
  toggleDishHighlight,
  deleteDish,
  getFriendDishesForRestaurant,
  type VisitDish,
  type FriendVisitDishes,
} from '../api/dishes';

export type { VisitDish, FriendVisitDishes };

/** Dishes for a specific visit — ordered highlighted first, then by position */
export function useVisitDishes(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visitDishes', visitId],
    queryFn: () => getVisitDishes(visitId!),
    enabled: !!visitId,
    staleTime: 60_000,
  });
}

/** Add a dish to a visit */
export function useAddDish(visitId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, position }: { name: string; position: number }) =>
      addDish(visitId!, name, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitDishes', visitId] });
    },
  });
}

/** Toggle highlighted on a dish */
export function useToggleDishHighlight(visitId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dishId, highlighted }: { dishId: string; highlighted: boolean }) =>
      toggleDishHighlight(dishId, highlighted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitDishes', visitId] });
    },
  });
}

/** Delete a dish */
export function useDeleteDish(visitId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dishId: string) => deleteDish(dishId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitDishes', visitId] });
    },
  });
}

/** Friend dishes for a restaurant (for Journey B and restaurant page) */
export function useFriendDishesForRestaurant(
  restaurantIds: string[] | undefined,
  currentUserId: string | undefined
) {
  const ids = restaurantIds ?? [];
  return useQuery({
    queryKey: ['friendDishesForRestaurant', ids, currentUserId],
    queryFn: () => getFriendDishesForRestaurant(ids, currentUserId!),
    enabled: ids.length > 0 && !!currentUserId,
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
  });
}
