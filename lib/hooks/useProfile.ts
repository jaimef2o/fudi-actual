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
  getSuggestedUsers,
  getFollowerCount,
  getFollowingCount,
  rejectFollowRequest,
} from '../api/users';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,   // profile data changes infrequently
    gcTime:   15 * 60_000,
  });
}

export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: ['friends', userId],
    queryFn: () => getFriends(userId!),
    enabled: !!userId,
    staleTime: 30_000,       // 30s — poll for accepted requests
    refetchInterval: 20_000,
  });
}

// People you follow but haven't followed back (outgoing, one-way)
export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: () => getFollowing(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 20_000,
  });
}

// People who follow you but you haven't followed back (incoming, one-way)
export function useFollowRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ['followRequests', userId],
    queryFn: () => getFollowRequests(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 15_000,  // check for new requests every 15s
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
    staleTime: 30_000,
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { name?: string; bio?: string; city?: string; avatar_url?: string; dietary_restrictions?: string[]; cuisine_dislikes?: string[] }) =>
      updateProfile(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      // Feed avatars/names update when profile changes
      queryClient.invalidateQueries({ queryKey: ['feed'], exact: false });
    },
  });
}

export function useFollowUser(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => followUser(currentUserId, targetId),
    onSuccess: (_, targetId) => {
      // Relationship state for both directions
      queryClient.invalidateQueries({ queryKey: ['relationship', currentUserId, targetId] });
      queryClient.invalidateQueries({ queryKey: ['relationship', targetId, currentUserId] });
      // Friend lists for both users
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends', targetId] });
      // Following/requests for both sides
      queryClient.invalidateQueries({ queryKey: ['following', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['following', targetId] });
      queryClient.invalidateQueries({ queryKey: ['followRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['followRequests', targetId] });
      // Accepting a friend = new posts become visible in feed
      queryClient.invalidateQueries({ queryKey: ['feed', currentUserId] });
      // Discover "Amigos" mode may now show different restaurants
      queryClient.invalidateQueries({ queryKey: ['discover'], exact: false });
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
      queryClient.invalidateQueries({ queryKey: ['following', targetId] });
      queryClient.invalidateQueries({ queryKey: ['followRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['followRequests', targetId] });
      // Removing a friend removes their posts from feed
      queryClient.invalidateQueries({ queryKey: ['feed', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['discover'], exact: false });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 10_000,        // 10s — search results stay fresh briefly
    gcTime:   60_000,
  });
}

export function useSuggestedUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ['suggestedUsers', userId],
    queryFn: () => getSuggestedUsers(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['followerCount', userId],
    queryFn: () => getFollowerCount(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useRejectFollowRequest(currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requesterId: string) => rejectFollowRequest(requesterId, currentUserId),
    onSuccess: (_, requesterId) => {
      queryClient.invalidateQueries({ queryKey: ['followRequests', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['relationship', requesterId, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['relationship', currentUserId, requesterId] });
    },
  });
}

export function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['followingCount', userId],
    queryFn: () => getFollowingCount(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
