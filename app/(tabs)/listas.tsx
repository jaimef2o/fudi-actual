import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../../lib/utils/alerts';
import { useShimmer, RankingItemSkeleton, SavedItemSkeleton } from '../../components/SkeletonLoader';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { LocationFilterBar, LocationFilters, EMPTY_FILTERS } from '../../components/LocationFilterBar';
import { InfoTag } from '../../components/InfoTag';
import { useAppStore } from '../../store';
import { useUserRanking, useSavedRestaurants } from '../../lib/hooks/useVisit';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { extractPriceLabel } from '../../lib/api/places';
import { useQueryClient } from '@tanstack/react-query';

// ── DATA ────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = ['Más reciente', 'Mejor valorado', 'Nombre A-Z'];

// ── CIRCULAR SCORE ───────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const R = 20;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 10);
  const isHigh = score >= 7.5;
  return (
    <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={48} height={48} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={24} cy={24} r={R} stroke="#e6e2db" strokeWidth={4} fill="transparent" />
        <Circle
          cx={24} cy={24} r={R}
          stroke="#c7ef48"
          strokeWidth={4}
          fill="transparent"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.scoreCircleText, { color: isHigh ? '#516600' : '#032417' }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

// FilterSheet replaced by LocationFilterBar modal in MAIN component below

const fsStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,36,23,0.3)' },
  sheet: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#c1c8c2', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417' },
  reset: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#727973', textDecorationLine: 'underline' },
  sectionLabel: { fontFamily: 'Manrope-Bold', fontSize: 10, color: '#727973', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f7f3ec' },
  chipActive: { backgroundColor: '#c7ef48' },
  chipText: { fontFamily: 'Manrope-Medium', fontSize: 13, color: '#424844' },
  chipTextActive: { fontFamily: 'Manrope-Bold', color: '#546b00' },
  priceRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: '#f7f3ec', marginBottom: 8 },
  priceRowActive: { backgroundColor: '#c7ef48' },
  priceLabel: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#032417' },
  priceLabelActive: { color: '#546b00' },
  priceDesc: { fontFamily: 'Manrope-Regular', fontSize: 12, color: '#727973', marginTop: 2 },
  applyBtn: { marginTop: 20, backgroundColor: '#032417', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff' },
});

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function ListasScreen() {
  const [activeTab, setActiveTab] = useState<'ranking' | 'guardados'>('ranking');
  const [search, setSearch] = useState('');
  const [activeSort, setActiveSort] = useState('Más reciente');
  const [sortOpen, setSortOpen] = useState(false);
  const currentUser = useAppStore((s) => s.currentUser);
  const queryClient = useQueryClient();
  const { data: rankingData, isLoading: loadingRanking, refetch: refetchRanking } = useUserRanking(currentUser?.id);
  const { data: savedData, isLoading: loadingSaved, refetch: refetchSaved } = useSavedRestaurants(currentUser?.id);
  const shimmer = useShimmer();
  const [refreshing, setRefreshing] = useState(false);

  // Force-refetch both lists every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      refetchRanking();
      refetchSaved();
    }, [refetchRanking, refetchSaved])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchRanking(), refetchSaved()]);
    setRefreshing(false);
  }

  // Single filter objects — draft (inside modal) and applied (active on list)
  const [draftFilters, setDraftFilters] = useState<LocationFilters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<LocationFilters>({ ...EMPTY_FILTERS });
  const [filterOpen, setFilterOpen] = useState(false);

  const totalFilters =
    (appliedFilters.city.trim() !== '' ? 1 : 0) +
    appliedFilters.neighborhoods.length +
    appliedFilters.prices.length;

  function openFilter() {
    setDraftFilters({ ...appliedFilters });
    setFilterOpen(true);
  }

  function resetFilter() {
    setDraftFilters({ ...EMPTY_FILTERS });
  }

  function applyFilter() {
    setAppliedFilters({ ...draftFilters });
    setFilterOpen(false);
  }

  // Map real saved restaurant data
  const priceLabel = (level: number | null | undefined) => {
    if (level === 1) return '$';
    if (level === 2) return '$$';
    if (level === 3 || level === 4) return '$$$';
    return null;
  };

  function timeAgoSaved(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'hoy';
    if (days < 7) return `hace ${days}d`;
    if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
    return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
  }

  const savedItems = (savedData ?? []).map((item: any) => ({
    id: item.restaurant?.id ?? '',
    name: item.restaurant ? getDisplayName(item.restaurant, 'ranking') : (item.restaurant?.name ?? ''),
    cuisine: (item.restaurant?.cuisine ?? null) as string | null,
    price: extractPriceLabel(item.restaurant?.price_level) ?? item.restaurant?.price_level as string | null,
    neighborhood: item.restaurant?.neighborhood ?? '',
    city: (item.restaurant?.city ?? '') as string,
    image: item.restaurant?.cover_image_url ?? null,
    savedAt: item.added_at ? timeAgoSaved(item.added_at) : '',
  }));

  const filteredGuardados = savedItems
    .filter((r: any) => {
      const matchSearch =
        search === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.neighborhood.toLowerCase().includes(search.toLowerCase());
      const matchCity = appliedFilters.city.trim() === '' || r.city.toLowerCase().includes(appliedFilters.city.trim().toLowerCase());
      const matchNeighborhood = appliedFilters.neighborhoods.length === 0 || appliedFilters.neighborhoods.some((n: string) => r.neighborhood.toLowerCase().includes(n.toLowerCase()));
      const matchPrice = appliedFilters.prices.length === 0 || (r.price && appliedFilters.prices.includes(r.price));
      return matchSearch && matchCity && matchNeighborhood && matchPrice;
    })
    .sort((a: any, b: any) => {
      if (activeSort === 'Nombre A-Z') return a.name.localeCompare(b.name);
      return 0; // Más reciente — keep original order (most recently saved first)
    });

  // Map real ranking data to display format
  const realRanking = (rankingData ?? []).map((v: any) => ({
    id: v.restaurant?.id ?? v.id,
    visitId: v.id,
    rank: v.rank_position ?? 0,
    name: v.restaurant ? getDisplayName(v.restaurant, 'ranking') : (v.restaurant?.name ?? ''),
    cuisine: (v.restaurant?.cuisine ?? null) as string | null,
    price: extractPriceLabel(v.restaurant?.price_level) ?? v.restaurant?.price_level as string | null,
    neighborhood: v.restaurant?.neighborhood ?? '',
    city: (v.restaurant?.city ?? '') as string,
    score: v.rank_score ?? 0,
    image: v.restaurant?.cover_image_url ?? null,
    sentiment: v.sentiment ?? null,
  }));

  const filteredRanking = realRanking
    .filter((r) => {
      const matchSearch = search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.neighborhood.toLowerCase().includes(search.toLowerCase());
      const matchCity = appliedFilters.city.trim() === '' || r.city.toLowerCase().includes(appliedFilters.city.trim().toLowerCase());
      const matchNeighborhood = appliedFilters.neighborhoods.length === 0 || appliedFilters.neighborhoods.some((n) => r.neighborhood.toLowerCase().includes(n.toLowerCase()));
      return matchSearch && matchCity && matchNeighborhood;
    })
    .sort((a, b) => {
      if (activeSort === 'Mejor valorado') return b.score - a.score;
      if (activeSort === 'Nombre A-Z') return a.name.localeCompare(b.name);
      return a.rank - b.rank; // Más reciente → ranking position
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.rankBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/refine-ranking')}
        >
          <MaterialIcons name="tune" size={16} color="#032417" />
          <Text style={styles.rankBtnText}>Rank</Text>
        </TouchableOpacity>
        <Text style={styles.headerLogo}>Mis Listas</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          onPress={() => showAlert('Notificaciones', 'Las notificaciones push estarán disponibles pronto.')}
        >
          <MaterialIcons name="notifications-none" size={24} color="#032417" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#032417"
            colors={['#032417']}
          />
        }
      >
        {/* Editorial title */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleMain}>Mis Listas</Text>
          <Text style={styles.titleSub}>
            Tu ranking personal y tus restaurantes guardados.
          </Text>
        </View>

        {/* Sticky local tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ranking' && styles.tabActive]}
              onPress={() => { setActiveTab('ranking'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
            >
              <MaterialIcons
                name="format-list-numbered"
                size={15}
                color={activeTab === 'ranking' ? '#032417' : '#727973'}
              />
              <Text style={[styles.tabText, activeTab === 'ranking' && styles.tabTextActive]}>
                Ranking
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'guardados' && styles.tabActive]}
              onPress={() => { setActiveTab('guardados'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
            >
              <MaterialIcons
                name="favorite"
                size={15}
                color={activeTab === 'guardados' ? '#032417' : '#727973'}
              />
              <Text style={[styles.tabText, activeTab === 'guardados' && styles.tabTextActive]}>
                Guardados
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── RANKING TAB ── */}
        {activeTab === 'ranking' && (
          <View style={styles.rankingSection}>
            {loadingRanking && (
              <View style={{ gap: 0 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <RankingItemSkeleton key={i} shimmer={shimmer} />
                ))}
              </View>
            )}
            {!loadingRanking && filteredRanking.length === 0 && (
              <View style={styles.emptyRanking}>
                <MaterialIcons name="restaurant" size={36} color="#c1c8c2" />
                <Text style={styles.emptyRankingTitle}>
                  {(rankingData && rankingData.length === 0) ? 'Aún no has visitado nada' : 'Sin resultados'}
                </Text>
                <Text style={styles.emptyRankingText}>
                  {(rankingData && rankingData.length === 0)
                    ? 'Registra tu primera visita y empieza tu ranking personal.'
                    : 'Ningún restaurante coincide con tu búsqueda.'}
                </Text>
                {(rankingData && rankingData.length === 0) && (
                  <TouchableOpacity
                    style={{ marginTop: 16, backgroundColor: '#032417', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
                    onPress={() => router.push('/registrar-visita')}
                  >
                    <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#ffffff' }}>Registrar visita</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!loadingRanking && filteredRanking.map((item: any, idx: number) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.rankItem, idx === 0 && styles.rankItemTop]}
                activeOpacity={0.8}
                onPress={() => router.push(`/restaurant/${item.id}`)}
              >
                {/* Photo + rank badge */}
                <View style={styles.rankImageWrapper}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.rankImage} />
                  ) : (
                    <View style={[styles.rankImage, { backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }]}>
                      <MaterialIcons name="restaurant" size={24} color="#c1c8c2" />
                    </View>
                  )}
                  <View style={[
                    styles.rankBadge,
                    idx === 0 && styles.rankBadgeTop,
                  ]}>
                    <Text style={[
                      styles.rankBadgeText,
                      idx === 0 && styles.rankBadgeTextTop,
                    ]}>
                      #{idx + 1}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                  {(item.cuisine || item.price) ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                      <InfoTag value={item.cuisine} />
                      <InfoTag value={item.price} />
                    </View>
                  ) : null}
                </View>

                {/* Score circle */}
                <ScoreCircle score={item.score} />
              </TouchableOpacity>
            ))}

            {/* Quote editorial */}
            <View style={styles.quoteBlock}>
              <MaterialIcons name="format-quote" size={24} color="#c7ef48" />
              <Text style={styles.quoteText}>
                Tu paladar, tu criterio. Este es el orden que tú has decidido.
              </Text>
            </View>
          </View>
        )}

        {/* ── GUARDADOS TAB ── */}
        {activeTab === 'guardados' && (
          <View style={styles.guardadosSection}>
            {/* Search */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={18} color="#727973" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar restaurante..."
                  placeholderTextColor="rgba(114,121,115,0.6)"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={16} color="#727973" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Controls row */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.controlBtn, activeSort !== 'Más reciente' && styles.controlBtnActive]}
                onPress={() => setSortOpen(!sortOpen)}
                activeOpacity={0.75}
              >
                <MaterialIcons name="swap-vert" size={15} color={activeSort !== 'Más reciente' ? '#546b00' : '#424844'} />
                <Text style={[styles.controlBtnText, activeSort !== 'Más reciente' && styles.controlBtnTextActive]}>
                  {activeSort === 'Más reciente' ? 'Ordenar' : activeSort === 'Mejor valorado' ? 'Valoración' : 'A-Z'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, totalFilters > 0 && styles.controlBtnActive]}
                onPress={openFilter}
                activeOpacity={0.75}
              >
                <Text style={[styles.controlBtnText, totalFilters > 0 && styles.controlBtnTextActive]}>
                  Filtros{totalFilters > 0 ? ` (${totalFilters})` : ''}
                </Text>
                <MaterialIcons name="tune" size={15} color={totalFilters > 0 ? '#546b00' : '#424844'} />
              </TouchableOpacity>

              {(totalFilters > 0 || search.trim().length > 0 || activeSort !== 'Más reciente') && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setAppliedFilters({ ...EMPTY_FILTERS }); setSearch(''); setActiveSort('Más reciente'); }}
                >
                  <MaterialIcons name="close" size={14} color="#546b00" />
                </TouchableOpacity>
              )}
            </View>

            {/* Sort dropdown */}
            {sortOpen && (
              <View style={styles.sortDropdown}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.sortOption, activeSort === opt && styles.sortOptionActive]}
                    onPress={() => { setActiveSort(opt); setSortOpen(false); }}
                  >
                    <Text style={[styles.sortOptionText, activeSort === opt && styles.sortOptionTextActive]}>
                      {opt}
                    </Text>
                    {activeSort === opt && (
                      <MaterialIcons name="check" size={16} color="#546b00" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Active filter pills */}
            {(appliedFilters.city.trim() !== '' || appliedFilters.neighborhoods.length > 0 || appliedFilters.prices.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePillsRow}>
                {appliedFilters.city.trim() !== '' && (
                  <TouchableOpacity
                    style={[styles.activePill, { backgroundColor: '#1a3a2b' }]}
                    onPress={() => setAppliedFilters((prev) => ({ ...prev, city: '', neighborhoods: [] }))}
                  >
                    <MaterialIcons name="location-on" size={12} color="#c7ef48" />
                    <Text style={[styles.activePillText, { color: '#c7ef48' }]}>{appliedFilters.city}</Text>
                    <MaterialIcons name="close" size={12} color="#c7ef48" />
                  </TouchableOpacity>
                )}
                {appliedFilters.neighborhoods.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={styles.activePill}
                    onPress={() => setAppliedFilters((prev) => ({ ...prev, neighborhoods: prev.neighborhoods.filter((x) => x !== n) }))}
                  >
                    <Text style={styles.activePillText}>{n}</Text>
                    <MaterialIcons name="close" size={12} color="#546b00" />
                  </TouchableOpacity>
                ))}
                {appliedFilters.prices.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.activePill}
                    onPress={() => setAppliedFilters((prev) => ({ ...prev, prices: prev.prices.filter((x) => x !== p) }))}
                  >
                    <Text style={styles.activePillText}>{p}</Text>
                    <MaterialIcons name="close" size={12} color="#546b00" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Results count */}
            {loadingSaved ? (
              <View style={{ gap: 0, marginTop: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <SavedItemSkeleton key={i} shimmer={shimmer} />
                ))}
              </View>
            ) : (
              <Text style={styles.resultsCount}>
                {filteredGuardados.length} restaurante{filteredGuardados.length !== 1 ? 's' : ''} guardado{filteredGuardados.length !== 1 ? 's' : ''}
              </Text>
            )}

            {/* Saved list */}
            {!loadingSaved && savedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="bookmark-border" size={40} color="#c1c8c2" />
                <Text style={styles.emptyText}>Aún no has guardado ningún restaurante</Text>
                <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973', textAlign: 'center', marginTop: 4 }}>
                  Pulsa el icono del marcador en cualquier restaurante
                </Text>
              </View>
            ) : !loadingSaved && filteredGuardados.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={40} color="#c1c8c2" />
                <Text style={styles.emptyText}>Sin resultados</Text>
                <TouchableOpacity onPress={() => { setSearch(''); setAppliedFilters({ ...EMPTY_FILTERS }); }}>
                  <Text style={styles.emptyReset}>Quitar filtros</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.savedList}>
                {filteredGuardados.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.savedItem}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/restaurant/${item.id}`)}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.savedImage} />
                    ) : (
                      <View style={[styles.savedImage, { backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name="restaurant" size={22} color="#c1c8c2" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedName}>{item.name}</Text>
                      {(item.cuisine || item.price) ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                          <InfoTag value={item.cuisine} />
                          <InfoTag value={item.price} />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.savedRight}>
                      <Text style={styles.savedDate}>{item.savedAt}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter sheet modal */}
      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={fsStyles.backdrop} activeOpacity={1} onPress={() => setFilterOpen(false)} />
          <View style={fsStyles.sheet}>
            <View style={fsStyles.handle} />
            <View style={fsStyles.header}>
              <TouchableOpacity onPress={resetFilter}>
                <Text style={fsStyles.reset}>Resetear</Text>
              </TouchableOpacity>
              <Text style={fsStyles.title}>Filtros</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <MaterialIcons name="close" size={22} color="#032417" />
              </TouchableOpacity>
            </View>
            <LocationFilterBar filters={draftFilters} onChange={setDraftFilters} />
            <TouchableOpacity style={fsStyles.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
              <Text style={fsStyles.applyText}>Ver resultados</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.90)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  rankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#c7ef48',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  rankBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#032417',
  },
  headerLogo: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
  },
  titleBlock: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleMain: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 36,
    color: '#032417',
    lineHeight: 42,
  },
  titleSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    marginTop: 6,
    lineHeight: 20,
  },
  tabsWrapper: {
    backgroundColor: '#fdf9f2',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#727973',
  },
  tabTextActive: { color: '#032417' },

  // Ranking
  rankingSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  rankItemTop: {
    backgroundColor: '#fafff2',
    borderWidth: 1.5,
    borderColor: '#c7ef48',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  rankImageWrapper: {
    position: 'relative',
  },
  rankImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#ebe8e1',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rankBadgeTop: {
    backgroundColor: '#c7ef48',
    width: 28,
    height: 28,
    borderRadius: 14,
    top: -9,
    left: -9,
    shadowColor: '#546b00',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  rankBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 9,
    color: '#727973',
  },
  rankBadgeTextTop: {
    color: '#546b00',
    fontSize: 10,
  },
  rankName: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 17,
    color: '#032417',
    marginBottom: 5,
  },
  rankChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    backgroundColor: '#f1ede6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#424844',
  },
  chipPrice: {
    backgroundColor: '#eaf3d0',
  },
  chipPriceText: {
    color: '#546b00',
  },
  scoreCircleText: {
    position: 'absolute',
    fontFamily: 'NotoSerif-Bold',
    fontSize: 11,
  },
  emptyRanking: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyRankingTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 17,
    color: '#032417',
  },
  emptyRankingText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    textAlign: 'center',
  },
  quoteBlock: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  quoteText: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Guardados
  guardadosSection: {
    paddingTop: 12,
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f7f3ec',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#1c1c18',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f7f3ec',
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.3)',
  },
  controlBtnActive: {
    backgroundColor: '#c7ef48',
    borderColor: '#aed52e',
  },
  controlBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#424844',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controlBtnTextActive: {
    color: '#546b00',
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#c7ef48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDropdown: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 6,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sortOptionActive: { backgroundColor: '#f7f3ec' },
  sortOptionText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#424844',
  },
  sortOptionTextActive: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
  },
  activePillsRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#c7ef48',
  },
  activePillText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#546b00',
  },
  resultsCount: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  savedList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  savedImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  savedName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: '#032417',
    marginBottom: 5,
  },
  savedNeighborhood: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#727973',
    marginBottom: 6,
  },
  savedAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  savedAvatarText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#546b00',
    marginLeft: 8,
  },
  savedRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  savedScoreBadge: {
    backgroundColor: '#c7ef48',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  savedScoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 15,
    color: '#546b00',
  },
  savedDate: {
    fontFamily: 'Manrope-Regular',
    fontSize: 10,
    color: '#c1c8c2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
  },
  emptyReset: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
    textDecorationLine: 'underline',
  },
});
