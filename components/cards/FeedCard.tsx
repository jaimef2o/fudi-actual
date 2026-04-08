import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store';
import { useSavePost, useToggleReaction } from '../../lib/hooks/useVisit';
import type { FeedPost } from '../../lib/api/feed';
import { scorePalette } from '../../lib/sentimentColors';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { AnimatedCard } from '../AnimatedCard';
import { COLORS } from '../../lib/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────

type Frame = {
  url: string;
  kind: 'restaurant' | 'dish';
  dishName?: string;
  highlighted?: boolean;
};

// ─── ScoreBadge ──────────────────────────────────────────────────────────────

export function ScoreBadge({ score }: { score: number }) {
  const pal = useMemo(() => scorePalette(score), [score]);
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState('0.0');

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: score,
      duration: 900,
      delay: 120,
      useNativeDriver: false,
    }).start();
    const id = animVal.addListener(({ value }) => {
      setDisplayScore(value.toFixed(1));
    });
    return () => animVal.removeListener(id);
  }, [score]);

  return (
    <View style={[styles.scoreBadge, { backgroundColor: pal.badgeBg }]}>
      <Text style={[styles.scoreBadgeText, { color: pal.badgeText }]}>{displayScore}</Text>
    </View>
  );
}

// ─── RelationLabel ───────────────────────────────────────────────────────────

function RelationLabel({ isMutual }: { isMutual: boolean }) {
  return (
    <View style={{
      backgroundColor: isMutual ? 'rgba(199,239,72,0.40)' : COLORS.surfaceContainerHigh,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    }}>
      <Text style={{
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: isMutual ? COLORS.onSecondaryContainer : COLORS.outline,
      }}>
        {isMutual ? 'Amigo' : 'Siguiendo'}
      </Text>
    </View>
  );
}

// ─── FeedCard (formerly RealFeedCard) ────────────────────────────────────────

export const FeedCard = memo(function FeedCard({ post, currentUserId, showRelationLabel = true }: { post: FeedPost; currentUserId?: string; showRelationLabel?: boolean }) {
  const showToast = useAppStore((s) => s.showToast);
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  // ── Build ordered carousel frames: restaurant photos → dish photos ──────
  const frames: Frame[] = useMemo(() => {
    const restaurantPhotos = (post.photos ?? []).filter((p: any) => p.type === 'restaurant');
    const dishPhotos = (post.photos ?? [])
      .filter((p: any) => p.type === 'dish')
      .map((p: any) => {
        const dish = (post.dishes ?? []).find((d: any) => d.id === p.dish_id);
        return {
          url: p.photo_url as string,
          kind: 'dish' as const,
          dishName: dish?.name ?? '',
          highlighted: dish?.highlighted ?? false,
          position: dish?.position ?? 99,
        };
      })
      .sort((a: any, b: any) => {
        if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
        return a.position - b.position;
      });

    return [
      ...(restaurantPhotos.length > 0
        ? restaurantPhotos.map((p: any) => ({ url: p.photo_url, kind: 'restaurant' as const }))
        : post.restaurant?.cover_image_url
          ? [{ url: post.restaurant.cover_image_url, kind: 'restaurant' as const }]
          : []),
      ...dishPhotos,
    ];
  }, [post.photos, post.dishes, post.restaurant?.cover_image_url]);

  const [imgIndex, setImgIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setImgIndex(viewableItems[0].index);
    }
  }).current;
  const [postSaved, setPostSaved] = useState(false);
  const [likeActive, setLikeActive] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Initialize reaction state from real data
  useEffect(() => {
    const reactions = (post as any).reactions ?? [];
    const hungryReactions = reactions.filter((r: any) => r.emoji === 'hungry');
    setLikeCount(hungryReactions.length);
    const userReacted = hungryReactions.some((r: any) => r.user_id === currentUserId);
    setLikeActive(userReacted);
  }, [post, currentUserId]);

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
      Animated.spring(likeScale, { toValue: 1.35, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 12 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 20, bounciness: 6 }),
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
    const url = `https://savry.app/visit/${post.id}`;
    try {
      await (await import('react-native')).Share.share({
        message: `"${name}"${score != null ? ` — ${score.toFixed(1)}/10` : ''} en savry.\n${url}`,
        url,
        title: `${name} en savry`,
      });
    } catch {
      // dismissed
    }
  }

  const navigateToPost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/visit/${post.id}`);
  };

  return (
    <AnimatedCard style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
          onPress={() => router.push(`/profile/${post.user.id}`)}
          activeOpacity={0.75}
        >
          {post.user.avatar_url ? (
            <ExpoImage
              source={{ uri: post.user.avatar_url }}
              style={styles.userAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: COLORS.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="person" size={18} color={COLORS.outline} />
            </View>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.userName}>{post.user.name}</Text>
              {showRelationLabel && (post.is_mutual || (post as any)._iFollowAuthor) && (
                <RelationLabel isMutual={post.is_mutual} />
              )}
            </View>
            <Text style={styles.timeText}>{timeAgo(post.visited_at)}</Text>
          </View>
        </TouchableOpacity>
        {(post.rank_score ?? 0) > 0 && (
          <ScoreBadge score={post.rank_score!} />
        )}
      </View>

      {/* Image carousel — restaurant photos first, then dish photos */}
      {frames.length > 0 ? (
        <View style={{ aspectRatio: 1, width: '100%', overflow: 'hidden' }}>
          <FlatList
            data={frames}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH - 32,
              offset: (SCREEN_WIDTH - 32) * index,
              index,
            })}
            keyExtractor={(_, i) => String(i)}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item: frame }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={navigateToPost}
                delayPressIn={150}
                style={{ width: SCREEN_WIDTH - 32, aspectRatio: 1 }}
              >
                <ExpoImage
                  source={{ uri: frame.url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  recyclingKey={frame.url}
                />
                {/* Gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(3,36,23,0.45)', 'rgba(3,36,23,0.88)']}
                  style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', padding: 18, paddingBottom: frames.length > 1 ? 32 : 18 }]}
                  pointerEvents="none"
                >
                  {frame.kind === 'restaurant' ? (
                    <>
                      {post.restaurant.neighborhood ? (
                        <Text style={{ fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: COLORS.secondaryContainer, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>
                          {post.restaurant.neighborhood}
                        </Text>
                      ) : null}
                      <Text style={{ fontFamily: 'NotoSerif-BoldItalic', fontSize: 30, color: COLORS.onPrimary, lineHeight: 34 }} numberOfLines={2}>
                        {getDisplayName(post.restaurant as any, 'post')}
                      </Text>
                      {post.restaurant.cuisine ? (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>{post.restaurant.cuisine}</Text>
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {frame.highlighted && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                          <View style={{ backgroundColor: COLORS.secondaryContainer, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: COLORS.onSecondaryContainer, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                              Destacado
                            </Text>
                          </View>
                        </View>
                      )}
                      {frame.dishName ? (
                        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 22, color: COLORS.onPrimary, lineHeight: 27 }} numberOfLines={2}>
                          {frame.dishName}
                        </Text>
                      ) : null}
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          />

          {/* Pagination dots */}
          {frames.length > 1 && (
            <View style={[styles.dotsContainer, { position: 'absolute', bottom: 8, left: 0, right: 0, paddingVertical: 0 }]}>
              {frames.map((_: any, i: number) => (
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
          accessibilityLabel={likeActive ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <MaterialIcons
              name={likeActive ? 'favorite' : 'favorite-border'}
              size={24}
              color={likeActive ? COLORS.error : COLORS.onSurface}
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
          accessibilityLabel={postSaved ? 'Guardado' : 'Guardar publicación'}
        >
          <MaterialIcons
            name={postSaved ? 'bookmark-added' : 'bookmark-add'}
            size={20}
            color={postSaved ? COLORS.primary : COLORS.outline}
          />
        </TouchableOpacity>
      </View>

      {/* Caption + Dishes — tapping anywhere opens the post */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={navigateToPost}
      >
        {/* Author note / quote */}
        {!!post.note && (
          <View style={styles.quoteSection}>
            <View style={styles.quoteBorder} />
            <Text style={styles.quoteText} numberOfLines={3}>
              "{post.note}"
            </Text>
          </View>
        )}

        {post.dishes && post.dishes.length > 0 && (
          <View style={[styles.dishesSection, { paddingTop: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 3, height: 12, backgroundColor: COLORS.secondaryContainer, borderRadius: 2 }} />
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
                            ? <MaterialIcons name="star" size={11} color={COLORS.secondary} />
                            : <MaterialIcons name="restaurant" size={9} color={COLORS.outline} />
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

        {(!post.dishes || post.dishes.length === 0) && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 }}>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 12, color: COLORS.outlineVariant }}>
              Ver publicación →
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </AnimatedCard>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.onSurface,
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
    color: COLORS.onSurface,
    fontFamily: 'Manrope-Bold',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
    fontFamily: 'Manrope-Regular',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.onSurface,
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
    color: COLORS.secondaryContainer,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  restaurantNameText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: COLORS.onPrimary,
    lineHeight: 36,
  },
  cityText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },
  noPhotoBanner: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  noPhotoNeighborhood: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 2,
  },
  noPhotoName: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 18,
    color: COLORS.onSurface,
    lineHeight: 23,
  },
  noPhotoCuisine: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(3,36,23,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: COLORS.onSurface,
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
  dotActive: { backgroundColor: COLORS.primary },
  dotInactive: { backgroundColor: COLORS.outlineVariant },
  quoteSection: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 12,
  },
  quoteBorder: {
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.secondaryContainer,
  },
  quoteText: {
    flex: 1,
    fontFamily: 'NotoSerif-Italic',
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.onSurfaceVariant,
  },
  dishesSection: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: COLORS.outline,
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
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chipHighlighted: {
    backgroundColor: 'rgba(199,239,72,0.22)',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primary,
  },
  chipTextHighlighted: {
    color: COLORS.secondary,
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
    borderColor: COLORS.onPrimary,
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
    color: COLORS.onSurface,
  },
  likeCountActive: {
    color: COLORS.error,
  },
  saveBtn: {
    marginLeft: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: {
    backgroundColor: COLORS.secondaryContainer,
  },
  captionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  captionUsername: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 13,
    color: COLORS.onSurface,
  },
  captionText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 19,
  },
});
