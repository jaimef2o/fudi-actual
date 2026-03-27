/**
 * Supabase Edge Function: send-notification
 *
 * Called via Supabase Database Webhooks when specific events happen:
 *   • New follow (relationships INSERT)  → "X quiere seguirte en fudi"
 *   • New visit (visits INSERT)          → notify mutual friends
 *   • Visit tag (visit_tags INSERT)      → "X te etiquetó en su visita a Y"
 *
 * Deploy:
 *   supabase functions deploy send-notification
 *
 * Set secrets:
 *   supabase secrets set EXPO_ACCESS_TOKEN=<your_expo_access_token>
 *
 * Configure Webhooks in Supabase Dashboard:
 *   Table: relationships  Event: INSERT  URL: <function_url>  Headers: Authorization: Bearer <service_role_key>
 *   Table: visits         Event: INSERT  URL: <function_url>  Headers: Authorization: Bearer <service_role_key>
 *   Table: visit_tags     Event: INSERT  URL: <function_url>  Headers: Authorization: Bearer <service_role_key>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

async function sendExpoPushNotification(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const chunks: ExpoMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  for (const chunk of chunks) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(chunk),
    });
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { table, type, record } = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const messages: ExpoMessage[] = [];

    // ── New follow ───────────────────────────────────────────────────────────
    if (table === 'relationships' && type === 'INSERT') {
      const { user_id: followerId, target_id: targetId, type: relType } = record;

      // Get follower profile
      const { data: follower } = await supabase
        .from('users')
        .select('name, push_token')
        .eq('id', followerId)
        .single();

      // Get target push token
      const { data: target } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', targetId)
        .single();

      if (target?.push_token && follower?.name) {
        const isAccepted = relType === 'mutual';
        messages.push({
          to: target.push_token,
          title: isAccepted ? '¡Nueva amistad!' : 'Nueva solicitud de seguimiento',
          body: isAccepted
            ? `${follower.name} y tú ahora sois amigos en fudi`
            : `${follower.name} quiere seguirte en fudi`,
          sound: 'default',
          data: { screen: 'amigos', userId: followerId },
        });
      }
    }

    // ── New visit ────────────────────────────────────────────────────────────
    if (table === 'visits' && type === 'INSERT') {
      const { user_id: authorId, restaurant_id: restaurantId, id: visitId, visibility } = record;

      if (visibility !== 'private') {
        // Get author profile + restaurant name
        const [{ data: author }, { data: restaurant }] = await Promise.all([
          supabase.from('users').select('name').eq('id', authorId).single(),
          supabase.from('restaurants').select('name, brand_name').eq('id', restaurantId).single(),
        ]);

        const restaurantName = (restaurant as any)?.brand_name || (restaurant as any)?.name || 'un restaurante';

        // Find mutual friends with push tokens
        const { data: mutualFriends } = await supabase
          .from('relationships')
          .select('user_id')
          .eq('target_id', authorId)
          .eq('type', 'mutual');

        if (mutualFriends && mutualFriends.length > 0 && author?.name) {
          const friendIds = mutualFriends.map((r: any) => r.user_id);
          const { data: friends } = await supabase
            .from('users')
            .select('id, push_token')
            .in('id', friendIds)
            .not('push_token', 'is', null);

          for (const friend of (friends ?? [])) {
            if (friend.push_token) {
              messages.push({
                to: friend.push_token,
                title: author.name,
                body: `Ha visitado ${restaurantName} 🍽️`,
                sound: 'default',
                data: { screen: 'visit', visitId },
              });
            }
          }
        }
      }
    }

    // ── Visit tag ────────────────────────────────────────────────────────────
    if (table === 'visit_tags' && type === 'INSERT') {
      const { visit_id: visitId, tagged_user_id: taggedUserId } = record;

      // Get visit + author + restaurant
      const { data: visitData } = await supabase
        .from('visits')
        .select('user_id, restaurant:restaurants!restaurant_id(name, brand_name)')
        .eq('id', visitId)
        .single();

      if (visitData) {
        const authorId = (visitData as any).user_id;
        const restaurantName =
          (visitData as any).restaurant?.brand_name ||
          (visitData as any).restaurant?.name ||
          'un restaurante';

        const [{ data: author }, { data: taggedUser }] = await Promise.all([
          supabase.from('users').select('name').eq('id', authorId).single(),
          supabase.from('users').select('push_token').eq('id', taggedUserId).single(),
        ]);

        if (taggedUser?.push_token && author?.name) {
          messages.push({
            to: taggedUser.push_token,
            title: author.name,
            body: `Te etiquetó en su visita a ${restaurantName}`,
            sound: 'default',
            data: { screen: 'visit', visitId },
          });
        }
      }
    }

    await sendExpoPushNotification(messages);

    return new Response(JSON.stringify({ sent: messages.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-notification error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
