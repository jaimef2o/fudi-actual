import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import {
  useRestaurant,
  useRestaurantStats,
  useRecentVisits,
  useRelevantRestaurantIds,
  useFriendStats,
} from '../../lib/hooks/useRestaurant';
import { useBookmark } from '../../lib/hooks/useVisit';
import { InfoTag } from '../../components/InfoTag';
import { scorePalette } from '../../lib/sentimentColors';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function RelationLabel({ isMutual }: { isMutual: boolean }) {
  return (
    <View style={{
      backgroundColor: isMutual ? 'rgba(199,239,72,0.40)' : '#ebe8e1',
      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    }}>
      <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 10, color: isMutual ? '#546b00' : '#424844' }}>
        {isMutual ? 'Amigo' : 'Siguiendo'}
      </Text>
    </View>
  );
}

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFavorited, setIsFavorited] = useState(false);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast   = useAppStore((s) => s.showToast);
  const { mutateAsync: toggleBookmark } = useBookmark(currentUser?.id);

  const { data: restaurant, isLoading: loadingRest, isError: restaurantError } = useRestaurant(id);
  const { data: globalStats } = useRestaurantStats(id);
  const { data: chainData } = useRelevantRestaurantIds(id);
  const relevantIds = chainData?.ids;
  const { data: friendStatsData } = useFriendStats(relevantIds, currentUser?.id);
  const { data: recentVisits = [] } = useRecentVisits(relevantIds, currentUser?.id);

  const isChain = (relevantIds?.length ?? 0) > 1;
  const displayName = chainData?.chainName ?? restaurant?.name ?? '—';
  const locationDisplay = isChain ? 'Múltiples ubicaciones' : (restaurant?.neighborhood ?? restaurant?.city ?? null);
  const cuisine = (restaurant as any)?.cuisine as string | null ?? null;
  const priceLevel = (restaurant as any)?.price_level as string | null ?? null;
  const coverImage = (restaurant as any)?.cover_image_url as string | null ?? null;

  const friendScore = friendStatsData?.friendScore ?? null;
  const friendVisitCount = friendStatsData?.friendVisitCount ?? 0;
  const friendSavedCount = friendStatsData?.friendSavedCount ?? 0;
  const globalScore = globalStats?.avg_score ?? null;
  const globalVisitCount = globalStats?.visit_count ?? 0;
  const savedCount = globalStats?.saved_count ?? 0;

  const hasFriendData = friendVisitCount > 0 || !!friendScore;
  const [metricsMode, setMetricsMode] = useState<'friends' | 'global'>('friends');

  // Auto-switch to global if friend data loaded and there's none
  useEffect(() => {
    if (friendStatsData && !hasFriendData) setMetricsMode('global');
  }, [friendStatsData, hasFriendData]);

  // Visitors with avatars for the visit tile
  const friendVisitors = (recentVisits as any[]).filter((v) => v.is_mutual).slice(0, 3);

  const friendPal = scorePalette(friendScore);

  if (loadingRest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#032417" />
          </TouchableOpacity>
          <View style={{ width: 120, height: 18, backgroundColor: '#e6e2db', borderRadius: 8 }} />
          <View style={{ width: 40 }} />
        </View>
        {/* Skeleton hero */}
        <View style={{ height: 320, backgroundColor: '#e6e2db' }} />
        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 12 }}>
          <View style={{ height: 16, width: '60%', backgroundColor: '#e6e2db', borderRadius: 8 }} />
          <View style={{ height: 12, width: '40%', backgroundColor: '#f1ede6', borderRadius: 8 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {[1,2,3].map(i => <View key={i} style={{ flex: 1, height: 64, backgroundColor: '#f1ede6', borderRadius: 14 }} />)}
          </View>
        </View>
      </View>
    );
  }

  // Only show "not found" when the query definitively finished with no data (not an error/network issue)
  if (!loadingRest && !restaurantError && !restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#032417" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Restaurante</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
          <MaterialIcons name="restaurant" size={52} color="#c1c8c2" />
          <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' }}>
            Restaurante no encontrado
          </Text>
          <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center' }}>
            Este restaurante no está en nuestra base de datos todavía.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#032417', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#ffffff' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Fixed Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{displayName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => Share.share({ title: displayName, message: `Echa un vistazo a ${displayName} en fudi` })}
            activeOpacity={0.7}
          >
            <MaterialIcons name="ios-share" size={22} color="#032417" />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              const next = !isFavorited;
              setIsFavorited(next);
              try {
                if (id && currentUser?.id) {
                  await toggleBookmark({ restaurantId: id, save: next });
                  if (next) showToast('Restaurante añadido a guardados');
                }
              } catch { setIsFavorited(!next); }
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={isFavorited ? 'star' : 'star-border'}
              size={24}
              color={isFavorited ? '#c7ef48' : '#032417'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* ── SECCIÓN 1: HERO ── */}
        <View style={s.hero}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a3a2b', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="restaurant" size={64} color="rgba(199,239,72,0.2)" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(3,36,23,0.50)', 'rgba(3,36,23,0.92)']}
            style={s.heroGradient}
          />
          <View style={s.heroInfo}>
            {locationDisplay ? (
              <Text style={{ fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: '#c7ef48', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6 }}>
                {locationDisplay}
              </Text>
            ) : null}
            <Text style={s.heroName}>{displayName}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <InfoTag value={cuisine} />
              <InfoTag value={priceLevel} />
            </View>
          </View>
        </View>

        {/* ── SECCIÓN 2: STATS ── */}
        <View style={s.statsWrapper}>
          <View style={s.statsCard}>
            {/* Header: title + Amigos/Global toggle */}
            <View style={s.statsCardHeader}>
              <Text style={s.statsCardTitle}>Tu círculo</Text>
              <View style={s.metricsToggle}>
                <TouchableOpacity
                  style={[s.metricsToggleBtn, metricsMode === 'friends' && s.metricsToggleBtnActive]}
                  onPress={() => setMetricsMode('friends')}
                  activeOpacity={0.85}
                >
                  <Text style={[s.metricsToggleText, metricsMode === 'friends' && s.metricsToggleTextActive]}>
                    Amigos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.metricsToggleBtn, metricsMode === 'global' && s.metricsToggleBtnActive]}
                  onPress={() => setMetricsMode('global')}
                  activeOpacity={0.85}
                >
                  <Text style={[s.metricsToggleText, metricsMode === 'global' && s.metricsToggleTextActive]}>
                    Global
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Three metric tiles */}
            <View style={s.statsRow}>
              {/* ── Media ── */}
              <View style={s.statCell}>
                {(() => {
                  const val = metricsMode === 'friends' ? friendScore : globalScore;
                  const isHigh = val !== null && val >= 7.5;
                  const color = val === null ? '#c1c8c2' : isHigh ? '#516600' : '#032417';
                  const isFriend = metricsMode === 'friends' && !!friendScore;
                  const isLow = metricsMode === 'global' && globalVisitCount > 0 && globalVisitCount < 3;
                  return (
                    <>
                      <Text style={[s.statValue, { color }]}>
                        {val !== null ? val.toFixed(1) : '—'}
                      </Text>
                      <Text style={s.statLabel}>
                        {isLow ? 'POCOS DATOS' : 'MEDIA'}
                      </Text>
                      <Text style={[s.statSub, { color: isFriend ? '#546b00' : '#9ea8a0' }]}>
                        {isFriend ? 'de amigos' : 'en fudi'}
                      </Text>
                    </>
                  );
                })()}
              </View>

              <View style={s.statDivider} />

              {/* ── Visitas ── */}
              <View style={s.statCell}>
                {(() => {
                  const val = metricsMode === 'friends'
                    ? (friendVisitCount > 0 ? friendVisitCount : null)
                    : (globalVisitCount > 0 ? globalVisitCount : null);
                  const isFriend = metricsMode === 'friends' && friendVisitCount > 0;
                  return (
                    <>
                      {/* Avatar stack when showing friend visits */}
                      {isFriend && friendVisitors.length > 0 && (
                        <View style={s.avatarStack}>
                          {friendVisitors.map((v: any, i: number) =>
                            v.user?.avatar_url ? (
                              <Image
                                key={v.id ?? i}
                                source={{ uri: v.user.avatar_url }}
                                style={[s.stackAvatar, { marginLeft: i > 0 ? -7 : 0 }]}
                              />
                            ) : (
                              <View key={v.id ?? i} style={[s.stackAvatar, s.stackAvatarPlaceholder, { marginLeft: i > 0 ? -7 : 0 }]}>
                                <MaterialIcons name="person" size={8} color="#727973" />
                              </View>
                            )
                          )}
                          {friendVisitCount > 3 && (
                            <View style={[s.stackAvatar, s.stackAvatarMore, { marginLeft: -7 }]}>
                              <Text style={s.stackAvatarMoreText}>+{friendVisitCount - 3}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      <Text style={[s.statValue, { color: val !== null ? '#032417' : '#c1c8c2' }]}>
                        {val !== null ? val : '—'}
                      </Text>
                      <Text style={s.statLabel}>VISITAS</Text>
                      <Text style={[s.statSub, { color: isFriend ? '#546b00' : '#9ea8a0' }]}>
                        {isFriend ? 'de amigos' : 'en fudi'}
                      </Text>
                    </>
                  );
                })()}
              </View>

              <View style={s.statDivider} />

              {/* ── Guardados ── */}
              <View style={s.statCell}>
                {(() => {
                  const val = metricsMode === 'friends'
                    ? (friendSavedCount > 0 ? friendSavedCount : null)
                    : (savedCount > 0 ? savedCount : null);
                  const isFriend = metricsMode === 'friends' && friendSavedCount > 0;
                  return (
                    <>
                      <Text style={[s.statValue, { color: val !== null ? '#032417' : '#c1c8c2' }]}>
                        {val !== null ? val : '—'}
                      </Text>
                      <Text style={s.statLabel}>GUARDADOS</Text>
                      <Text style={[s.statSub, { color: isFriend ? '#546b00' : '#9ea8a0' }]}>
                        {isFriend ? 'de amigos' : 'en fudi'}
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>

            {/* Empty friend state */}
            {metricsMode === 'friends' && !hasFriendData && (
              <View style={s.statsEmptyFriends}>
                <MaterialIcons name="group-add" size={14} color="#c1c8c2" />
                <Text style={s.statsEmptyText}>Ningún amigo ha visitado aún</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── SECCIÓN 3: VISITAS RECIENTES ── */}
        <View style={s.visitsSection}>
          <Text style={s.sectionTitle}>
            {(recentVisits as any[]).some((v) => v.is_mutual)
              ? 'Lo que dicen tus amigos'
              : 'Visitas recientes en fudi'}
          </Text>
          {(recentVisits as any[]).length === 0 ? (
            <View style={s.emptyState}>
              <MaterialIcons name="people" size={32} color="#c1c8c2" />
              <Text style={s.emptyText}>Ningún amigo ha visitado este restaurante aún</Text>
            </View>
          ) : (
            <View style={s.visitsList}>
              {(recentVisits as any[]).slice(0, 5).map((visit, i) => {
                const pal = scorePalette(visit.rank_score);
                return (
                  <TouchableOpacity
                    key={visit.id}
                    style={[s.visitCard, i < Math.min((recentVisits as any[]).length, 5) - 1 && s.visitCardBorder]}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/visit/${visit.id}`)}
                  >
                    {/* Avatar */}
                    {visit.user?.avatar_url ? (
                      <Image source={{ uri: visit.user.avatar_url }} style={s.visitAvatar} />
                    ) : (
                      <View style={[s.visitAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name="person" size={18} color="#727973" />
                      </View>
                    )}

                    {/* Content */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.visitName} numberOfLines={1}>{visit.user?.name ?? ''}</Text>
                        <RelationLabel isMutual={visit.is_mutual} />
                      </View>
                      {visit.note ? (
                        <Text style={s.visitNote} numberOfLines={2}>"{visit.note}"</Text>
                      ) : null}
                      {visit.dishes && visit.dishes.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                          {(visit.dishes as any[]).slice(0, 4).map((d: any, di: number) => {
                            const name = typeof d === 'string' ? d : d.name;
                            const highlighted = typeof d === 'object' && d.highlighted;
                            return (
                              <View key={di} style={[s.dishChip, highlighted && s.dishChipHighlighted]}>
                                {highlighted && <Text style={s.dishChipStar}>★</Text>}
                                <Text style={[s.dishChipText, highlighted && s.dishChipTextHighlighted]} numberOfLines={1}>{name}</Text>
                              </View>
                            );
                          })}
                        </ScrollView>
                      )}
                      <Text style={s.visitTime}>{timeAgo(visit.visited_at)}</Text>
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
          )}
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={s.ctaWrapper}>
        <TouchableOpacity
          style={s.ctaBtn}
          activeOpacity={0.88}
          onPress={() => router.push(`/journey-b/${id}`)}
        >
          <MaterialIcons name="restaurant-menu" size={20} color="#ffffff" />
          <Text style={s.ctaBtnText}>¿Qué pedimos?</Text>
        </TouchableOpacity>
      </View>
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
  headerBtn: { padding: 8, borderRadius: 999 },
  headerTitle: {
    fontFamily: 'Manrope-Bold', fontSize: 18,
    color: '#032417', flex: 1, textAlign: 'center',
  },
  scroll: { paddingTop: Platform.OS === 'ios' ? 108 : 88 },

  // Hero
  hero: { height: 360, position: 'relative' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
  heroInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 22, paddingBottom: 32,
  },
  heroName: {
    fontFamily: 'NotoSerif-BoldItalic', fontSize: 32,
    color: '#ffffff', lineHeight: 38,
  },
  heroMeta: { fontFamily: 'Manrope-Regular', fontSize: 13, color: 'rgba(255,255,255,0.80)' },

  // Stats
  statsWrapper: {
    paddingHorizontal: 16,
    marginTop: -20,
    zIndex: 10,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statsCardTitle: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 15,
    color: '#032417',
  },
  metricsToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1ede6',
    borderRadius: 999,
    padding: 3,
  },
  metricsToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metricsToggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  metricsToggleText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: '#727973',
  },
  metricsToggleTextActive: {
    color: '#032417',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingBottom: 2,
  },
  statDivider: {
    width: 0,
    height: 0,
  },
  statValue: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    lineHeight: 34,
    color: '#032417',
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  statSub: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    marginTop: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    marginBottom: 5,
    height: 20,
  },
  stackAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stackAvatarPlaceholder: {
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarMore: {
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarMoreText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 7,
    color: '#727973',
  },
  statsEmptyFriends: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1ede6',
    marginTop: 14,
  },
  statsEmptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#c1c8c2',
  },

  // Dishes
  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionTitle: {
    fontFamily: 'NotoSerif-BoldItalic', fontSize: 20, color: '#032417', marginBottom: 16,
  },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center' },
  emptyBtn: { marginTop: 4, backgroundColor: '#c7ef48', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  emptyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#032417' },
  dishesList: { gap: 0 },
  dishRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12,
  },
  dishRowBorder: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(193,200,194,0.20)',
  },
  dishName: {
    fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#1c1c18',
  },
  dishFriend: {
    fontFamily: 'Manrope-SemiBold', fontSize: 12, color: '#516600',
  },
  dishGlobal: {
    fontFamily: 'Manrope-Regular', fontSize: 12, color: '#727973',
  },

  // Recent visits
  visitsSection: {
    backgroundColor: '#f7f3ec',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 28,
    padding: 20,
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
  visitName: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#032417' },
  visitNote: {
    fontFamily: 'NotoSerif-Italic', fontSize: 13,
    color: '#424844', lineHeight: 18,
  },
  dishChipHighlighted: {
    backgroundColor: 'rgba(199,239,72,0.30)',
    borderColor: 'rgba(84,107,0,0.25)',
  },
  dishChipStar: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#516600',
  },
  dishChipTextHighlighted: {
    color: '#516600',
    fontFamily: 'Manrope-SemiBold',
  },
  dishChip: {
    backgroundColor: '#ffffff', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  dishChipText: { fontFamily: 'Manrope-Regular', fontSize: 11, color: '#424844' },
  visitTime: { fontFamily: 'Manrope-Regular', fontSize: 11, color: '#727973', marginTop: 2 },
  visitScore: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start', marginTop: 2,
  },
  visitScoreText: { fontFamily: 'NotoSerif-Bold', fontSize: 14 },

  // CTA
  ctaWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 24, right: 24, zIndex: 60,
  },
  ctaBtn: {
    backgroundColor: '#032417',
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  ctaBtnText: { fontFamily: 'Manrope-Bold', fontSize: 17, color: '#ffffff' },
});
