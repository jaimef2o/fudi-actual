import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAppStore } from '../store';
import { useFollowRequests, useFollowUser, useRejectFollowRequest } from '../lib/hooks/useProfile';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../lib/hooks/useNotifications';
import type { FollowRequest } from '../lib/api/users';
import type { NotificationRow } from '../lib/api/notifications';
import { useState, useCallback, useMemo } from 'react';
import { COLORS } from '../lib/theme/colors';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return `hace ${Math.floor(days / 7)}sem`;
}

const NOTIF_ICON: Record<string, { name: string; color: string }> = {
  follow_request: { name: 'person-add', color: COLORS.secondary },
  new_follower: { name: 'person-add', color: COLORS.secondary },
  follow_accepted: { name: 'check-circle', color: COLORS.secondary },
  new_visit: { name: 'restaurant', color: COLORS.primary },
  tagged: { name: 'local-offer', color: COLORS.onSecondaryContainer },
  comment: { name: 'chat-bubble', color: COLORS.outline },
  post_saved: { name: 'bookmark', color: COLORS.secondary },
};

export default function NotificationsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const userId = currentUser?.id;

  // Follow requests (pending)
  const { data: followRequests = [] } = useFollowRequests(userId);
  const { mutateAsync: follow } = useFollowUser(userId ?? '');
  const { mutateAsync: reject } = useRejectFollowRequest(userId ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Notifications
  const { data: notifications = [], isLoading, refetch } = useNotifications(userId);
  const { data: unreadCount = 0 } = useUnreadCount(userId);
  const { mutateAsync: markRead } = useMarkAsRead(userId);
  const { mutateAsync: markAllRead } = useMarkAllAsRead(userId);
  const [refreshing, setRefreshing] = useState(false);

  const requests = followRequests.map((r: FollowRequest) => r.requester).filter(Boolean);

  // Split notifications into unread and read
  const { unread, read } = useMemo(() => {
    const unread: NotificationRow[] = [];
    const read: NotificationRow[] = [];
    for (const n of notifications) {
      if (n.read_at) read.push(n);
      else unread.push(n);
    }
    return { unread, read };
  }, [notifications]);

  async function handleAccept(requesterId: string) {
    setBusyId(requesterId);
    try { await follow(requesterId); } catch {}
    finally { setBusyId(null); }
  }

  async function handleReject(requesterId: string) {
    setBusyId(requesterId);
    try { await reject(requesterId); } catch {}
    finally { setBusyId(null); }
  }

  function handleNotifPress(notif: NotificationRow) {
    // Mark as read
    if (!notif.read_at) markRead(notif.id).catch(() => {});

    // Navigate based on type
    if (notif.type === 'new_visit' || notif.type === 'tagged' || notif.type === 'comment') {
      if (notif.visit_id) router.push(`/visit/${notif.visit_id}`);
    } else if (notif.type === 'follow_request' || notif.type === 'new_follower' || notif.type === 'follow_accepted') {
      if (notif.actor_id) router.push(`/profile/${notif.actor_id}`);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const hasAnyContent = requests.length > 0 || notifications.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead()} style={s.headerBtn}>
            <MaterialIcons name="done-all" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Follow requests */}
        {requests.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Solicitudes de amistad</Text>
            {requests.map((user) => (
              <View key={user.id} style={s.requestCard}>
                {user.avatar_url ? (
                  <ExpoImage source={{ uri: user.avatar_url }} style={s.avatar} contentFit="cover" />
                ) : (
                  <View style={[s.avatar, s.avatarPlaceholder]}>
                    <MaterialIcons name="person" size={20} color={COLORS.outline} />
                  </View>
                )}
                <View style={s.requestInfo}>
                  <Text style={s.requestName}>{user.name ?? 'Usuario'}</Text>
                  {user.handle && <Text style={s.requestHandle}>@{user.handle}</Text>}
                </View>
                <View style={s.requestActions}>
                  <TouchableOpacity
                    style={s.acceptBtn}
                    onPress={() => handleAccept(user.id)}
                    disabled={busyId === user.id}
                  >
                    <Text style={s.acceptBtnText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleReject(user.id)}
                    disabled={busyId === user.id}
                  >
                    <MaterialIcons name="close" size={18} color={COLORS.outline} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Unread notifications */}
        {unread.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Nuevas</Text>
            {unread.map((notif) => (
              <NotificationItem key={notif.id} notif={notif} onPress={handleNotifPress} isUnread />
            ))}
          </View>
        )}

        {/* Read notifications */}
        {read.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Anteriores</Text>
            {read.map((notif) => (
              <NotificationItem key={notif.id} notif={notif} onPress={handleNotifPress} isUnread={false} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {!hasAnyContent && !isLoading && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <MaterialIcons name="notifications-none" size={48} color={COLORS.outlineVariant} />
            </View>
            <Text style={s.emptyTitle}>Sin notificaciones</Text>
            <Text style={s.emptyText}>
              Cuando tus amigos registren visitas o te envíen solicitudes, aparecerán aquí.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Notification Item Component ────────────────────────────────────────────

function NotificationItem({
  notif,
  onPress,
  isUnread,
}: {
  notif: NotificationRow;
  onPress: (n: NotificationRow) => void;
  isUnread: boolean;
}) {
  const iconConfig = NOTIF_ICON[notif.type] ?? { name: 'notifications', color: COLORS.outline };
  const actor = notif.actor;

  return (
    <TouchableOpacity
      style={[s.notifCard, isUnread && s.notifCardUnread]}
      activeOpacity={0.7}
      onPress={() => onPress(notif)}
    >
      {/* Avatar or icon */}
      {actor?.avatar_url ? (
        <ExpoImage source={{ uri: actor.avatar_url }} style={s.notifAvatar} contentFit="cover" />
      ) : (
        <View style={[s.notifAvatar, s.avatarPlaceholder]}>
          <MaterialIcons name={iconConfig.name as any} size={20} color={iconConfig.color} />
        </View>
      )}

      {/* Content */}
      <View style={s.notifContent}>
        <Text style={[s.notifBody, isUnread && s.notifBodyUnread]} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={s.notifTime}>{timeAgo(notif.created_at)}</Text>
      </View>

      {/* Unread indicator */}
      {isUnread && <View style={s.unreadDot} />}

      {/* Type icon */}
      <MaterialIcons name={iconConfig.name as any} size={16} color={isUnread ? iconConfig.color : COLORS.outlineVariant} />
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(253,249,242,0.90)',
  },
  headerBtn: {
    padding: 10,
    borderRadius: 999,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: COLORS.primary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  // Follow request cards
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 8,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: { flex: 1, minWidth: 0 },
  requestName: { fontFamily: 'Manrope-Bold', fontSize: 15, color: COLORS.primary },
  requestHandle: { fontFamily: 'Manrope-Regular', fontSize: 12, color: COLORS.outline, marginTop: 1 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acceptBtn: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  acceptBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: COLORS.primary },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notification items
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  notifCardUnread: {
    backgroundColor: COLORS.surfaceContainerLowest,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifBody: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  notifBodyUnread: {
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primary,
  },
  notifTime: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondaryContainer,
    flexShrink: 0,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: COLORS.primary,
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 22,
  },
});
