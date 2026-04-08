import { supabase } from '../supabase';

export type Comment = {
  id: string;
  visit_id: string;
  user_id: string;
  text: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
};

export async function getComments(visitId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('visit_comments')
    .select(`
      id,
      visit_id,
      user_id,
      text,
      created_at,
      user:users!user_id (id, name, avatar_url)
    `)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(
  visitId: string,
  userId: string,
  text: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from('visit_comments')
    .insert({ visit_id: visitId, user_id: userId, text })
    .select(`
      id,
      visit_id,
      user_id,
      text,
      created_at,
      user:users!user_id (id, name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as unknown as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('visit_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}
