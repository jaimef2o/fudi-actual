import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store';
import {
  useRestaurant,
  useRestaurantStats,
  useRecentVisits,
  useRelevantRestaurantIds,
  useFriendStats,
} from '../../lib/hooks/useRestaurant';
import { useFriendDishesForRestaurant } from '../../lib/hooks/useDishes';
import { useBookmark, useSavedRestaurants } from '../../lib/hooks/useVisit';
import { InfoTag } from '../../components/InfoTag';
import { COLORS } from '../../lib/theme/colors';
/** RecentVisit with corrected dishes type (API returns objects, not strings) */
type RecentVisitWithDishes = Omit<import('../../lib/api/restaurants').RecentVisit, 'dishes'> & {
  dishes: { name: string; highlighted: boolean }[];
  user: { id: string; name: string; handle?: string; avatar_url: string | null };
};
import { scorePalette, sentimentPalette } from '../../lib/sentimentColors';
import { getPlaceDetails, getPlaceExtendedInfo, resolvePhotoUrl, searchChainLocations } from '../../lib/api/places';
import type { PlaceExtendedInfo, ChainLocation } from '../../lib/api/places';
import { supabase } from '../../lib/supabase';
import { FadeIn, ScoreReveal } from '../../components/Animations';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function SentimentBadge({ sentiment }: { sentiment: 'loved' | 'fine' | 'disliked' | null }) {
  if (!sentiment) return null;
  const labels: Record<string, string> = { loved: 'Encantó', fine: 'Bien', disliked: 'No gustó' };
  const pal = sentimentPalette(sentiment);
  return (
    <View style={{ backgroundColor: pal.badgeBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 10, color: pal.badgeText }}>
        {labels[sentiment] ?? sentiment}
      </Text>
    </View>
  );
}

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const { mutateAsync: toggleBookmark } = useBookmark(currentUser?.id);
  const { data: savedRestaurants } = useSavedRestaurants(currentUser?.id);
  const isFavoritedFromDB = useMemo(
    () => (savedRestaurants ?? []).some((r) => {
      const rest = r.restaurant as { id: string } | null;
      return rest?.id === id;
    }),
    [savedRestaurants, id]
  );
  const [pendingFav, setPendingFav] = useState<boolean | null>(null);
  const isFavorited = pendingFav !== null ? pendingFav : isFavoritedFromDB;

  const { data: restaurant, isLoading: loadingRest, isError: restaurantError } = useRestaurant(id);
  const { data: globalStats } = useRestaurantStats(id);
  const { data: chainData } = useRelevantRestaurantIds(id);
  // Start loading with just [id] immediately, upgrade to full chain IDs when resolved
  const relevantIds = chainData?.ids ?? (id ? [id] : undefined);
  const { data: friendStatsData } = useFriendStats(relevantIds, currentUser?.id);
  const { data: recentVisitsRaw = [] } = useRecentVisits(relevantIds, currentUser?.id);
  const recentVisits = recentVisitsRaw as unknown as RecentVisitWithDishes[];
  const { data: friendDishes = [] } = useFriendDishesForRestaurant(relevantIds, currentUser?.id);

  const displayName = chainData?.chainName ?? restaurant?.name ?? '—';
  const cuisine = restaurant?.cuisine ?? null;
  const priceLevel = restaurant?.price_level != null ? String(restaurant.price_level) : null;
  const neighborhood = restaurant?.neighborhood ?? null;
  const city = restaurant?.city ?? null;

  const isChain = !!chainData?.chainName;

  // Chain locations from Google Places
  const [chainLocations, setChainLocations] = useState<ChainLocation[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const VISIBLE_LOCATIONS = 5;

  // Fetch ALL locations of the chain from Google Places (only for known chains)
  useEffect(() => {
    if (!isChain || !chainData?.chainName) {
      setChainLocations([]);
      return;
    }
    let cancelled = false;
    setLoadingLocations(true);
    searchChainLocations(chainData.chainName, 20).then((locs) => {
      if (!cancelled) {
        setChainLocations(locs);
        setLoadingLocations(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingLocations(false);
    });
    return () => { cancelled = true; };
  }, [chainData?.chainName, isChain]);

  // When selected location changes, re-fetch place info for that placeId
  useEffect(() => {
    if (!selectedPlaceId) return;
    setPlaceInfo(null);
    (async () => {
      try {
        const info = await getPlaceExtendedInfo(selectedPlaceId);
        if (info) setPlaceInfo(info);
      } catch {}
    })();
  }, [selectedPlaceId]);

  const [fetchedCover, setFetchedCover] = useState<string | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceExtendedInfo | null>(null);
  const dbCover = restaurant?.cover_image_url ?? null;
  const isBrokenUrl = dbCover ? dbCover.includes('places.googleapis.com') : false;
  const usableCover = isBrokenUrl ? null : dbCover;
  const coverImage = usableCover ?? fetchedCover;

  // Fetch cover photo from Google Places if missing or broken in DB
  useEffect(() => {
    if (usableCover || !restaurant || fetchedCover) return;
    const placeId = restaurant?.google_place_id;
    if (!placeId) return;
    (async () => {
      try {
        const details = await getPlaceDetails(placeId);
        const photoRef = details?.photos?.[0]?.photo_reference;
        if (photoRef) {
          const url = await resolvePhotoUrl(photoRef);
          if (url) {
            setFetchedCover(url);
            supabase.from('restaurants').update({ cover_image_url: url }).eq('id', id).then(() => {});
          }
        }
      } catch {}
    })();
  }, [usableCover, restaurant, id]);

  // Fetch extended info (hours, phone, website) from Google Places
  useEffect(() => {
    if (!restaurant || placeInfo) return;
    const placeId = restaurant?.google_place_id;
    if (!placeId) {
      // Use address from DB as fallback
      const addr = restaurant?.address;
      if (addr) setPlaceInfo({ address: addr });
      return;
    }
    (async () => {
      try {
        const info = await getPlaceExtendedInfo(placeId);
        if (info) {
          // Fall back to DB address if Google didn't return one
          if (!info.address) {
            info.address = restaurant?.address || undefined;
          }
          setPlaceInfo(info);
        }
      } catch {}
    })();
  }, [restaurant, id]);

  const friendScore = friendStatsData?.friendScore ?? null;
  const friendVisitCount = friendStatsData?.friendVisitCount ?? 0;
  const globalScore = globalStats?.avg_score ?? null;
  const globalVisitCount = globalStats?.visit_count ?? 0;
  const friendSavedCount = friendStatsData?.friendSavedCount ?? 0;

  // Derive unique friend count from mutual visits
  const mutualVisits = useMemo(
    () => recentVisits.filter((v) => v.is_mutual),
    [recentVisits]
  );
  const uniqueFriendCount = useMemo(() => {
    const ids = new Set(mutualVisits.map((v) => v.user_id));
    return ids.size;
  }, [mutualVisits]);

  const hasFriendVisits = mutualVisits.length > 0;
  const hasFriendDishes = friendDishes.length > 0;

  const friendPal = scorePalette(friendScore);

  // Sort state for friend visits
  const [sortMode, setSortMode] = useState<'recent' | 'rating' | 'affinity'>('recent');
  const [showAllVisits, setShowAllVisits] = useState(false);
  const sortedMutualVisits = useMemo(() => {
    const arr = [...mutualVisits];
    if (sortMode === 'rating') {
      arr.sort((a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0));
    } else if (sortMode === 'affinity') {
      // affinity sort — keep original order (API already sorted by relationship closeness)
    }
    // 'recent' is default order from API (visited_at DESC)
    return arr;
  }, [mutualVisits, sortMode]);

  // ─── Loading skeleton ───
  if (loadingRest) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={{ width: 120, height: 18, backgroundColor: COLORS.surfaceContainerHighest, borderRadius: 8 }} />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ height: 320, backgroundColor: COLORS.surfaceContainerHighest }} />
        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 12 }}>
          <View style={{ height: 16, width: '60%', backgroundColor: COLORS.surfaceContainerHighest, borderRadius: 8 }} />
          <View style={{ height: 12, width: '40%', backgroundColor: COLORS.surfaceContainer, borderRadius: 8 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {[1, 2].map((i) => (
              <View key={i} style={{ flex: 1, height: 80, backgroundColor: COLORS.surfaceContainer, borderRadius: 14 }} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ─── Not found ───
  if (!loadingRest && !restaurantError && !restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Restaurante</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
          <MaterialIcons name="restaurant" size={52} color={COLORS.outlineVariant} />
          <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, textAlign: 'center' }}>
            Restaurante no encontrado
          </Text>
          <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: COLORS.outline, textAlign: 'center' }}>
            Este restaurante no está en nuestra base de datos todavía.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.onPrimary }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Fixed Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{displayName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => Share.share({ title: displayName, message: `Echa un vistazo a ${displayName} en savry` })}
            activeOpacity={0.7}
            accessibilityLabel="Compartir restaurante"
            accessibilityRole="button"
          >
            <MaterialIcons name="ios-share" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              const next = !isFavorited;
              setPendingFav(next);
              try {
                if (id && currentUser?.id) {
                  await toggleBookmark({ restaurantId: id, save: next });
                  showToast(next ? 'Restaurante guardado' : 'Restaurante eliminado de guardados');
                }
              } catch (err: unknown) {
                setPendingFav(!next);
                const msg = err instanceof Error ? err.message : String(err);
                if (__DEV__) console.error('[savry:bookmark] toggle failed:', msg);
                showToast(`Error: ${msg.slice(0, 80)}`);
              } finally {
                setPendingFav(null);
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel={isFavorited ? 'Eliminar de guardados' : 'Guardar restaurante'}
            accessibilityRole="button"
          >
            <MaterialIcons
              name={isFavorited ? 'star' : 'star-border'}
              size={24}
              color={isFavorited ? COLORS.secondaryContainer : COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── SECTION 1: HERO ── */}
        <View style={s.hero}>
          {coverImage ? (
            <ExpoImage
              source={{ uri: coverImage }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="restaurant" size={64} color="rgba(199,239,72,0.2)" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(3,36,23,0.55)', 'rgba(3,36,23,0.92)']}
            style={s.heroGradient}
          />
          <View style={s.heroInfo}>
            <Text style={s.heroName}>{displayName}</Text>
            <View style={s.heroChips}>
              <InfoTag value={cuisine} />
              <InfoTag value={priceLevel} />
              {isChain ? (
                <InfoTag value="Múltiples ubicaciones" />
              ) : neighborhood && city && neighborhood.toLowerCase() !== city.toLowerCase() ? (
                <>
                  <InfoTag value={neighborhood} />
                  <InfoTag value={city} />
                </>
              ) : (
                <InfoTag value={neighborhood || city} />
              )}
            </View>
          </View>
        </View>

        {/* ── SECTION 2: BENTO STATS (2x2) ── */}
        <FadeIn delay={150} translateY={24}>
        <View style={s.bentoWrapper}>
          <View style={s.bentoGrid}>
            {/* Top-left: Tus amigos */}
            <View style={s.bentoCell}>
              <Text style={s.bentoCellLabel}>Tus amigos</Text>
              {hasFriendVisits ? (
                <>
                  <ScoreReveal delay={350}>
                  <Text style={[s.bentoCellValue, { fontSize: 32, color: friendPal.badgeText }]}>
                    {friendScore !== null ? friendScore.toFixed(1) : '—'}
                  </Text>
                  </ScoreReveal>
                  <Text style={s.bentoCellDetail}>
                    {uniqueFriendCount} amigo{uniqueFriendCount !== 1 ? 's' : ''} · {friendVisitCount} visita{friendVisitCount !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[s.bentoCellValue, { fontSize: 32, color: COLORS.outlineVariant }]}>—</Text>
                  <Text style={s.bentoCellDetail}>Ningún amigo ha ido aún</Text>
                </>
              )}
            </View>

            {/* Top-right: Global */}
            <View style={s.bentoCell}>
              <Text style={s.bentoCellLabel}>Global</Text>
              {globalVisitCount >= 1 ? (
                <>
                  <Text style={[s.bentoCellValue, { fontSize: 28, color: COLORS.onSurfaceVariant }]}>
                    {globalScore !== null ? globalScore.toFixed(1) : '—'}
                  </Text>
                  <Text style={s.bentoCellDetail}>
                    {globalVisitCount} visita{globalVisitCount !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[s.bentoCellValue, { fontSize: 28, color: COLORS.outlineVariant }]}>—</Text>
                  <Text style={s.bentoCellDetail}>Pocas visitas aún</Text>
                </>
              )}
            </View>

            {/* Bottom: Guardados — spans full width */}
            <View style={s.bentoCellWide}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="bookmark" size={16} color={COLORS.primary} />
                  {friendSavedCount > 0 ? (
                    <Text style={s.bentoCellLabel} numberOfLines={1}>Guardado por</Text>
                  ) : (
                    <Text style={[s.bentoCellLabel, { fontSize: 11 }]} numberOfLines={1}>Ningún amigo lo ha guardado</Text>
                  )}
                </View>
                {friendSavedCount > 0 && (
                  <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, marginTop: 2 }} numberOfLines={1}>
                    {friendSavedCount} {friendSavedCount === 1 ? 'amigo' : 'amigos'}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  s.saveBtn,
                  isFavorited && s.saveBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  const next = !isFavorited;
                  setPendingFav(next);
                  try {
                    if (id && currentUser?.id) {
                      await toggleBookmark({ restaurantId: id, save: next });
                      showToast(next ? 'Restaurante guardado' : 'Eliminado de guardados');
                    }
                  } catch {
                    setPendingFav(!next);
                  } finally {
                    setPendingFav(null);
                  }
                }}
              >
                <MaterialIcons
                  name={isFavorited ? 'bookmark' : 'bookmark-border'}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={s.saveBtnText}>
                  {isFavorited ? 'Guardado' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </FadeIn>

        {/* ── SECTION 3: FRIEND VISITS ── */}
        {hasFriendVisits && (
          <FadeIn delay={300} translateY={20}>
          <View style={s.friendVisitsSection}>
            <Text style={s.sectionTitle}>Últimas visitas de amigos</Text>

            {/* Sort chips — only if >=5 friend visits */}
            {mutualVisits.length >= 5 && (
              <View style={s.sortChips}>
                {(['recent', 'rating', 'affinity'] as const).map((mode) => {
                  const labels: Record<string, string> = {
                    recent: 'Reciente',
                    rating: 'Valoración',
                    affinity: 'Afinidad',
                  };
                  const active = sortMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[s.sortChip, active && s.sortChipActive]}
                      onPress={() => setSortMode(mode)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.sortChipText, active && s.sortChipTextActive]}>
                        {labels[mode]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Visit cards */}
            <View style={s.visitsList}>
              {(showAllVisits ? sortedMutualVisits : sortedMutualVisits.slice(0, 5)).map((visit, i) => {
                const pal = scorePalette(visit.rank_score);
                const dishes = visit.dishes ?? [];
                const visibleDishes = dishes.slice(0, 4);
                const extraDishCount = dishes.length - 4;

                return (
                  <TouchableOpacity
                    key={visit.id}
                    style={[
                      s.visitCard,
                      i < Math.min(sortedMutualVisits.length, 5) - 1 && s.visitCardBorder,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/visit/${visit.id}`)}
                  >
                    {/* Avatar */}
                    {visit.user?.avatar_url ? (
                      <ExpoImage
                        source={{ uri: visit.user.avatar_url }}
                        style={s.visitAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[s.visitAvatar, { backgroundColor: COLORS.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name="person" size={18} color={COLORS.outline} />
                      </View>
                    )}

                    {/* Content */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={s.visitHandle} numberOfLines={1}>
                          @{visit.user?.handle ?? visit.user?.name?.toLowerCase().replace(/\s+/g, '') ?? ''}
                        </Text>
                        <SentimentBadge sentiment={visit.sentiment} />
                      </View>
                      <Text style={s.visitTime}>{timeAgo(visit.visited_at)}</Text>

                      {/* Visit note / review */}
                      {visit.note ? (
                        <Text style={s.visitNote} numberOfLines={2}>"{visit.note}"</Text>
                      ) : null}

                      {/* Location name for chains */}
                      {visit.restaurant?.name && visit.restaurant.name !== displayName && (
                        <Text style={s.visitLocation} numberOfLines={1}>
                          {visit.restaurant.name}
                        </Text>
                      )}

                      {/* Dish chips */}
                      {dishes.length > 0 && (
                        <View style={s.dishChipsRow}>
                          {visibleDishes.map((d, di) => (
                            <View key={di} style={[s.dishChip, d.highlighted && s.dishChipHighlighted]}>
                              {d.highlighted && <Text style={s.dishChipStar}>★</Text>}
                              <Text
                                style={[s.dishChipText, d.highlighted && s.dishChipTextHighlighted]}
                                numberOfLines={1}
                              >
                                {d.name}
                              </Text>
                            </View>
                          ))}
                          {extraDishCount > 0 && (
                            <View style={s.dishChipMore}>
                              <Text style={s.dishChipMoreText}>+{extraDishCount}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Score */}
                    {visit.rank_score != null && (
                      <View style={[s.visitScore, { backgroundColor: pal.badgeBg }]}>
                        <Text style={[s.visitScoreText, { color: pal.badgeText }]}>
                          {visit.rank_score.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* "Ver todas" button if more than 5 */}
            {mutualVisits.length > 5 && (
              <TouchableOpacity
                style={s.verTodasBtn}
                activeOpacity={0.8}
                onPress={() => setShowAllVisits((prev) => !prev)}
              >
                <Text style={s.verTodasText}>{showAllVisits ? 'Ver menos' : 'Ver todas'}</Text>
                <MaterialIcons name={showAllVisits ? 'expand-less' : 'chevron-right'} size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
          </FadeIn>
        )}

        {/* ── SECTION 5: INFO DEL RESTAURANTE ── */}
        {(placeInfo || isChain) && (
          <FadeIn delay={400} translateY={20}>
          <View style={s.infoSection}>
            <Text style={s.infoTitle}>Info del restaurante</Text>

            {/* Location picker for franchise chains */}
            {isChain && (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={s.locationPicker}
                  activeOpacity={0.8}
                  onPress={() => setLocationPickerOpen(!locationPickerOpen)}
                >
                  <MaterialIcons name="store" size={18} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.locationPickerLabel}>Ubicación</Text>
                    <Text style={s.locationPickerValue} numberOfLines={1}>
                      {selectedPlaceId
                        ? (chainLocations.find(l => l.placeId === selectedPlaceId)?.name ?? displayName)
                        : 'Seleccionar ubicación'}
                    </Text>
                  </View>
                  {chainLocations.length > 0 && (
                    <View style={s.locationPickerBadge}>
                      <Text style={s.locationPickerBadgeText}>{chainLocations.length}</Text>
                    </View>
                  )}
                  <MaterialIcons
                    name={locationPickerOpen ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={COLORS.outline}
                  />
                </TouchableOpacity>

                {locationPickerOpen && (
                  <View style={s.locationDropdown}>
                    {loadingLocations ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 12, color: COLORS.outline, marginTop: 8 }}>
                          Buscando ubicaciones...
                        </Text>
                      </View>
                    ) : chainLocations.length === 0 ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: COLORS.outline }}>
                          No se encontraron ubicaciones
                        </Text>
                      </View>
                    ) : (
                      <>
                        {(showAllLocations ? chainLocations : chainLocations.slice(0, VISIBLE_LOCATIONS)).map((loc) => {
                          const isSelected = loc.placeId === selectedPlaceId;
                          return (
                            <TouchableOpacity
                              key={loc.placeId}
                              style={[s.locationOption, isSelected && s.locationOptionActive]}
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedPlaceId(loc.placeId);
                                setLocationPickerOpen(false);
                                setShowAllLocations(false);
                                if (Platform.OS !== 'web') Haptics.selectionAsync();
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[s.locationOptionName, isSelected && s.locationOptionNameActive]} numberOfLines={1}>
                                  {loc.name}
                                </Text>
                                {loc.address && (
                                  <Text style={s.locationOptionMeta} numberOfLines={1}>
                                    {loc.address}
                                  </Text>
                                )}
                              </View>
                              {isSelected && (
                                <MaterialIcons name="check-circle" size={18} color={COLORS.onSecondaryContainer} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        {!showAllLocations && chainLocations.length > VISIBLE_LOCATIONS && (
                          <TouchableOpacity
                            style={s.locationShowAll}
                            activeOpacity={0.7}
                            onPress={() => setShowAllLocations(true)}
                          >
                            <Text style={s.locationShowAllText}>
                              Ver todas ({chainLocations.length})
                            </Text>
                            <MaterialIcons name="expand-more" size={16} color={COLORS.onSecondaryContainer} />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Address */}
            {placeInfo?.address && (
              <TouchableOpacity
                style={s.infoRow}
                onPress={() => {
                  const url = placeInfo.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(placeInfo.address!)}`;
                  Linking.openURL(url);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="location-on" size={20} color={COLORS.outline} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoText}>{placeInfo.address}</Text>
                  <Text style={s.infoAction}>{'Cómo llegar →'}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Phone */}
            {placeInfo?.phone && (
              <TouchableOpacity
                style={s.infoRow}
                onPress={() => Linking.openURL(`tel:${placeInfo.phone}`)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="phone" size={20} color={COLORS.outline} />
                <Text style={s.infoText}>{placeInfo.phone}</Text>
              </TouchableOpacity>
            )}

            {/* Website */}
            {placeInfo?.website && (
              <TouchableOpacity
                style={s.infoRow}
                onPress={() => Linking.openURL(placeInfo.website!)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="language" size={20} color={COLORS.outline} />
                <Text style={[s.infoText, { color: COLORS.onSecondaryContainer }]} numberOfLines={1}>
                  {placeInfo.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Hours */}
            {placeInfo?.hours && placeInfo.hours.length > 0 && (
              <View style={s.infoRow}>
                <MaterialIcons name="schedule" size={20} color={COLORS.outline} />
                <View style={{ flex: 1 }}>
                  {placeInfo.hours.map((line, i) => (
                    <Text key={i} style={[s.infoText, { fontSize: 12, lineHeight: 20 }]}>{line}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
          </FadeIn>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 10, borderRadius: 999, minWidth: 44, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerTitle: {
    fontFamily: 'Manrope-Bold', fontSize: 18,
    color: COLORS.primary, flex: 1, textAlign: 'center',
  },
  scroll: { paddingTop: Platform.OS === 'ios' ? 108 : 88 },

  // ── Hero ──
  hero: { height: 320, position: 'relative' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
  heroInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 24,
  },
  heroName: {
    fontFamily: 'NotoSerif-Bold', fontSize: 24,
    color: COLORS.onPrimary, lineHeight: 30,
  },
  heroChips: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', gap: 6, marginTop: 10,
  },

  // ── Bento Stats ──
  bentoWrapper: {
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 16,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bentoCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  bentoCellWide: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoCellLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bentoCellValue: {
    fontFamily: 'NotoSerif-Bold',
    lineHeight: 38,
  },
  bentoCellDetail: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,
    minHeight: 44,
  },
  saveBtnActive: {
    backgroundColor: COLORS.secondaryContainer,
  },
  saveBtnText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: COLORS.primary,
  },

  // ── Friend Visits ──
  friendVisitsSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  sectionTitle: {
    fontFamily: 'NotoSerif-Bold', fontSize: 18, color: COLORS.primary, marginBottom: 16,
  },
  sortChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sortChip: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sortChipActive: {
    backgroundColor: COLORS.secondaryContainer,
  },
  sortChipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: COLORS.outline,
  },
  sortChipTextActive: {
    color: COLORS.onSecondaryContainer,
  },
  visitsList: { gap: 0 },
  visitCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14,
  },
  visitCardBorder: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(193,200,194,0.25)',
  },
  visitAvatar: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, borderColor: 'rgba(199,239,72,0.5)',
  },
  visitHandle: {
    fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.primary,
  },
  visitLocation: {
    fontFamily: 'Manrope-Regular', fontSize: 12, color: COLORS.onSurfaceVariant,
  },
  visitTime: { fontFamily: 'Manrope-Regular', fontSize: 11, color: COLORS.outline },
  visitNote: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  visitScore: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start', marginTop: 2,
  },
  visitScoreText: { fontFamily: 'NotoSerif-Bold', fontSize: 14 },

  // Dish chips
  dishChipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2,
  },
  dishChip: {
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 0,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  dishChipHighlighted: {
    backgroundColor: 'rgba(199,239,72,0.30)',
    borderColor: 'rgba(84,107,0,0.25)',
  },
  dishChipStar: {
    fontFamily: 'Manrope-Bold', fontSize: 10, color: COLORS.secondary,
  },
  dishChipText: { fontFamily: 'Manrope-Regular', fontSize: 11, color: COLORS.onSurfaceVariant },
  dishChipTextHighlighted: {
    color: COLORS.secondary, fontFamily: 'Manrope-SemiBold',
  },
  dishChipMore: {
    backgroundColor: COLORS.surfaceContainer, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  dishChipMoreText: {
    fontFamily: 'Manrope-SemiBold', fontSize: 11, color: COLORS.outline,
  },

  // Ver todas
  verTodasBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 14,
  },
  verTodasText: {
    fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.primary,
  },

  // ── Info del restaurante ──
  infoSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  infoTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193,200,194,0.2)',
  },
  infoText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: COLORS.onSurface,
    flex: 1,
  },
  infoAction: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: COLORS.onSecondaryContainer,
    marginTop: 4,
  },
  // ── Location picker (franchise) ──
  locationPicker: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0,
    borderColor: 'rgba(193,200,194,0.3)',
  },
  locationPickerLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 10,
    color: COLORS.outline,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  locationPickerValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 1,
  },
  locationPickerBadge: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  locationPickerBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
  },
  locationDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(193,200,194,0.3)',
    overflow: 'hidden' as const,
  },
  locationOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  locationOptionActive: {
    backgroundColor: 'rgba(199,239,72,0.1)',
  },
  locationOptionName: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: COLORS.primary,
  },
  locationOptionNameActive: {
    color: COLORS.onSecondaryContainer,
  },
  locationOptionMeta: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 1,
  },
  locationShowAll: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193,200,194,0.2)',
  },
  locationShowAllText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.onSecondaryContainer,
  },
});
