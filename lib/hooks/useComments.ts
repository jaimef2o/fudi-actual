import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, addComment, deleteComment } from '../api/comments';

export function useComments(visitId: string | undefined) {
  return useQuery({
    queryKey: ['comments', visitId],
    queryFn: () => getComments(visitId!),
    enabled: !!visitId,
    staleTime: 60_000,
  });
}

export function useAddComment(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, text }: { userId: string; text: string }) =>
      addComment(visitId, userId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', visitId] });
    },
  });
}

export function useDeleteComment(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', visitId] });
    },
  });
}
