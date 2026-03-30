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
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
// react-native-maps doesn't work on web — lazy import for native only
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {}
}
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store';
import { useDiscoverRestaurants } from '../../lib/hooks/useRestaurant';
import { scorePalette } from '../../lib/sentimentColors';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { LocationFilterBar, LocationFilters, EMPTY_FILTERS } from '../../components/LocationFilterBar';
import { InfoTag } from '../../components/InfoTag';
import { useShimmer, DiscoverCardSkeleton } from '../../components/SkeletonLoader';

// ── Screen ───────────────────────────────────────────────────────────────────
export default function DescubrirScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [mode, setMode] = useState<'amigos' | 'global'>('amigos');
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<LocationFilters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<LocationFilters>({ ...EMPTY_FILTERS });

  const activeFilterCount =
    (appliedFilters.city.trim() !== '' ? 1 : 0) +
    appliedFilters.neighborhoods.length +
    appliedFilters.prices.length;

  const { data: restaurants = [], isLoading, error, refetch } = useDiscoverRestaurants(
    currentUser?.id,
    mode,
    {
      city: appliedFilters.city || undefined,
      neighborhoods: appliedFilters.neighborhoods.length > 0 ? appliedFilters.neighborhoods : undefined,
      prices: appliedFilters.prices.length > 0 ? appliedFilters.prices : undefined,
      search: searchText.trim() || undefined,
      sortBy: appliedFilters.sortBy,
    }
  );
  const shimmer = useShimmer();
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Compute map region from restaurants that have coordinates
  const mapRegion = useMemo(() => {
    const withCoords = (restaurants as any[]).filter((r) => r.lat && r.lng);
    if (withCoords.length === 0) {
      return { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    const lats = withCoords.map((r) => Number(r.lat));
    const lngs = withCoords.map((r) => Number(r.lng));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.4),
    };
  }, [restaurants]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function openFilter() { setDraftFilters({ ...appliedFilters }); setFilterOpen(true); }
  function applyFilter() { setAppliedFilters({ ...draftFilters }); setFilterOpen(false); }
  function resetFilter() { setDraftFilters({ ...EMPTY_FILTERS }); }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Descubrir</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert('Notificaciones', 'Las notificaciones push estarán disponibles pronto.')}
        >
          <MaterialIcons name="notifications-none" size={24} color="#032417" />
        </TouchableOpacity>
      </View>

      {showMap ? (
        /* ── Map View ──────────────────────────────────────────────────────── */
        <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 108 : 88 }}>
          {/* Controls bar on top of map */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fdf9f2' }}>
            <View style={styles.controlsRow}>
              <View style={styles.toggle}>
                {(['amigos', 'global'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                    onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                  >
                    <MaterialIcons name={m === 'amigos' ? 'people' : 'public'} size={13} color={mode === m ? '#032417' : '#727973'} />
                    <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                      {m === 'amigos' ? 'Amigos' : 'Global'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.controlBtn, activeFilterCount > 0 && styles.controlBtnActive]}
                onPress={openFilter}
              >
                <Text style={[styles.controlBtnText, activeFilterCount > 0 && styles.controlBtnTextActive]}>
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Text>
                <MaterialIcons name="tune" size={15} color={activeFilterCount > 0 ? '#546b00' : '#424844'} />
              </TouchableOpacity>
            </View>

            {!isLoading && !error && (
              <Text style={[styles.contextLabel, { marginBottom: 0, marginTop: 4 }]}>
                {mode === 'amigos' ? 'Valoración media de tus amigos' : 'Valoración media global'}
                {' · '}{restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
          ) : (
            <MapView
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              region={mapRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {(restaurants as any[]).map((r) => {
                if (!r.lat || !r.lng) return null;
                const score = r.score ?? r.avg_score ?? r.friend_avg_score;
                return (
                  <Marker
                    key={r.id}
                    coordinate={{ latitude: Number(r.lat), longitude: Number(r.lng) }}
                    title={getDisplayName(r as any, 'search')}
                    description={score ? `${Number(score).toFixed(1)}/10` : undefined}
                    onCalloutPress={() => router.push(`/restaurant/${r.id}`)}
                  />
                );
              })}
            </MapView>
          )}
        </View>
      ) : (
        /* ── List View ─────────────────────────────────────────────────────── */
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
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
          {/* Search */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#727973" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar restaurante o zona..."
              placeholderTextColor="rgba(114,121,115,0.6)"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={18} color="#727973" />
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle + Filtros en una línea */}
          <View style={styles.controlsRow}>
            <View style={styles.toggle}>
              {(['amigos', 'global'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                  onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                >
                  <MaterialIcons name={m === 'amigos' ? 'people' : 'public'} size={13} color={mode === m ? '#032417' : '#727973'} />
                  <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                    {m === 'amigos' ? 'Amigos' : 'Global'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.controlBtn, activeFilterCount > 0 && styles.controlBtnActive]}
              onPress={openFilter}
            >
              <Text style={[styles.controlBtnText, activeFilterCount > 0 && styles.controlBtnTextActive]}>
                Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
              <MaterialIcons name="tune" size={15} color={activeFilterCount > 0 ? '#546b00' : '#424844'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, appliedFilters.sortBy !== 'rating' && styles.controlBtnActive]}
              onPress={() => setSortOpen(true)}
            >
              <MaterialIcons name="sort" size={15} color={appliedFilters.sortBy !== 'rating' ? '#546b00' : '#424844'} />
              <Text style={[styles.controlBtnText, appliedFilters.sortBy !== 'rating' && styles.controlBtnTextActive]}>
                {appliedFilters.sortBy === 'trending' ? 'Tendencia' : 'Valoración'}
              </Text>
            </TouchableOpacity>

            {(activeFilterCount > 0 || appliedFilters.sortBy !== 'rating' || searchText.trim().length > 0) && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setAppliedFilters({ ...EMPTY_FILTERS }); setSearchText(''); }}
              >
                <MaterialIcons name="close" size={14} color="#546b00" />
              </TouchableOpacity>
            )}
          </View>

          {/* Active pills */}
          {activeFilterCount > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePills} style={{ marginBottom: 12 }}>
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
                <TouchableOpacity key={n} style={styles.activePill} onPress={() => setAppliedFilters((prev) => ({ ...prev, neighborhoods: prev.neighborhoods.filter((x) => x !== n) }))}>
                  <Text style={styles.activePillText}>{n}</Text>
                  <MaterialIcons name="close" size={12} color="#546b00" />
                </TouchableOpacity>
              ))}
              {appliedFilters.prices.map((p) => (
                <TouchableOpacity key={p} style={styles.activePill} onPress={() => setAppliedFilters((prev) => ({ ...prev, prices: prev.prices.filter((x) => x !== p) }))}>
                  <Text style={styles.activePillText}>{p}</Text>
                  <MaterialIcons name="close" size={12} color="#546b00" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Context label */}
          {!isLoading && !error && (
            <Text style={styles.contextLabel}>
              {mode === 'amigos' ? 'Valoración media de tus amigos' : 'Valoración media global'}
              {' · '}{restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
            </Text>
          )}

          {/* Loading */}
          {isLoading && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <DiscoverCardSkeleton key={i} shimmer={shimmer} />
              ))}
            </View>
          )}

          {/* Error */}
          {error && !isLoading && (
            <View style={styles.emptyState}>
              <MaterialIcons name="wifi-off" size={48} color="#c1c8c2" />
              <Text style={styles.emptyText}>Error al cargar los restaurantes</Text>
            </View>
          )}

          {/* Empty state */}
          {!isLoading && !error && restaurants.length === 0 && (
            <View style={styles.emptyState}>
              {mode === 'amigos' ? (
                <>
                  <MaterialIcons name="group" size={48} color="#c1c8c2" />
                  <Text style={styles.emptyTitle}>Aún no hay datos de amigos</Text>
                  <Text style={styles.emptyText}>
                    Conecta con amigos o registra visitas para ver recomendaciones personalizadas.
                  </Text>
                </>
              ) : activeFilterCount > 0 || searchText.trim() ? (
                <>
                  <MaterialIcons name="search-off" size={48} color="#c1c8c2" />
                  <Text style={styles.emptyTitle}>Sin resultados</Text>
                  <Text style={styles.emptyText}>Prueba eliminando algún filtro.</Text>
                  <TouchableOpacity
                    onPress={() => { setAppliedFilters({ ...EMPTY_FILTERS }); setSearchText(''); }}
                    style={styles.emptyResetBtn}
                  >
                    <Text style={styles.emptyReset}>Quitar filtros</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <MaterialIcons name="restaurant" size={48} color="#c1c8c2" />
                  <Text style={styles.emptyTitle}>Aún no hay restaurantes</Text>
                  <Text style={styles.emptyText}>
                    Registra tus primeras visitas para ver el ranking global.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Restaurant list */}
          {!isLoading && !error && restaurants.length > 0 && (
            <View style={styles.list}>
              {(restaurants as any[]).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.card}
                  activeOpacity={0.88}
                  onPress={() => router.push(`/restaurant/${r.id}`)}
                >
                  <View style={styles.cardImageWrapper}>
                    {r.cover_image_url ? (
                      <Image source={{ uri: r.cover_image_url }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardImage, { backgroundColor: '#1a3a2b', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialIcons name="restaurant" size={40} color="rgba(199,239,72,0.4)" />
                      </View>
                    )}
                    <View style={styles.cardOverlay} />
                    {(() => {
                      const pal = scorePalette(r.score);
                      return (
                        <View style={[styles.cardScore, { backgroundColor: pal.badgeBg }]}>
                          <Text style={[styles.cardScoreText, { color: pal.badgeText }]}>{r.score.toFixed(1)}</Text>
                        </View>
                      );
                    })()}
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={2}>{getDisplayName(r as any, 'search')}</Text>
                      {(r.cuisine || r.price_level) ? (
                        <View style={{ flexDirection: 'row', gap: 5, marginTop: 5 }}>
                          <InfoTag value={r.cuisine} />
                          <InfoTag value={r.price_level} />
                        </View>
                      ) : null}
                      {r.visitCount > 0 && (
                        <View style={[styles.cardVisitsChip, { marginTop: 4 }]}>
                          <MaterialIcons name="star" size={11} color="#546b00" />
                          <Text style={styles.cardVisitsText}>
                            {r.visitCount} {r.visitCount === 1 ? 'visita' : 'visitas'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB — map/list toggle */}
      <TouchableOpacity
        style={styles.mapFab}
        activeOpacity={0.85}
        onPress={() => {
          setShowMap(!showMap);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }}
      >
        <MaterialIcons name={showMap ? 'list' : 'map'} size={24} color="#c7ef48" />
      </TouchableOpacity>

      {/* Sort modal */}
      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity style={fs.backdrop} activeOpacity={1} onPress={() => setSortOpen(false)} />
        <View style={fs.sheet}>
          <View style={fs.handle} />
          <View style={fs.sheetHeader}>
            <View style={{ width: 60 }} />
            <Text style={fs.sheetTitle}>Ordenar por</Text>
            <TouchableOpacity onPress={() => setSortOpen(false)}>
              <MaterialIcons name="close" size={22} color="#032417" />
            </TouchableOpacity>
          </View>
          {([['rating', 'Mejor valorado', 'star'], ['trending', 'En tendencia', 'trending-up']] as const).map(([val, label, icon]) => {
            const active = appliedFilters.sortBy === val;
            return (
              <TouchableOpacity
                key={val}
                style={[fs.sortOption, active && fs.sortOptionActive]}
                onPress={() => {
                  setAppliedFilters((prev) => ({ ...prev, sortBy: val as 'rating' | 'trending' }));
                  setSortOpen(false);
                }}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialIcons name={icon as any} size={20} color={active ? '#546b00' : '#424844'} />
                  <Text style={[fs.sortOptionText, active && fs.sortOptionTextActive]}>{label}</Text>
                </View>
                {active && <MaterialIcons name="check" size={20} color="#546b00" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* Filter modal */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={fs.backdrop} activeOpacity={1} onPress={() => setFilterOpen(false)} />
        <View style={fs.sheet}>
          <View style={fs.handle} />
          <View style={fs.sheetHeader}>
            <TouchableOpacity onPress={resetFilter}>
              <Text style={fs.resetText}>Resetear</Text>
            </TouchableOpacity>
            <Text style={fs.sheetTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setFilterOpen(false)}>
              <MaterialIcons name="close" size={22} color="#032417" />
            </TouchableOpacity>
          </View>
          <LocationFilterBar filters={draftFilters} onChange={setDraftFilters} />
          <TouchableOpacity style={fs.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
            <Text style={fs.applyBtnText}>Ver resultados</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const fs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#e6e2db', borderRadius: 2, alignSelf: 'center', marginVertical: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  sheetTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417' },
  resetText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#727973', textDecorationLine: 'underline' },
  applyBtn: { backgroundColor: '#032417', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  applyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.5 },
  sortOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: '#f7f3ec', marginBottom: 8,
  },
  sortOptionActive: { backgroundColor: '#c7ef48' },
  sortOptionText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#424844' },
  sortOptionTextActive: { color: '#546b00' },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(253,249,242,0.90)',
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417' },
  container: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f7f3ec', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 11, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Regular', color: '#1c1c18' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  toggle: { flexDirection: 'row', backgroundColor: '#ebe8e1', borderRadius: 999, padding: 3 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  toggleText: { fontFamily: 'Manrope-Bold', fontSize: 11, color: '#727973' },
  toggleTextActive: { color: '#032417' },
  controlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f7f3ec', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(193,200,194,0.3)',
  },
  controlBtnActive: { backgroundColor: '#c7ef48', borderColor: '#aed52e' },
  controlBtnText: { fontFamily: 'Manrope-Bold', fontSize: 11, color: '#424844', textTransform: 'uppercase', letterSpacing: 0.5 },
  controlBtnTextActive: { color: '#546b00' },
  clearBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: '#c7ef48', alignItems: 'center', justifyContent: 'center' },
  activePills: { gap: 8, paddingBottom: 4 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#c7ef48', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  activePillText: { fontFamily: 'Manrope-Bold', fontSize: 12, color: '#032417' },
  contextLabel: { fontFamily: 'Manrope-Medium', fontSize: 12, color: '#727973', marginBottom: 16, paddingHorizontal: 2 },
  loadingState: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 12 },
  emptyTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' },
  emptyText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 22 },
  emptyResetBtn: { marginTop: 4 },
  emptyReset: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#032417', textDecorationLine: 'underline' },
  list: { gap: 14 },
  card: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#1c1c18', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 5,
  },
  cardImageWrapper: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,36,23,0.52)' },
  cardScore: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  cardScoreText: { fontFamily: 'NotoSerif-Bold', fontSize: 17 },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 3 },
  cardCuisine: { fontFamily: 'Manrope-Bold', fontSize: 9, color: '#c7ef48', letterSpacing: 2 },
  cardName: { fontFamily: 'NotoSerif-Bold', fontSize: 22, color: '#ffffff', lineHeight: 28 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaText: { fontFamily: 'Manrope-Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  cardVisitsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#c7ef48', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 6 },
  cardVisitsText: { fontFamily: 'Manrope-Bold', fontSize: 10, color: '#546b00' },
  mapFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#032417',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 60,
  },
});
