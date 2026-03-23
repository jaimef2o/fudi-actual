import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed, getUserFeed } from '../api/feed';
import { supabase } from '../supabase';

export function useFeed(currentUserId: string | undefined) {
  const queryClient = useQueryClient();

  // Subscribe to new visits so the feed updates in real-time
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`visits-feed-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visits',
          filter: `visibility=eq.friends`,
        },
        () => {
          // Invalidate so the "new post" banner can appear and a refresh fetches it
          queryClient.invalidateQueries({ queryKey: ['feed', currentUserId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, queryClient]);

  return useInfiniteQuery({
    queryKey: ['feed', currentUserId],
    queryFn: ({ pageParam = 0 }) => getFeed(currentUserId!, { offset: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    initialPageParam: 0,
    enabled: !!currentUserId,
  });
}

export function useUserFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['userFeed', userId],
    queryFn: ({ pageParam = 0 }) => getUserFeed(userId!, { offset: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    initialPageParam: 0,
    enabled: !!userId,
  });
}
