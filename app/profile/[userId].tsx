import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { showAlert } from '../../lib/utils/alerts';
import { getTasteLevel, getProgressToNextLevel, visitsToNextLevel } from '../../lib/utils/tasteProfile';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { useProfile, useFriends, useRelationship, useFollowUser, useUnfollowUser, useFollowerCount, useFollowingCount } from '../../lib/hooks/useProfile';
import { useUserRanking } from '../../lib/hooks/useVisit';
import { useUserFeed } from '../../lib/hooks/useFeed';
import { InfoTag } from '../../components/InfoTag';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { extractPriceLabel } from '../../lib/api/places';
import { supabase } from '../../lib/supabase';
import { scorePalette } from '../../lib/sentimentColors';
import { COLORS } from '../../lib/theme/colors';

const { width } = Dimensions.get('window');
const GRID_CELL = (width - 4) / 3;


const RANK_COLORS = [COLORS.secondaryContainer, COLORS.surfaceContainerLow, COLORS.surfaceContainerLow];
const RANK_TEXT_COLORS = [COLORS.onSecondaryContainer, COLORS.primary, COLORS.primary];

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<'favoritos' | 'publicaciones'>('publicaciones');
  const [isFriend, setIsFriend] = useState(false);

  const currentUser = useAppStore((s) => s.currentUser);
  const isOwn = !userId || userId === 'me' || userId === currentUser?.id;
  const profileUserId = isOwn ? (currentUser?.id ?? '') : userId;

  // Always fetch real data for any user
  const { data: realProfile, isLoading: profileLoading } = useProfile(profileUserId || undefined);
  const { data: realRanking = [], isLoading: rankingLoading } = useUserRanking(profileUserId || undefined);
  const { data: userFeedData, isLoading: feedLoading } = useUserFeed(profileUserId || undefined);
  const { data: friendsList = [] } = useFriends(profileUserId || undefined);
  const { data: relationship } = useRelationship(currentUser?.id, isOwn ? undefined : profileUserId);
  const { mutateAsync: follow, isPending: following } = useFollowUser(currentUser?.id ?? '');
  const { mutateAsync: unfollow, isPending: unfollowing } = useUnfollowUser(currentUser?.id ?? '');
  const { data: followerCount = 0 } = useFollowerCount(profileUserId || undefined);
  const { data: followingCount = 0 } = useFollowingCount(profileUserId || undefined);

  // relationship is a RelationshipStatus: 'none' | 'pending' | 'following' | 'mutual'
  const relStatus = (relationship as string) ?? 'none';
  const isMutualFriend = relStatus === 'mutual';
  const isFollowing = relStatus === 'following' || relStatus === 'mutual';
  const isPending = relStatus === 'pending';

  // Build display data from real DB data — no mock fallbacks
  const profileName = (realProfile as any)?.name || 'Usuario';
  const profileCity = (realProfile as any)?.city ?? '';
  const profileBio = (realProfile as any)?.bio ?? '';
  const profileAvatar = (realProfile as any)?.avatar_url ?? null;
  const profileHandle = (realProfile as any)?.handle ?? null;

  const visitCount = realRanking.length;
  const tasteLevel = getTasteLevel(visitCount ?? 0);
  const progress = getProgressToNextLevel(visitCount ?? 0);
  const remaining = visitsToNextLevel(visitCount ?? 0);

  // Update taste_profile in DB if changed (fire-and-forget)
  useEffect(() => {
    if (isOwn && currentUser?.id && tasteLevel.name) {
      supabase
        .from('users')
        .update({ taste_profile: tasteLevel.name })
        .eq('id', currentUser.id)
        .then(() => {});
    }
  }, [tasteLevel.name, isOwn, currentUser?.id]);

  const avgScore = realRanking.length > 0
    ? Math.round((realRanking.reduce((s: number, v: any) => s + (v.rank_score ?? 0), 0) / realRanking.length) * 10) / 10
    : 0;

  const topRestaurants = realRanking.slice(0, 3).map((v: any, i: number) => ({
    id: v.restaurant?.id ?? i,
    name: v.restaurant ? getDisplayName(v.restaurant, 'ranking') : (v.restaurant?.name ?? '—'),
    neighborhood: [v.restaurant?.neighborhood, v.restaurant?.city].filter(Boolean).join(' · '),
    cuisine: (v.restaurant?.cuisine as string | null) ?? null,
    price: extractPriceLabel(v.restaurant?.price_level) ?? v.restaurant?.price_level as string | null,
    score: v.rank_score ?? 0,
    image: v.restaurant?.cover_image_url ?? null,
  }));

  // Publicaciones: all visits from the user's feed, each with cover image
  const allUserPosts = (userFeedData?.pages ?? []).flatMap((p) => p);
  const publicaciones = allUserPosts.map((post: any) => {
    const userPhoto = (post.photos ?? []).find((p: any) => p?.photo_url)?.photo_url ?? null;
    return {
      id: post.id,
      image: userPhoto,
      coverImage: post.restaurant?.cover_image_url ?? null,
      restaurantName: post.restaurant?.name ?? '',
      score: post.rank_score ?? null,
      note: (post.note as string | null) ?? null,
    };
  });


  async function handleLogout() {
    async function doLogout() {
      await supabase.auth.signOut();
      router.replace('/auth');
    }

    showAlert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
      ]
    );
  }

  async function handleFollowToggle() {
    if (!currentUser?.id || !profileUserId) return;

    if (isPending) {
      // Cancel pending request
      showAlert(
        'Cancelar solicitud',
        `¿Cancelar la solicitud de seguimiento a ${profileName}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Cancelar solicitud',
            style: 'destructive',
            onPress: async () => {
              try { await unfollow(profileUserId); } catch (e: any) {
                showAlert('Error', e.message ?? 'No se pudo completar la acción.');
              }
            },
          },
        ]
      );
    } else if (isFollowing) {
      showAlert(
        isMutualFriend ? 'Dejar de ser amigos' : 'Dejar de seguir',
        isMutualFriend
          ? `Si dejas de seguir a ${profileName}, dejaréis de ser amigos mutuos.`
          : `¿Dejar de seguir a ${profileName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Dejar de seguir',
            style: 'destructive',
            onPress: async () => {
              try { await unfollow(profileUserId); } catch (e: any) {
                showAlert('Error', e.message ?? 'No se pudo completar la acción.');
              }
            },
          },
        ]
      );
    } else {
      try { await follow(profileUserId); } catch (e: any) {
        showAlert('Error', e.message ?? 'No se pudo completar la acción.');
      }
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwn ? 'Perfil' : profileName}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (isOwn) {
              router.push('/settings');
            } else {
              Share.share({
                title: profileName,
                message: `Mira el perfil de ${profileName} en savry`,
              });
            }
          }}
        >
          <MaterialIcons
            name={isOwn ? 'settings' : 'ios-share'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Hero */}
        <View style={{ paddingTop: Platform.OS === 'ios' ? 120 : 100 }}>
          <View style={styles.profileHero}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, { backgroundColor: COLORS.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialIcons name="person" size={40} color={COLORS.outline} />
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{profileName}</Text>
            {profileHandle ? (
              <Text style={styles.profileHandle}>@{profileHandle}</Text>
            ) : null}
            {profileCity ? (
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={13} color={COLORS.outline} />
                <Text style={styles.locationInfoText}>{profileCity}</Text>
              </View>
            ) : null}
            {profileBio ? (
              <Text style={styles.profileBio}>{profileBio}</Text>
            ) : null}

            {/* Taste Profile Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tasteLevel.color,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}>
                <MaterialIcons name={tasteLevel.icon as any} size={14} color={tasteLevel.level >= 3 ? COLORS.onSecondaryContainer : COLORS.outline} />
                <Text style={{
                  fontFamily: 'Manrope-Bold',
                  fontSize: 11,
                  color: tasteLevel.level >= 3 ? COLORS.onSecondaryContainer : COLORS.outline,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {tasteLevel.name}
                </Text>
              </View>
            </View>

            {/* Progress to next level */}
            {remaining > 0 && (
              <View style={{ marginTop: 6, alignItems: 'center', gap: 4 }}>
                <View style={{ width: 120, height: 3, backgroundColor: COLORS.surfaceContainerHighest, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ width: `${progress * 100}%` as any, height: '100%', backgroundColor: COLORS.secondaryContainer, borderRadius: 2 }} />
                </View>
                <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 10, color: COLORS.outlineVariant }}>
                  {remaining} visitas para el siguiente nivel
                </Text>
              </View>
            )}

            {/* Action button */}
            {isOwn ? (
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/profile/edit')}
              >
                <Text style={styles.editBtnText}>Editar Perfil</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.connectBtn,
                  isMutualFriend ? styles.mutualBtn
                    : isPending ? styles.pendingBtn
                    : isFollowing ? styles.followingBtn
                    : null,
                ]}
                activeOpacity={0.8}
                onPress={handleFollowToggle}
                disabled={following || unfollowing}
              >
                {(following || unfollowing) ? (
                  <ActivityIndicator size="small" color={isFollowing || isPending ? COLORS.onSecondaryContainer : COLORS.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons
                      name={
                        isMutualFriend ? 'people'
                          : isPending ? 'schedule'
                          : isFollowing ? 'check'
                          : 'person-add'
                      }
                      size={17}
                      color={isMutualFriend || isPending ? COLORS.onSecondaryContainer : isFollowing ? COLORS.onSurfaceVariant : COLORS.onPrimary}
                    />
                    <Text style={[
                      styles.connectBtnText,
                      isMutualFriend && styles.mutualBtnText,
                      isPending && styles.pendingBtnText,
                      isFollowing && !isMutualFriend && styles.followingBtnText,
                    ]}>
                      {isMutualFriend ? 'Amigos'
                        : isPending ? 'Solicitado'
                        : isFollowing ? 'Siguiendo'
                        : 'Seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Map button */}
          {realRanking.length > 0 && (
            <TouchableOpacity
              style={styles.mapBtn}
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/map?userId=${profileUserId}` as any)}
            >
              <MaterialIcons name="map" size={18} color={COLORS.onSecondaryContainer} />
              <Text style={styles.mapBtnText}>Ver en mapa</Text>
              <MaterialIcons name="arrow-forward" size={16} color={COLORS.onSecondaryContainer} />
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{realRanking.length}</Text>
              <Text style={styles.statLabel}>VISITADOS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgScore > 0 ? avgScore.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>MEDIA</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push('/(tabs)/amigos')}>
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>SEGUIDORES</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push('/(tabs)/amigos')}>
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>SIGUIENDO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sticky tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'publicaciones' && styles.tabActive]}
              onPress={() => setActiveTab('publicaciones')}
            >
              <MaterialIcons
                name="grid-on"
                size={16}
                color={activeTab === 'publicaciones' ? COLORS.primary : COLORS.outline}
              />
              <Text style={[styles.tabText, activeTab === 'publicaciones' && styles.tabTextActive]}>
                Publicaciones
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'favoritos' && styles.tabActive]}
              onPress={() => setActiveTab('favoritos')}
            >
              <MaterialIcons
                name="bookmark"
                size={16}
                color={activeTab === 'favoritos' ? COLORS.primary : COLORS.outline}
              />
              <Text style={[styles.tabText, activeTab === 'favoritos' && styles.tabTextActive]}>
                Favoritos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab content */}
        {profileLoading || rankingLoading || feedLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'favoritos' ? (
          <FavoritosTab restaurants={topRestaurants} showRankingLink={isOwn} targetUserId={profileUserId} />
        ) : (
          <PublicacionesTab posts={publicaciones} isOwn={isOwn} userName={profileName} />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function FavoritosTab({
  restaurants,
  showRankingLink,
  targetUserId,
}: {
  restaurants: { id: string | number; name: string; neighborhood: string; cuisine: string | null; price?: string | null; score: number; image: string | null }[];
  showRankingLink: boolean;
  targetUserId: string;
}) {
  return (
    <View style={styles.favSection}>
      {restaurants.map((restaurant, idx) => (
        <TouchableOpacity
          key={restaurant.id}
          style={styles.favCard}
          activeOpacity={0.88}
          onPress={() => router.push(`/restaurant/${restaurant.id}`)}
        >
          <View style={styles.favImageWrapper}>
            {restaurant.image ? (
              <Image source={{ uri: restaurant.image }} style={styles.favImage} resizeMode="cover" />
            ) : (
              <View style={[styles.favImage, { backgroundColor: COLORS.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="restaurant" size={36} color={COLORS.outlineVariant} />
              </View>
            )}
            <View style={styles.favOverlay} />
            <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[idx] }]}>
              <Text style={[styles.rankBadgeText, { color: RANK_TEXT_COLORS[idx] }]}>
                #{idx + 1}
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>{restaurant.score.toFixed(1)}</Text>
            </View>
            <View style={styles.favInfoOverlay}>
              <Text style={styles.favName}>{getDisplayName(restaurant as any, 'ranking')}</Text>
              {(restaurant.cuisine || restaurant.price) ? (
                <View style={{ flexDirection: 'row', gap: 5, marginTop: 5 }}>
                  <InfoTag value={restaurant.cuisine} />
                  <InfoTag value={restaurant.price} />
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.verTodoBtn}
        activeOpacity={0.85}
        onPress={() => router.push(showRankingLink ? '/ranking' : (`/ranking?userId=${targetUserId}` as any))}
      >
        <MaterialIcons name="format-list-numbered" size={18} color={COLORS.primary} />
        <Text style={styles.verTodoBtnText}>
          {showRankingLink ? 'Ver mi historial completo' : 'Ver su historial completo'}
        </Text>
        <MaterialIcons name="arrow-forward" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function PublicacionesTab({ posts, isOwn, userName }: { posts: { id: string; image: string | null; coverImage: string | null; restaurantName: string; score: number | null; note: string | null }[]; isOwn: boolean; userName: string }) {
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  if (posts.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 }}>
        <MaterialIcons name="grid-on" size={40} color={COLORS.surfaceContainerHighest} />
        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 16, color: COLORS.primary, textAlign: 'center' }}>
          Sin publicaciones todavía
        </Text>
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: COLORS.outline, textAlign: 'center', lineHeight: 19 }}>
          {isOwn
            ? 'Tus visitas aparecerán aquí cuando registres una.'
            : `${userName} aún no ha publicado visitas.`}
        </Text>
        {isOwn && (
          <TouchableOpacity
            style={{ marginTop: 8, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
            onPress={() => router.push('/registrar-visita')}
          >
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.onPrimary }}>Registrar visita</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.gridWrapper}>
      {posts.map((post, idx) => {
        const imgUri = (post.image && !failedIds.has(post.id)) ? post.image : (post.coverImage ?? null);
        const pal = scorePalette(post.score);
        const hasScore = (post.score ?? 0) > 0;
        return (
        <TouchableOpacity
          key={post.id}
          style={[
            styles.gridCell,
            (idx + 1) % 3 !== 0 && { marginRight: 2 },
            idx < posts.length - 3 && { marginBottom: 2 },
          ]}
          activeOpacity={0.9}
          onPress={() => router.push(`/visit/${post.id}`)}
        >
          {imgUri ? (
            <View style={{ width: '100%', height: '100%' }}>
              <Image
                source={{ uri: imgUri }}
                style={styles.gridImage}
                resizeMode="cover"
                onError={() => {
                  if (post.image) setFailedIds((prev) => new Set(prev).add(post.id));
                }}
              />
              {hasScore && (
                <View style={[styles.gridScorePill, { backgroundColor: pal.badgeBg }]}>
                  <Text style={[styles.gridScoreText, { color: pal.badgeText }]}>{post.score!.toFixed(1)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.gridImagePlaceholder, { backgroundColor: pal.tint }]}>
              {hasScore && (
                <Text style={[styles.gridPlaceholderScore, { color: pal.badgeText, fontSize: 22, fontFamily: 'NotoSerif-Bold' }]}>
                  {post.score!.toFixed(1)}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: COLORS.primary,
  },

  // Hero
  profileHero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: COLORS.secondaryContainer,
  },
  affinityRing: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  affinityRingHigh: { backgroundColor: COLORS.secondaryContainer },
  affinityRingLow: { backgroundColor: COLORS.surfaceContainerHighest },
  profileName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 24,
    color: COLORS.primary,
  },
  profileLocation: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: COLORS.outline,
  },
  profileHandle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15,
    color: COLORS.secondary,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  cityPickerWrapper: {
    width: '100%',
    marginTop: 10,
    marginBottom: 4,
    zIndex: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationInfoText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: COLORS.outline,
  },
  profileBio: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  profileTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  // Affinity pill
  affinityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  affinityPillHigh: {
    backgroundColor: COLORS.secondaryContainer,
  },
  affinityPillLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: COLORS.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  affinityPillScore: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  affinityPillScoreHigh: {
    color: COLORS.onSecondaryContainer,
  },
  levelBadge: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: COLORS.primary,
  },

  // Map button
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 4,
  },
  mapBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: COLORS.onSecondaryContainer,
  },

  // Buttons
  editBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 8,
  },
  editBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: COLORS.onPrimary,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 4,
  },
  mutualBtn: {
    backgroundColor: COLORS.secondaryContainer,
  },
  pendingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.secondaryContainer,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceContainerHighest,
  },
  connectBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: COLORS.onPrimary,
  },
  mutualBtnText: {
    color: COLORS.onSecondaryContainer,
  },
  pendingBtnText: {
    color: COLORS.onSecondaryContainer,
  },
  followingBtnText: {
    color: COLORS.onSurfaceVariant,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: COLORS.primary,
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(193,200,194,0.3)',
    marginVertical: 4,
  },

  // En común
  // Tabs
  tabsWrapper: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.surfaceContainerLowest,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.outline,
  },
  tabTextActive: { color: COLORS.primary },

  // Favoritos
  favSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  favCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  favImageWrapper: { height: 180, position: 'relative' },
  favImage: { width: '100%', height: '100%' },
  favOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,36,23,0.50)',
  },
  rankBadge: {
    position: 'absolute',
    top: 14, left: 14,
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 13,
  },
  scoreBadge: {
    position: 'absolute',
    top: 14, right: 14,
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scoreBadgeText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: COLORS.onSecondaryContainer,
  },
  favInfoOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 16,
    gap: 2,
  },
  favCuisine: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.secondaryContainer,
    letterSpacing: 2,
  },
  favName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: COLORS.onPrimary,
    lineHeight: 28,
  },
  favNeighborhood: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  verTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  verTodoBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: COLORS.primary,
  },

  // Actividad grid
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  gridCell: {
    width: GRID_CELL,
    height: GRID_CELL,
  },
  gridImage: { width: '100%', height: '100%' },

  // Score pill — top-right over image
  gridScorePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridScoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
  },

  // Note overlay — bottom gradient + italic quote
  gridNoteOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(3,36,23,0.72)',
    paddingHorizontal: 7,
    paddingVertical: 8,
  },
  gridNoteText: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 9,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 13,
  },

  // No-photo placeholder — editorial card style
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
  },
  gridPlaceholderName: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 9,
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 13,
  },
  gridPlaceholderNote: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 8,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 12,
  },
  gridPlaceholderBadge: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  gridPlaceholderScore: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
  },
});
