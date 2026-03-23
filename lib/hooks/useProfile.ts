import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProfile,
  updateProfile,
  getFriends,
  getFollowing,
  getFollowRequests,
  getRelationship,
  followUser,
  unfollowUser,
  searchUsers,
} from '../api/users';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
}

export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: ['friends', userId],
    queryFn: () => getFriends(userId!),
    enabled: !!userId,
    // Poll every 20s so user A sees when user B accepts their request
    refetchInterval: 20_000,
  });
}

// People you follow but haven't followed back (outgoing, one-way)
export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: () => getFollowing(userId!),
    enabled: !!userId,
    refetchInterval: 20_000,
  });
}

// People who follow you but you haven't followed back (incoming, one-way)
export function useFollowRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ['followRequests', userId],
    queryFn: () => getFollowRequests(userId!),
    enabled: !!userId,
    refetchInterval: 15_000, // check for new requests every 15s
  });
}

export function useRelationship(
  userId: string | undefined,
  targetId: string | undefined
) {
  return useQuery({
    queryKey: ['relationship', userId, targetId],
    queryFn: () => getRelationship(userId!, targetId!),
    enabled: !!userId && !!targetId && userId !== targetId,
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { name?: string; bio?: string; city?: string; avatar_url?: string }) =>
      updateProfile(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useFollowUser(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => followUser(currentUserId, targetId),
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: ['relationship', currentUserId, targetId] });
      queryClient.invalidateQueries({ queryKey: ['relationship', targetId, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends', targetId] });
      queryClient.invalidateQueries({ queryKey: ['following', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['followRequests', currentUserId] });
      // Accepting a friend request changes who appears in the feed
      queryClient.invalidateQueries({ queryKey: ['feed', currentUserId] });
    },
  });
}

export function useUnfollowUser(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => unfollowUser(currentUserId, targetId),
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: ['relationship', currentUserId, targetId] });
      queryClient.invalidateQueries({ queryKey: ['relationship', targetId, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['following', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['followRequests', currentUserId] });
      // Removing a friend should also update the feed
      queryClient.invalidateQueries({ queryKey: ['feed', currentUserId] });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => searchUsers(query),
    enabled: query.length >= 2,
    // Keep search results fresh for 10s, then refetch on next keystroke
    staleTime: 10_000,
  });
}
