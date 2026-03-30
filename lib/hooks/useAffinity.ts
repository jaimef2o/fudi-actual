import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { computeAffinity, refreshAffinityForUser, getAffinity } from '../api/affinity';

export function useAffinity(userA: string | undefined, userB: string | undefined) {
  return useQuery({
    queryKey: ['affinity', userA, userB],
    queryFn: () => getAffinity(userA!, userB!),
    enabled: !!userA && !!userB && userA !== userB,
    staleTime: 10 * 60_000, // 10 min cache
  });
}

export function useRefreshAffinity(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => refreshAffinityForUser(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affinity'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
