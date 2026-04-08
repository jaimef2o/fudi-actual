import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { registerForPushNotifications, configureForegroundNotifications } from '../../lib/notifications';
import { BlurView } from 'expo-blur';
import { showAlert } from '../../lib/utils/alerts';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store';
import { COLORS } from '../../lib/theme/colors';
import { useFeed, useUserFeed, useForYouFeed } from '../../lib/hooks/useFeed';
import { useFollowRequests, useNewFollowers, useFollowUser, useRejectFollowRequest } from '../../lib/hooks/useProfile';
import { supabase } from '../../lib/supabase';
import { useShimmer, FeedCardSkeleton } from '../../components/SkeletonLoader';
import { FeedCard } from '../../components/cards/FeedCard';
import UserCard from '../../components/cards/UserCard';

// ─── Feed skeleton list (shown while loading) ─────────────────────────────────

function FeedSkeletonList() {
  const shimmer = useShimmer();
  return (
    <View style={{ gap: 16, paddingTop: 8 }}>
      <FeedCardSkeleton shimmer={shimmer} />
      <FeedCardSkeleton shimmer={shimmer} />
      <FeedCardSkeleton shimmer={shimmer} />
    </View>
  );
}

// ─── Notification dropdown panel ─────────────────────────────────────────────

function NotifPanel({
  visible,
  onClose,
  currentUserId,
  requests,
  newFollowers,
}: {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  requests: any[];
  newFollowers: any[];
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

  async function handleFollowBack(userId: string) {
    setBusyId(userId);
    try { await follow(userId); } catch { /* silent */ }
    finally { setBusyId(null); }
  }

  const totalCount = requests.length + newFollowers.length;

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
          {totalCount > 0 && (
            <View style={notifStyles.panelBadge}>
              <Text style={notifStyles.panelBadgeText}>{totalCount}</Text>
            </View>
          )}
        </View>

        {totalCount === 0 ? (
          <View style={notifStyles.emptyWrap}>
            <MaterialIcons name="notifications-none" size={32} color={COLORS.outlineVariant} />
            <Text style={notifStyles.emptyText}>Sin notificaciones</Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {/* Pending follow requests (private users) */}
            {requests.length > 0 && (
              <>
                <Text style={notifStyles.sectionLabel}>SOLICITUDES DE AMISTAD</Text>
                {requests.map((req: any) => (
                  <UserCard
                    key={req.id}
                    user={{ id: req.id, name: req.name, handle: req.handle, avatar_url: req.avatar_url }}
                    variant="follow-request"
                    compact
                    subtitle={req.handle ? `@${req.handle}` : 'Quiere seguirte'}
                    primaryLoading={busyId === req.id}
                    secondaryLoading={busyId === req.id}
                    onPrimaryAction={() => handleAccept(req.id)}
                    onSecondaryAction={() => handleReject(req.id)}
                    onNavigate={onClose}
                  />
                ))}
              </>
            )}

            {/* New followers (public users who followed you) */}
            {newFollowers.length > 0 && (
              <>
                <Text style={notifStyles.sectionLabel}>NUEVOS SEGUIDORES</Text>
                {newFollowers.map((follower: any) => (
                  <UserCard
                    key={follower.id}
                    user={{ id: follower.id, name: follower.name, handle: follower.handle, avatar_url: follower.avatar_url }}
                    variant="new-follower"
                    compact
                    primaryLoading={busyId === follower.id}
                    onPrimaryAction={() => handleFollowBack(follower.id)}
                    onNavigate={onClose}
                  />
                ))}
              </>
            )}
          </ScrollView>
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
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 20,
    paddingVertical: 16,
    shadowColor: COLORS.onSurface,
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
    color: COLORS.primary,
  },
  panelBadge: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  panelBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.outline,
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
    color: COLORS.outline,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  // Friends feed (chronological, mutuals only)
  const friendsFeed = useFeed(currentUser?.id);
  // "Para Ti" algorithmic feed (public posts ranked by relevance)
  const forYouFeed = useForYouFeed(currentUser?.id);
  // Also load own posts — shown when friends feed is empty
  const { data: ownData } = useUserFeed(currentUser?.id);
  const { data: followRequests } = useFollowRequests(currentUser?.id);
  const { data: newFollowersData } = useNewFollowers(currentUser?.id);
  const pendingRequestors = (followRequests ?? []).map((r: any) => r.requester).filter(Boolean);
  const newFollowersList = (newFollowersData ?? []).map((r: any) => r.requester).filter(Boolean);
  const totalNotifCount = pendingRequestors.length + newFollowersList.length;
  // Tab toggle: "Para ti" (algorithmic) vs "Solo amigos" (friends chronological)
  const [onlyMutual, setOnlyMutual] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Pick the active feed based on toggle
  const activeFeed = onlyMutual ? friendsFeed : forYouFeed;
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isError } = activeFeed;

  function handleAvatarLongPress() {
    showAlert(
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
  // Friends tab: show only mutual friends; Para Ti tab: show everything (already filtered by algorithm)
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
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Fixed glassmorphism header */}
      <BlurView intensity={70} tint="systemChromeMaterialLight" style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push(`/profile/${currentUser?.id}`)}
            onLongPress={handleAvatarLongPress}
            activeOpacity={0.7}
            accessibilityLabel="Mi perfil"
          >
            {currentUser?.avatar ? (
              <ExpoImage
                source={{ uri: currentUser.avatar }}
                style={styles.headerAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: COLORS.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="person" size={20} color={COLORS.outline} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.logoText}>savry</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
            style={{ position: 'relative', padding: 4 }}
            accessibilityLabel={totalNotifCount > 0 ? `${totalNotifCount} notificaciones` : 'Notificaciones'}
          >
            <MaterialIcons
              name={totalNotifCount > 0 ? 'notifications' : 'notifications-none'}
              size={26}
              color={COLORS.primary}
            />
            {totalNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {totalNotifCount > 9 ? '9+' : totalNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Para ti / Solo amigos toggle — X/Twitter style */}
        <View style={styles.feedToggleRow}>
          <TouchableOpacity
            onPress={() => { setOnlyMutual(false); Haptics.selectionAsync().catch(() => {}); }}
            style={styles.feedToggleTab}
            activeOpacity={0.7}
          >
            <Text style={[styles.feedToggleText, !onlyMutual && styles.feedToggleTextActive]}>
              Para ti
            </Text>
            {!onlyMutual && <View style={styles.feedToggleUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setOnlyMutual(true); Haptics.selectionAsync().catch(() => {}); }}
            style={styles.feedToggleTab}
            activeOpacity={0.7}
          >
            <Text style={[styles.feedToggleText, onlyMutual && styles.feedToggleTextActive]}>
              Solo amigos
            </Text>
            {onlyMutual && <View style={styles.feedToggleUnderline} />}
          </TouchableOpacity>
        </View>
      </BlurView>

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
            backgroundColor: COLORS.primary,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: COLORS.onSurface,
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <MaterialIcons name="arrow-upward" size={14} color={COLORS.secondaryContainer} />
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: COLORS.onPrimary }}>
            Nueva publicación
          </Text>
        </TouchableOpacity>
      )}

      {/* Feed list */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={COLORS.primary}
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
          <FeedSkeletonList />
        )}
        {/* Error state */}
        {isError && posts.length === 0 && (
          <View style={{ paddingTop: 60, alignItems: 'center', gap: 12, paddingHorizontal: 32 }}>
            <MaterialIcons name="wifi-off" size={48} color={COLORS.outlineVariant} />
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, textAlign: 'center' }}>
              Sin conexión
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: COLORS.outline, textAlign: 'center' }}>
              No se pudo cargar el feed. Comprueba tu conexión e inténtalo de nuevo.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, marginTop: 4 }}
              onPress={() => refetch()}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.onPrimary }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real friend posts */}
        {posts.length > 0 && posts.map((post) => (
          <FeedCard key={post.id} post={post} currentUserId={currentUser?.id} />
        ))}

        {/* Own posts when friends feed is empty but user has their own visits (only in "Solo amigos" tab) */}
        {onlyMutual && posts.length === 0 && !isLoading && ownPosts.length > 0 && (
          ownPosts.map((post) => (
            <FeedCard key={post.id} post={post} currentUserId={currentUser?.id} showRelationLabel={false} />
          ))
        )}

        {/* "Para Ti" empty state — no public content yet */}
        {!onlyMutual && posts.length === 0 && !isLoading && !isError && (
          <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="explore" size={32} color={COLORS.secondaryContainer} />
            </View>
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, textAlign: 'center' }}>
              Todavía no hay mucho por aquí...
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: COLORS.outline, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
              Cuando más gente comparta sus visitas, este feed se llenará de descubrimientos.
            </Text>
            <TouchableOpacity
              style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: COLORS.primary, marginTop: 8 }}
              onPress={() => router.push('/(tabs)/amigos')}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.onPrimary }}>Invitar amigos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* "Solo amigos" filter active but no mutual-friend posts (only when there ARE other posts to show) */}
        {onlyMutual && posts.length === 0 && allPosts.length > 0 && ownPosts.length > 0 && !isLoading && (
          <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surfaceContainer, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="people" size={32} color={COLORS.secondaryContainer} />
            </View>
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, textAlign: 'center' }}>
              Sin posts de amigos mutuos
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: COLORS.outline, textAlign: 'center', lineHeight: 20 }}>
              Tus amigos mutuos no han publicado nada aún. Prueba con "Para ti".
            </Text>
            <TouchableOpacity
              style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: COLORS.surfaceContainer, marginTop: 4 }}
              onPress={() => setOnlyMutual(false)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.primary }}>Ver todos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state when no posts at all (new user) — shown only in "Solo amigos" tab */}
        {onlyMutual && posts.length === 0 && ownPosts.length === 0 && !isLoading && (
          <View style={emptyStyles.container}>
            {/* Hero editorial — dark green card with logo */}
            <View style={emptyStyles.heroCard}>
              <Text style={emptyStyles.heroLogo}>savry</Text>
              <Text style={emptyStyles.heroTagline}>TASTE · RANK · SHARE</Text>
              <View style={emptyStyles.heroDivider} />
              <Text style={emptyStyles.heroSubtitle}>
                Tu diario gastronómico social. Descubre dónde comen tus amigos y construye tu ranking personal.
              </Text>
            </View>

            {/* 3 pasos para empezar */}
            <View style={emptyStyles.stepsCard}>
              <Text style={emptyStyles.stepsTitle}>Empieza en 3 pasos</Text>

              <View style={emptyStyles.stepRow}>
                <View style={emptyStyles.stepBadge}>
                  <Text style={emptyStyles.stepBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={emptyStyles.stepLabel}>Registra tu primera visita</Text>
                  <Text style={emptyStyles.stepDesc}>Elige un restaurante, valóralo y añade los platos que pediste.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.outlineVariant} />
              </View>

              <View style={emptyStyles.stepDivider} />

              <View style={emptyStyles.stepRow}>
                <View style={emptyStyles.stepBadge}>
                  <Text style={emptyStyles.stepBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={emptyStyles.stepLabel}>Añade amigos</Text>
                  <Text style={emptyStyles.stepDesc}>Busca a tus amigos o invítalos. Verás sus visitas aquí.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.outlineVariant} />
              </View>

              <View style={emptyStyles.stepDivider} />

              <View style={emptyStyles.stepRow}>
                <View style={emptyStyles.stepBadge}>
                  <Text style={emptyStyles.stepBadgeText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={emptyStyles.stepLabel}>Descubre restaurantes</Text>
                  <Text style={emptyStyles.stepDesc}>Explora las recomendaciones de tu círculo y acierta siempre.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.outlineVariant} />
              </View>
            </View>

            {/* CTAs */}
            <TouchableOpacity
              style={emptyStyles.ctaPrimary}
              onPress={() => router.push('/registrar-visita')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add-circle-outline" size={20} color={COLORS.onPrimary} />
              <Text style={emptyStyles.ctaPrimaryText}>Registrar primera visita</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={emptyStyles.ctaSecondary}
              onPress={() => router.push('/(tabs)/amigos')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="people-outline" size={20} color={COLORS.primary} />
              <Text style={emptyStyles.ctaSecondaryText}>Buscar amigos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={emptyStyles.ctaTertiary}
              onPress={() => router.push('/(tabs)/descubrir')}
              activeOpacity={0.7}
            >
              <Text style={emptyStyles.ctaTertiaryText}>Explorar restaurantes</Text>
              <MaterialIcons name="arrow-forward" size={16} color={COLORS.outline} />
            </TouchableOpacity>
          </View>
        )}
        {isFetchingNextPage && (
          <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 24 }} />
        )}
        {!hasNextPage && posts.length > 3 && (
          <Text style={{ textAlign: 'center', color: COLORS.outlineVariant, paddingVertical: 24, fontFamily: 'Manrope-Regular', fontSize: 12 }}>
            Has visto todas las publicaciones
          </Text>
        )}
      </ScrollView>

      {/* Notification dropdown */}
      {currentUser?.id && (
        <NotifPanel
          visible={notifOpen}
          onClose={() => setNotifOpen(false)}
          currentUserId={currentUser.id}
          requests={pendingRequestors}
          newFollowers={newFollowersList}
        />
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  heroCard: {
    width: '100%',
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },
  heroLogo: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 48,
    color: COLORS.surface,
    letterSpacing: -1,
  },
  heroTagline: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: COLORS.secondaryContainer,
    letterSpacing: 4,
    marginTop: 6,
  },
  heroDivider: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.secondaryContainer,
    opacity: 0.4,
    borderRadius: 1,
    marginVertical: 16,
  },
  heroSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: COLORS.onPrimaryContainer,
    lineHeight: 21,
    textAlign: 'center',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 4,
  },
  stepsTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: COLORS.primary,
  },
  stepLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: COLORS.primary,
  },
  stepDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: COLORS.outline,
    lineHeight: 18,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceContainer,
    marginVertical: 16,
    marginLeft: 46,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: '100%',
    marginTop: 4,
  },
  ctaPrimaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: COLORS.onPrimary,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.secondaryContainer,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    width: '100%',
  },
  ctaSecondaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: COLORS.primary,
  },
  ctaTertiary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  ctaTertiaryText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: COLORS.outline,
  },
});

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(253,249,242,0.60)',
    overflow: 'hidden' as const,
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
    color: COLORS.primary,
  },
  feedToggleUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    backgroundColor: COLORS.primary,
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
    fontSize: 26,
    color: COLORS.primary,
    fontFamily: 'NotoSerif-Bold',
    letterSpacing: -1,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  notifBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 9,
    color: COLORS.onPrimary,
  },
  feedContainer: {
    paddingTop: Platform.OS === 'ios' ? 152 : 132,
    paddingBottom: 110,
    paddingHorizontal: 16,
    gap: 24,
  },
});
