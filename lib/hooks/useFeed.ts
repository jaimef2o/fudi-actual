import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed, getUserFeed } from '../api/feed';
import { supabase } from '../supabase';

// Friends' posts — refetch every 3 min, keep stale for 2 min
export function useFeed(currentUserId: string | undefined) {
  const queryClient = useQueryClient();

  // Real-time: invalidate on new visits from friends
  useEffect(() => {
    if (!currentUserId) return;

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['feed', currentUserId] });
    const channel = supabase
      .channel(`visits-feed-${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visits', filter: `visibility=eq.friends` }, invalidate)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'visits' }, invalidate)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visits' }, invalidate)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, queryClient]);

  return useInfiniteQuery({
    queryKey: ['feed', currentUserId],
    queryFn: ({ pageParam = 0 }) => getFeed(currentUserId!, { offset: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    initialPageParam: 0,
    enabled: !!currentUserId,
    staleTime: 2 * 60_000,   // 2 min — don't refetch on every tab focus
    gcTime:   10 * 60_000,   // 10 min — keep in memory while navigating
  });
}

// Own posts (shown in profile activity tab)
export function useUserFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['userFeed', userId],
    queryFn: ({ pageParam = 0 }) => getUserFeed(userId!, { offset: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 3 * 60_000,   // 3 min — own posts change less frequently
    gcTime:   10 * 60_000,
  });
}
