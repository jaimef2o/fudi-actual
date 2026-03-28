import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { registerForPushNotifications, configureForegroundNotifications } from '../../lib/notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store';
import { useFeed, useUserFeed } from '../../lib/hooks/useFeed';
import { useSavePost, useToggleReaction } from '../../lib/hooks/useVisit';
import { useFollowRequests, useFollowUser, useRejectFollowRequest } from '../../lib/hooks/useProfile';
import type { FeedPost } from '../../lib/api/feed';
import { scorePalette } from '../../lib/sentimentColors';
import { supabase } from '../../lib/supabase';
import { getDisplayName } from '../../lib/utils/restaurantName';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Notification dropdown panel ─────────────────────────────────────────────

function NotifPanel({
  visible,
  onClose,
  currentUserId,
  requests,
}: {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  requests: any[];
}) {
  const { mutateAsync: follow } = useFollowUser(currentUserId);
  const { mutateAsync: reject } = useRejectFollowRequest(currentUserId);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAccept(requesterId: string) {
    setBusyId(requesterId);
    try { await follow(requesterId); } catch { /* silent */ }
    finally { setBusyId(null); }
  }

  async function handleReject(requesterId: string) {
    setBusyId(requesterId);
    try { await reject(requesterId); } catch { /* silent */ }
    finally { setBusyId(null); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={onClose}
      />
      {/* Panel — absolutely positioned top-right */}
      <View style={notifStyles.panel} pointerEvents="box-none">
        {/* Header row */}
        <View style={notifStyles.panelHeader}>
          <Text style={notifStyles.panelTitle}>Notificaciones</Text>
          {requests.length > 0 && (
            <View style={notifStyles.panelBadge}>
              <Text style={notifStyles.panelBadgeText}>{requests.length}</Text>
            </View>
          )}
        </View>

        {requests.length === 0 ? (
          <View style={notifStyles.emptyWrap}>
            <MaterialIcons name="notifications-none" size={32} color="#c1c8c2" />
            <Text style={notifStyles.emptyText}>Sin notificaciones</Text>
          </View>
        ) : (
          <>
            <Text style={notifStyles.sectionLabel}>SOLICITUDES DE AMISTAD</Text>
            {requests.map((req: any) => {
              const busy = busyId === req.id;
              return (
                <View key={req.id} style={notifStyles.row}>
                  {/* Avatar */}
                  <TouchableOpacity
                    onPress={() => { onClose(); router.push(`/profile/${req.id}`); }}
                    activeOpacity={0.8}
                  >
                    {req.avatar_url ? (
                      <Image source={{ uri: req.avatar_url }} style={notifStyles.avatar} />
                    ) : (
                      <View style={[notifStyles.avatar, notifStyles.avatarPlaceholder]}>
                        <MaterialIcons name="person" size={18} color="#727973" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Name */}
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => { onClose(); router.push(`/profile/${req.id}`); }}
                    activeOpacity={0.8}
                  >
                    <Text style={notifStyles.name} numberOfLines={1}>{req.name}</Text>
                    <Text style={notifStyles.sub} numberOfLines={1}>
                      {req.handle ? `@${req.handle}` : 'Quiere seguirte'}
                    </Text>
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={notifStyles.rejectBtn}
                      onPress={() => handleReject(req.id)}
                      disabled={!!busyId}
                      activeOpacity={0.8}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#727973" />
                      ) : (
                        <MaterialIcons name="close" size={15} color="#727973" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={notifStyles.acceptBtn}
                      onPress={() => handleAccept(req.id)}
                      disabled={!!busyId}
                      activeOpacity={0.8}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#546b00" />
                      ) : (
                        <MaterialIcons name="check" size={15} color="#546b00" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    </Modal>
  );
}

const notifStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    width: 300,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  panelTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  panelBadge: {
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  panelBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#546b00',
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#032417',
  },
  sub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#727973',
    marginTop: 1,
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c7ef48',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────

function formatSpend(spend: string | null | undefined): string | null {
  if (!spend) return null;
  const map: Record<string, string> = { '0-20': '~€0–20pp', '20-35': '~€20–35pp', '35-60': '~€35–60pp', '60+': '~€60+pp' };
  return map[spend] ?? null;
}

function ScoreBadge({ score }: { score: number }) {
  const pal = scorePalette(score);
  return (
    <View style={[styles.scoreBadge, { backgroundColor: pal.badgeBg }]}>
      <Text style={[styles.scoreBadgeText, { color: pal.badgeText }]}>{score.toFixed(1)}</Text>
    </View>
  );
}


export default function FeedScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, refetch, isError } = useFeed(currentUser?.id);
  // Also load own posts — shown when friends feed is empty
  const { data: ownData } = useUserFeed(currentUser?.id);
  const { data: followRequests } = useFollowRequests(currentUser?.id);
  const pendingRequestCount = followRequests?.length ?? 0;
  const pendingRequestors = (followRequests ?? []).map((r: any) => r.requester).filter(Boolean);
  // Todos / Solo amigos toggle (local filter — no extra API call)
  const [onlyMutual, setOnlyMutual] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  function handleAvatarLongPress() {
    Alert.alert(
      currentUser?.name ?? 'Mi cuenta',
      'Opciones de cuenta',
      [
        { text: 'Ver perfil', onPress: () => router.push(`/profile/${currentUser?.id}`) },
        { text: 'Ajustes', onPress: () => router.push('/settings') },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => supabase.auth.signOut(),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  const allPosts = data?.pages.flatMap((p) => p) ?? [];
  const posts = onlyMutual ? allPosts.filter((p) => p.is_mutual) : allPosts;
  const ownPosts = ownData?.pages.flatMap((p) => p) ?? [];

  // ── Refetch feed every time screen comes into focus ──────────────────────
  const lastFocusRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Throttle: only refetch if more than 10 seconds since last focus
      if (now - lastFocusRef.current > 10_000) {
        lastFocusRef.current = now;
        refetch();
      }
    }, [refetch])
  );

  // ── "New post" banner (realtime) ──────────────────────────────────────────
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const prevPostCountRef = useRef(0);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (posts.length > prevPostCountRef.current && prevPostCountRef.current > 0) {
      setHasNewPosts(true);
    }
    prevPostCountRef.current = posts.length;
  }, [posts.length]);

  // ── Push notification registration (after user has at least one post) ─────
  const pushRegistered = useRef(false);
  useEffect(() => {
    if (!currentUser?.id || pushRegistered.current) return;
    if (posts.length > 0 || ownPosts.length > 0) {
      pushRegistered.current = true;
      configureForegroundNotifications();
      registerForPushNotifications(currentUser.id);
    }
  }, [posts.length, ownPosts.length, currentUser?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Fixed glassmorphism header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push(`/profile/${currentUser?.id}`)}
            onLongPress={handleAvatarLongPress}
            activeOpacity={0.7}
          >
            {currentUser?.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="person" size={20} color="#727973" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.logoText}>fudi</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setNotifOpen(true)}
            style={{ position: 'relative', padding: 4 }}
          >
            <MaterialIcons
              name={pendingRequestCount > 0 ? 'notifications' : 'notifications-none'}
              size={26}
              color="#032417"
            />
            {pendingRequestCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Para ti / Amigos toggle — X/Twitter style */}
        <View style={styles.feedToggleRow}>
          <TouchableOpacity
            onPress={() => setOnlyMutual(false)}
            style={styles.feedToggleTab}
            activeOpacity={0.7}
          >
            <Text style={[styles.feedToggleText, !onlyMutual && styles.feedToggleTextActive]}>
              Para ti
            </Text>
            {!onlyMutual && <View style={styles.feedToggleUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOnlyMutual(true)}
            style={styles.feedToggleTab}
            activeOpacity={0.7}
          >
            <Text style={[styles.feedToggleText, onlyMutual && styles.feedToggleTextActive]}>
              Amigos
            </Text>
            {onlyMutual && <View style={styles.feedToggleUnderline} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* "New post" realtime banner */}
      {hasNewPosts && (
        <TouchableOpacity
          onPress={() => {
            setHasNewPosts(false);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            top: 80,
            alignSelf: 'center',
            zIndex: 100,
            backgroundColor: '#032417',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <MaterialIcons name="arrow-upward" size={14} color="#c7ef48" />
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: '#ffffff' }}>
            Nueva publicación
          </Text>
        </TouchableOpacity>
      )}

      {/* Feed list */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#032417"
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
          if (isNearBottom && hasNextPage && !isLoading) fetchNextPage();
        }}
        scrollEventThrottle={400}
      >
        {isLoading && posts.length === 0 && (
          <View style={{ gap: 16, paddingTop: 8 }}>
            {[1, 2].map((i) => (
              <View key={i} style={[styles.card, { overflow: 'hidden' }]}>
                {/* Header skeleton */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6e2db' }} />
                  <View style={{ gap: 6, flex: 1 }}>
                    <View style={{ height: 12, width: '40%', backgroundColor: '#e6e2db', borderRadius: 6 }} />
                    <View style={{ height: 10, width: '25%', backgroundColor: '#f1ede6', borderRadius: 6 }} />
                  </View>
                  <View style={{ width: 44, height: 28, borderRadius: 14, backgroundColor: '#c7ef48', opacity: 0.3 }} />
                </View>
                {/* Image skeleton */}
                <View style={{ aspectRatio: 1, backgroundColor: '#e6e2db' }} />
                {/* Content skeleton */}
                <View style={{ padding: 16, gap: 8 }}>
                  <View style={{ height: 14, width: '70%', backgroundColor: '#e6e2db', borderRadius: 6 }} />
                  <View style={{ height: 12, width: '50%', backgroundColor: '#f1ede6', borderRadius: 6 }} />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {[1, 2, 3].map((j) => <View key={j} style={{ height: 28, width: 72, borderRadius: 10, backgroundColor: '#f7f3ec' }} />)}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        {/* Error state */}
        {isError && posts.length === 0 && (
          <View style={{ paddingTop: 60, alignItems: 'center', gap: 12, paddingHorizontal: 32 }}>
            <MaterialIcons name="wifi-off" size={48} color="#c1c8c2" />
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' }}>
              Sin conexión
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center' }}>
              No se pudo cargar el feed. Comprueba tu conexión e inténtalo de nuevo.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#032417', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, marginTop: 4 }}
              onPress={() => refetch()}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#ffffff' }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real friend posts */}
        {posts.length > 0 && posts.map((post) => (
          <RealFeedCard key={post.id} post={post} currentUserId={currentUser?.id} />
        ))}

        {/* Own posts when friends feed is empty but user has their own visits */}
        {posts.length === 0 && !isLoading && ownPosts.length > 0 && (
          ownPosts.map((post) => (
            <RealFeedCard key={post.id} post={post} currentUserId={currentUser?.id} showRelationLabel={false} />
          ))
        )}

        {/* "Solo amigos" filter active but no mutual-friend posts */}
        {onlyMutual && posts.length === 0 && allPosts.length > 0 && !isLoading && (
          <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="people" size={32} color="#c7ef48" />
            </View>
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' }}>
              Sin posts de amigos mutuos
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 20 }}>
              Tus amigos mutuos no han publicado nada aún. Prueba con "Para ti".
            </Text>
            <TouchableOpacity
              style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: '#f1ede6', marginTop: 4 }}
              onPress={() => setOnlyMutual(false)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#032417' }}>Ver todos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state when no posts at all */}
        {posts.length === 0 && ownPosts.length === 0 && !isLoading && !onlyMutual && (
          <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="restaurant" size={36} color="#c7ef48" />
            </View>
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 22, color: '#032417', textAlign: 'center' }}>
              Tu feed está vacío
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 20 }}>
              Registra tu primera visita o añade amigos para ver sus recomendaciones.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#032417', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, marginTop: 8 }}
              onPress={() => router.push('/registrar-visita')}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff' }}>Registrar primera visita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 10 }}
              onPress={() => router.push('/(tabs)/amigos')}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#032417', textDecorationLine: 'underline' }}>Añadir amigos</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Notification dropdown */}
      {currentUser?.id && (
        <NotifPanel
          visible={notifOpen}
          onClose={() => setNotifOpen(false)}
          currentUserId={currentUser.id}
          requests={pendingRequestors}
        />
      )}
    </View>
  );
}

function RelationLabel({ isMutual }: { isMutual: boolean }) {
  return (
    <View style={{
      backgroundColor: isMutual ? 'rgba(199,239,72,0.40)' : '#ebe8e1',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    }}>
      <Text style={{
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: isMutual ? '#546b00' : '#424844',
      }}>
        {isMutual ? 'Amigo' : 'Siguiendo'}
      </Text>
    </View>
  );
}

function RealFeedCard({ post, currentUserId, showRelationLabel = true }: { post: FeedPost; currentUserId?: string; showRelationLabel?: boolean }) {
  const showToast = useAppStore((s) => s.showToast);
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  const userImages = post.photos?.map((p: any) => p.photo_url) ?? [];
  // Fall back to Google Places cover image when the user posted no photos
  const images = userImages.length > 0
    ? userImages
    : post.restaurant.cover_image_url
      ? [post.restaurant.cover_image_url]
      : [];
  const [imgIndex, setImgIndex] = useState(0);
  const [postSaved, setPostSaved] = useState(false);
  const [likeActive, setLikeActive] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const likeScale = useRef(new Animated.Value(1)).current;
  const { mutateAsync: toggleSavePost } = useSavePost(currentUserId);
  const { mutate: doToggleReaction } = useToggleReaction(post.id);

  function handleLike() {
    if (!currentUserId || currentUserId === post.user.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !likeActive;
    setLikeActive(next);
    setLikeCount((c) => next ? c + 1 : Math.max(0, c - 1));
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.35, useNativeDriver: true, speed: 30, bounciness: 12 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
    doToggleReaction({ userId: currentUserId, emoji: 'hungry' });
  }

  async function handleBookmark() {
    if (!currentUserId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !postSaved;
    setPostSaved(next);
    try {
      await toggleSavePost({ visitId: post.id, save: next });
      if (next) showToast('Publicación guardada');
    } catch {
      setPostSaved(!next);
    }
  }

  async function handleShare() {
    const name = getDisplayName(post.restaurant as any, 'post');
    const score = post.rank_score;
    const url = `https://fudi.app/visit/${post.id}`;
    try {
      await (await import('react-native')).Share.share({
        message: `"${name}"${score != null ? ` — ${score.toFixed(1)}/10` : ''} en fudi.\n${url}`,
        url,
        title: `${name} en fudi`,
      });
    } catch {
      // dismissed
    }
  }

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
          onPress={() => router.push(`/profile/${post.user.id}`)}
          activeOpacity={0.75}
        >
          {post.user.avatar_url ? (
            <Image source={{ uri: post.user.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="person" size={18} color="#727973" />
            </View>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.userName}>{post.user.name}</Text>
              {showRelationLabel && <RelationLabel isMutual={post.is_mutual} />}
            </View>
            <Text style={styles.timeText}>{timeAgo(post.visited_at)}</Text>
          </View>
        </TouchableOpacity>
        {(post.rank_score ?? 0) > 0 && (
          <ScoreBadge score={post.rank_score!} />
        )}
      </View>

      {/* Image carousel (only when photos exist) */}
      {images.length > 0 ? (
        <View style={{ aspectRatio: 1, width: '100%', overflow: 'hidden' }}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push(`/visit/${post.id}`)}
            style={{ flex: 1 }}
          >
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}>
              {images.map((uri: string, i: number) => (
                <View key={i} style={{ width: SCREEN_WIDTH - 32, aspectRatio: 1 }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
            {/* Overlay info */}
            <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', pointerEvents: 'none' }]}>
              <LinearGradient colors={['transparent', 'rgba(3,36,23,0.45)', 'rgba(3,36,23,0.88)']} style={{ padding: 18, paddingBottom: images.length > 1 ? 32 : 18 }}>
                {post.restaurant.neighborhood ? (
                  <Text style={{ fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: '#c7ef48', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>
                    {post.restaurant.neighborhood}
                  </Text>
                ) : null}
                <Text style={{ fontFamily: 'NotoSerif-BoldItalic', fontSize: 30, color: '#ffffff', lineHeight: 34 }} numberOfLines={2}>
                  {getDisplayName(post.restaurant as any, 'post')}
                </Text>
                {post.restaurant.cuisine ? (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                      <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>{post.restaurant.cuisine}</Text>
                    </View>
                  </View>
                ) : null}
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Pagination dots */}
          {images.length > 1 && (
            <View style={[styles.dotsContainer, { position: 'absolute', bottom: 8, left: 0, right: 0, paddingVertical: 0 }]}>
              {images.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, i === imgIndex ? styles.dotActive : styles.dotInactive,
                  { width: i === imgIndex ? 16 : 6 }]} />
              ))}
            </View>
          )}
        </View>
      ) : (
        /* No photo — compact restaurant banner */
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/visit/${post.id}`)}
          style={styles.noPhotoBanner}
        >
          <View style={{ flex: 1 }}>
            {post.restaurant.neighborhood ? (
              <Text style={styles.noPhotoNeighborhood}>{post.restaurant.neighborhood}</Text>
            ) : null}
            <Text style={styles.noPhotoName} numberOfLines={1}>
              {getDisplayName(post.restaurant as any, 'post')}
            </Text>
            {post.restaurant.cuisine ? (
              <Text style={styles.noPhotoCuisine}>{post.restaurant.cuisine}</Text>
            ) : null}
          </View>
          <MaterialIcons name="chevron-right" size={20} color="rgba(199,239,72,0.6)" />
        </TouchableOpacity>
      )}

      {/* Action bar — right below the image, like Instagram */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.likeBtn}
          activeOpacity={0.7}
          onPress={handleLike}
          disabled={!currentUserId || currentUserId === post.user.id}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <MaterialIcons
              name={likeActive ? 'favorite' : 'favorite-border'}
              size={24}
              color={likeActive ? '#e0314b' : '#1c1c18'}
            />
          </Animated.View>
          {likeCount > 0 && (
            <Text style={[styles.likeCount, likeActive && styles.likeCountActive]}>
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleBookmark}
          activeOpacity={0.7}
          style={[styles.saveBtn, postSaved && styles.saveBtnActive]}
        >
          <MaterialIcons
            name={postSaved ? 'bookmark-added' : 'bookmark-add'}
            size={20}
            color={postSaved ? '#032417' : '#727973'}
          />
        </TouchableOpacity>
      </View>

      {/* Caption + Dishes — tapping anywhere opens the post */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push(`/visit/${post.id}`)}
      >
        {post.note && (
          <View style={styles.captionWrapper}>
            <Text style={styles.captionText} numberOfLines={3}>
              <Text style={styles.captionUsername}>{post.user.name}{'  '}</Text>
              {post.note}
            </Text>
          </View>
        )}

        {post.dishes && post.dishes.length > 0 && (
          <View style={[styles.dishesSection, !post.note && { paddingTop: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 3, height: 12, backgroundColor: '#c7ef48', borderRadius: 2 }} />
              <Text style={styles.sectionLabel}>COMANDA</Text>
            </View>
            <View style={styles.chipsRow}>
              {(() => {
                const sorted = [...(post.dishes as any[])]
                  .filter((d: any) => (typeof d === 'string' ? d : d.name)?.trim())
                  .sort((a, b) => (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0));
                const visible = sorted.slice(0, 4);
                const overflow = Math.max(0, sorted.length - 4);
                return (
                  <>
                    {visible.map((d: any, i: number) => {
                      const name = typeof d === 'string' ? d : (d.name ?? '');
                      const isHighlighted = typeof d === 'object' && d.highlighted;
                      return (
                        <View key={i} style={[styles.chip, isHighlighted && styles.chipHighlighted]}>
                          {isHighlighted
                            ? <Text style={styles.chipStar}>★</Text>
                            : <MaterialIcons name="restaurant" size={9} color="#a0a6a1" />
                          }
                          <Text style={[styles.chipText, isHighlighted && styles.chipTextHighlighted]}>{name}</Text>
                        </View>
                      );
                    })}
                    {overflow > 0 && (
                      <View style={styles.chip}>
                        <Text style={[styles.chipText, { fontFamily: 'NotoSerif-Bold' }]}>+{overflow} más</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        )}

        {!post.note && (!post.dishes || post.dishes.length === 0) && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 }}>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 12, color: '#c1c8c2' }}>
              Ver publicación →
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(253,249,242,0.94)',
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  feedToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(241,237,230,0.60)',
  },
  feedToggleTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  feedToggleText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#a0a6a1',
  },
  feedToggleTextActive: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
  },
  feedToggleUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    backgroundColor: '#032417',
    borderRadius: 2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(3,36,23,0.05)',
  },
  logoText: {
    fontStyle: 'italic',
    fontSize: 24,
    color: '#032417',
    fontFamily: 'NotoSerif-Italic',
    letterSpacing: -0.5,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fdf9f2',
  },
  notifBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 9,
    color: '#ffffff',
  },
  feedContainer: {
    paddingTop: Platform.OS === 'ios' ? 152 : 132,
    paddingBottom: 110,
    paddingHorizontal: 16,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c18',
    fontFamily: 'Manrope-Bold',
  },
  timeText: {
    fontSize: 12,
    color: '#727973',
    marginTop: 2,
    fontFamily: 'Manrope-Regular',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  scoreBadgeText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 20,
  },
  neighborhoodText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 3,
    color: '#c7ef48',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  restaurantNameText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: '#ffffff',
    lineHeight: 36,
  },
  cityText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },
  noPhotoBanner: {
    backgroundColor: '#f1ede6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  noPhotoNeighborhood: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 2,
  },
  noPhotoName: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 18,
    color: '#1c1c18',
    lineHeight: 23,
  },
  noPhotoCuisine: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#727973',
    marginTop: 2,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(3,36,23,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: { backgroundColor: '#032417' },
  dotInactive: { backgroundColor: '#c1c8c2' },
  dishesSection: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#727973',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1ede6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  chipHighlighted: {
    backgroundColor: 'rgba(199,239,72,0.22)',
  },
  chipStar: {
    fontSize: 10,
    color: '#516600',
    fontFamily: 'Manrope-Bold',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: '#032417',
  },
  chipTextHighlighted: {
    color: '#516600',
    fontFamily: 'Manrope-SemiBold',
  },
  companionsSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
  },
  companionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  likeCount: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#1c1c18',
  },
  likeCountActive: {
    color: '#e0314b',
  },
  saveBtn: {
    marginLeft: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: {
    backgroundColor: '#c7ef48',
  },
  captionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  captionUsername: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 13,
    color: '#1c1c18',
  },
  captionText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#424844',
    lineHeight: 19,
  },
});
