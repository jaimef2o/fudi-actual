import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useRestaurant, useRelevantRestaurantIds, useFriendStats } from '../../lib/hooks/useRestaurant';
import { useFriendDishesForRestaurant } from '../../lib/hooks/useDishes';
import { useAppStore } from '../../store';
import { getPlaceDetails, getPlaceExtendedInfo, resolvePhotoUrl } from '../../lib/api/places';
import type { PlaceExtendedInfo } from '../../lib/api/places';
import type { RestaurantRow } from '../../lib/database.types';
import type { FriendVisitDishes } from '../../lib/hooks/useDishes';
import { useState, useEffect } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? 'es' : ''}`;
}

function sentimentLabel(s: string | null): string {
  if (s === 'loved') return 'Loved';
  if (s === 'fine') return 'Fine';
  if (s === 'disliked') return 'Disliked';
  return '';
}

function sentimentColor(s: string | null): string {
  if (s === 'loved') return '#c7ef48';
  if (s === 'fine') return '#ebe8e1';
  if (s === 'disliked') return '#ba1a1a';
  return '#82a491';
}

function sentimentTextColor(s: string | null): string {
  if (s === 'loved') return '#032417';
  if (s === 'fine') return '#1c1c18';
  if (s === 'disliked') return '#ffffff';
  return '#032417';
}

const PRICE_NORMALIZE: Record<string, string> = {
  '1': '€', '2': '€€', '3': '€€€', '4': '€€€€',
};

function DarkInfoTag({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);
  const display = PRICE_NORMALIZE[str] ?? str;
  return (
    <View style={styles.infoTag}>
      <Text style={styles.infoTagText}>{display}</Text>
    </View>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useRestaurantPhotos(restaurantIds: string[] | undefined, restaurantName?: string, restaurantLocation?: string) {
  const ids = restaurantIds ?? [];
  return useQuery({
    queryKey: ['restaurantPhotosLabeled', ids],
    queryFn: async () => {
      const { data: visits } = await supabase
        .from('visits')
        .select('id')
        .in('restaurant_id', ids);
      if (!visits?.length) return [];
      const visitIds = visits.map((v) => v.id);
      const { data: photos } = await supabase
        .from('visit_photos')
        .select('photo_url, type, dish:visit_dishes!dish_id(name)')
        .in('visit_id', visitIds)
        .limit(10);
      return (photos ?? []).map((p) => ({
        url: p.photo_url,
        label: p.dish?.name ?? null,
        type: p.type ?? 'restaurant',
      }));
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JourneyBScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const currentUser = useAppStore((s) => s.currentUser);

  const isUuid = /^[0-9a-f-]{36}$/i.test(restaurantId ?? '');
  const { data: realRestaurant } = useRestaurant(isUuid ? restaurantId : undefined);
  const { data: chainData } = useRelevantRestaurantIds(isUuid ? restaurantId : undefined);
  // Start loading with just [restaurantId] immediately, upgrade to full chain IDs when resolved
  const relevantIds = chainData?.ids ?? (isUuid ? [restaurantId!] : undefined);

  const { data: friendVisits = [], isLoading: loadingDishes } = useFriendDishesForRestaurant(
    relevantIds,
    currentUser?.id
  );
  const { data: friendStats } = useFriendStats(relevantIds, currentUser?.id);

  const { data: visitPhotos = [] } = useRestaurantPhotos(relevantIds);
  const { width: screenWidth } = useWindowDimensions();

  // ─── Cover photo logic ───
  const dbCover = realRestaurant?.cover_image_url ?? null;
  const isBrokenUrl = dbCover ? dbCover.includes('places.googleapis.com') : false;
  const usableCover = isBrokenUrl ? null : dbCover;
  const [fetchedCover, setFetchedCover] = useState<string | null>(null);
  const coverImage = usableCover ?? fetchedCover;

  // ─── Extended place info ───
  const [placeInfo, setPlaceInfo] = useState<PlaceExtendedInfo | null>(null);

  useEffect(() => {
    if (usableCover || !realRestaurant || fetchedCover) return;
    const placeId = realRestaurant?.google_place_id;
    if (!placeId) return;
    (async () => {
      try {
        const details = await getPlaceDetails(placeId);
        const photoRef = details?.photos?.[0]?.photo_reference;
        if (photoRef) {
          const url = await resolvePhotoUrl(photoRef);
          if (url) {
            setFetchedCover(url);
            supabase.from('restaurants').update({ cover_image_url: url }).eq('id', restaurantId).then(() => {});
          }
        }
      } catch {}
    })();
  }, [usableCover, realRestaurant, restaurantId]);

  useEffect(() => {
    if (!realRestaurant || placeInfo) return;
    const placeId = realRestaurant?.google_place_id;
    if (!placeId) {
      const addr = realRestaurant?.address;
      if (addr) setPlaceInfo({ address: addr });
      return;
    }
    (async () => {
      try {
        const info = await getPlaceExtendedInfo(placeId);
        if (info) {
          if (!info.address) info.address = realRestaurant?.address || undefined;
          setPlaceInfo(info);
        }
      } catch {}
    })();
  }, [realRestaurant, restaurantId]);

  const restaurantName = chainData?.chainName ?? realRestaurant?.name ?? 'Restaurante';
  const friendVisitCount = friendStats?.friendVisitCount ?? 0;
  const cuisine = realRestaurant?.cuisine ?? null;
  const priceLevel = realRestaurant?.price_level != null ? String(realRestaurant.price_level) : null;
  const neighborhood = realRestaurant?.neighborhood ?? null;
  const city = realRestaurant?.city ?? null;
  const address = placeInfo?.address ?? realRestaurant?.address ?? null;

  // All gallery photos (user visit photos, excluding cover)
  const galleryPhotos = visitPhotos.filter((p) => p.url !== coverImage);

  return (
    <View style={styles.root}>
      {/* ── Body ── */}
      {loadingDishes ? (
        <ActivityIndicator size="large" color="#c7ef48" style={{ marginTop: 200 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ HERO — full-width cover image with overlay info ═══ */}
          <View style={styles.hero}>
            {coverImage ? (
              <ExpoImage
                source={{ uri: coverImage }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.heroPlaceholder]}>
                <MaterialIcons name="restaurant" size={64} color="rgba(199,239,72,0.15)" />
              </View>
            )}

            {/* Gradient overlay */}
            <LinearGradient
              colors={['rgba(3,36,23,0.10)', 'rgba(3,36,23,0.55)', 'rgba(3,36,23,0.95)']}
              style={styles.heroGradient}
            />

            {/* Back button overlay */}
            <View style={styles.heroHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.heroBackBtn}>
                <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Restaurant info overlay */}
            <View style={styles.heroInfo}>
              {/* Section label */}
              <View style={styles.heroLabel}>
                <MaterialIcons name="restaurant-menu" size={14} color="#c7ef48" />
                <Text style={styles.heroLabelText}>¿QUÉ PEDIMOS?</Text>
              </View>

              {/* Name */}
              <Text style={styles.heroName}>{restaurantName}</Text>

              {/* Location */}
              {address && (
                <View style={styles.heroAddress}>
                  <MaterialIcons name="location-on" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroAddressText} numberOfLines={1}>{address}</Text>
                </View>
              )}

              {/* Info chips */}
              <View style={styles.heroChips}>
                <DarkInfoTag value={cuisine} />
                <DarkInfoTag value={priceLevel} />
                {neighborhood && city && neighborhood.toLowerCase() !== city.toLowerCase() ? (
                  <>
                    <DarkInfoTag value={neighborhood} />
                    <DarkInfoTag value={city} />
                  </>
                ) : (
                  <DarkInfoTag value={neighborhood || city} />
                )}
              </View>

              {/* Friend stats pill */}
              {friendVisitCount > 0 && (
                <View style={styles.heroStatsPill}>
                  <MaterialIcons name="group" size={14} color="#c7ef48" />
                  <Text style={styles.heroStatsText}>
                    {friendVisitCount} amigo{friendVisitCount !== 1 ? 's' : ''} estuvi{friendVisitCount !== 1 ? 'eron' : 'o'} aquí
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ═══ PHOTO GALLERY (user visit photos) ═══ */}
          {galleryPhotos.length > 0 && (
            <View style={styles.gallerySection}>
              <View style={styles.gallerySectionHeader}>
                <MaterialIcons name="photo-library" size={16} color="#82a491" />
                <Text style={styles.gallerySectionTitle}>Fotos de visitas</Text>
                <Text style={styles.galleryCount}>{galleryPhotos.length}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryScroll}
                decelerationRate="fast"
                snapToInterval={screenWidth * 0.55 + 10}
              >
                {galleryPhotos.map((photo, i) => (
                  <View key={i} style={[styles.galleryImageContainer, { width: screenWidth * 0.55 }]}>
                    <ExpoImage
                      source={{ uri: photo.url }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                    {/* Label overlay */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.65)']}
                      style={styles.galleryLabelGradient}
                    >
                      <Text style={styles.galleryLabel} numberOfLines={1}>
                        {photo.label ?? restaurantName}
                      </Text>
                      {!photo.label && address && (
                        <Text style={styles.galleryLabelSub} numberOfLines={1}>
                          {neighborhood || city || address}
                        </Text>
                      )}
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ═══ SECTION TITLE ═══ */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lo que piden tus amigos</Text>
            <Text style={styles.sectionSub}>
              Basado en las recomendaciones de tu círculo más cercano.
            </Text>
          </View>

          {/* ═══ FRIEND VISITS + DISHES ═══ */}
          {friendVisits.length > 0 ? (
            friendVisits.map((fv, idx) => (
              <View key={fv.visitId}>
                {/* Friend section */}
                <View style={styles.friendSection}>
                  {/* Friend header row */}
                  <TouchableOpacity style={styles.friendHeader} activeOpacity={0.7} onPress={() => router.push(`/visit/${fv.visitId}`)}>
                    {fv.userAvatarUrl ? (
                      <Image source={{ uri: fv.userAvatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <MaterialIcons name="person" size={20} color="#82a491" />
                      </View>
                    )}
                    <View style={styles.friendMeta}>
                      <View style={styles.friendNameRow}>
                        <Text style={styles.friendName}>{fv.userName}</Text>
                        <Text style={styles.friendTimestamp}>
                          {' · '}{timeAgo(fv.visitedAt)}
                          {fv.sentiment ? ' · ' : ''}
                        </Text>
                        {fv.sentiment && (
                          <View
                            style={[
                              styles.sentimentBadge,
                              { backgroundColor: sentimentColor(fv.sentiment) },
                            ]}
                          >
                            <Text
                              style={[
                                styles.sentimentText,
                                { color: sentimentTextColor(fv.sentiment) },
                              ]}
                            >
                              {sentimentLabel(fv.sentiment)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>

                  {/* Dish list */}
                  <View style={styles.dishList}>
                    {fv.dishes.map((d, dIdx) => (
                      <View key={d.id ?? dIdx} style={styles.dishRow}>
                        {d.highlighted ? (
                          <Text style={styles.dishStar}>★</Text>
                        ) : (
                          <View style={styles.dishStarSpacer} />
                        )}
                        <Text
                          style={[
                            styles.dishName,
                            !d.highlighted && styles.dishNameMuted,
                          ]}
                          numberOfLines={1}
                        >
                          {d.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Divider between friend sections */}
                {idx < friendVisits.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="restaurant-menu" size={40} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyTitle}>
                Ningún amigo ha registrado platos aquí aún.
              </Text>
              <Text style={styles.emptySub}>
                Sé el primero en registrar tu visita.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#032417',
  },

  // Scroll body
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 148 : 120,
  },

  // ── Hero ──
  hero: {
    height: 380,
    position: 'relative',
  },
  heroPlaceholder: {
    backgroundColor: '#1a3a2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
  },
  heroHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  heroBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    gap: 8,
  },
  heroLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroLabelText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#c7ef48',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 34,
  },
  heroAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroAddressText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    flex: 1,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(199,239,72,0.12)',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  heroStatsText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#c7ef48',
  },

  // ── Info tags (dark variant) ──
  infoTag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  infoTagText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Gallery ──
  gallerySection: {
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  gallerySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  gallerySectionTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#82a491',
    flex: 1,
  },
  galleryCount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  galleryScroll: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 16,
  },
  galleryImageContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    position: 'relative' as const,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryLabelGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 30,
  },
  galleryLabel: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  galleryLabelSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },

  // ── Section header ──
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#ffffff',
    lineHeight: 26,
  },
  sectionSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#82a491',
    marginTop: 4,
  },

  // ── Friend section ──
  friendSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(130,164,145,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendMeta: {
    flex: 1,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 0,
  },
  friendName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  friendTimestamp: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#82a491',
  },
  sentimentBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 2,
  },
  sentimentText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
  },

  // Dish list
  dishList: {
    paddingLeft: 52, // avatar (40) + gap (12)
    gap: 6,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dishStar: {
    fontSize: 15,
    color: '#c7ef48',
    width: 18,
    textAlign: 'center',
  },
  dishStarSpacer: {
    width: 18,
  },
  dishName: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#ffffff',
    flex: 1,
  },
  dishNameMuted: {
    fontSize: 14,
    color: '#82a491',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },

});
