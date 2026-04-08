import {
  View,
  Text,
  ScrollView,
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
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { MapView, Marker, Callout, MAPS_AVAILABLE } from '../../lib/maps';
import { scorePalette } from '../../lib/sentimentColors';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store';
import { COLORS } from '../../lib/theme/colors';
import { useDiscoverRestaurants } from '../../lib/hooks/useRestaurant';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { LocationFilterBar, LocationFilters, EMPTY_FILTERS } from '../../components/LocationFilterBar';
import { useShimmer, DiscoverCardSkeleton } from '../../components/SkeletonLoader';
import { StaggerItem } from '../../components/Animations';
import RestaurantCard from '../../components/cards/RestaurantCard';

const GRID_HORIZONTAL_PADDING = 20;
const GRID_GAP = 14;
const TARGET_CARD_WIDTH = 170; // ideal card width on mobile

function useGridLayout() {
  const { width } = useWindowDimensions();
  const availableWidth = width - GRID_HORIZONTAL_PADDING * 2;
  // Calculate how many columns fit at ~TARGET_CARD_WIDTH, minimum 2
  const cols = Math.max(2, Math.floor((availableWidth + GRID_GAP) / (TARGET_CARD_WIDTH + GRID_GAP)));
  const cardWidth = (availableWidth - (cols - 1) * GRID_GAP) / cols;
  // Cap image height so it doesn't get absurdly tall on large cards
  const imageHeight = Math.min(cardWidth * 1.15, 260);
  return { cols, cardWidth, imageHeight };
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function DescubrirScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [mode, setMode] = useState<'amigos' | 'global'>('amigos');
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const grid = useGridLayout();
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

  // Build individual map pins — expand chain restaurants into one pin per location
  type MapPin = {
    key: string;
    lat: number;
    lng: number;
    name: string;
    neighborhood: string | null;
    cuisine: string | null;
    score: number | null;
    visitCount: number;
    restaurantId: string;
  };

  const mapPins: MapPin[] = useMemo(() => {
    const pins: MapPin[] = [];
    for (const r of restaurants as any[]) {
      const score = r.score ?? r.avg_score ?? r.friend_avg_score ?? null;
      const numScore = score != null ? Number(score) : null;
      const name = getDisplayName(r as any, 'search');

      if (r._chainLocations && r._chainLocations.length > 0) {
        // Chain: create a pin for EACH location
        for (const loc of r._chainLocations) {
          if (!loc.lat || !loc.lng) continue;
          pins.push({
            key: `${r.id}-${loc.id}`,
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            name,
            neighborhood: loc.neighborhood,
            cuisine: r.cuisine ?? null,
            score: numScore,
            visitCount: r.visitCount ?? 0,
            restaurantId: loc.id,
          });
        }
      } else {
        // Independent or single-location chain
        if (!r.lat || !r.lng) continue;
        pins.push({
          key: r.id,
          lat: Number(r.lat),
          lng: Number(r.lng),
          name,
          neighborhood: r.neighborhood ?? null,
          cuisine: r.cuisine ?? null,
          score: numScore,
          visitCount: r.visitCount ?? 0,
          restaurantId: r.id,
        });
      }
    }
    return pins;
  }, [restaurants]);

  // Compute map region from all pins
  const mapRegion = useMemo(() => {
    if (mapPins.length === 0) {
      return { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    const lats = mapPins.map((p) => p.lat);
    const lngs = mapPins.map((p) => p.lng);
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
  }, [mapPins]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function openFilter() { setDraftFilters({ ...appliedFilters }); setFilterOpen(true); }
  function applyFilter() { setAppliedFilters({ ...draftFilters }); setFilterOpen(false); }
  function resetFilter() { setDraftFilters({ ...EMPTY_FILTERS }); }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Descubrir</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showAlert('Notificaciones', 'Las notificaciones push estarán disponibles pronto.')}
        >
          <MaterialIcons name="notifications-none" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {showMap ? (
        /* ── Map View ──────────────────────────────────────────────────────── */
        <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 108 : 88 }}>
          {/* Controls bar on top of map */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.surface }}>
            <View style={styles.controlsRow}>
              <View style={styles.toggle}>
                {(['amigos', 'global'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                    onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                  >
                    <MaterialIcons name={m === 'amigos' ? 'people' : 'public'} size={13} color={mode === m ? COLORS.primary : COLORS.outline} />
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
                <MaterialIcons name="tune" size={15} color={activeFilterCount > 0 ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant} />
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
          ) : !MAPS_AVAILABLE || !MapView ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <MaterialIcons name="map" size={48} color={COLORS.outlineVariant} />
              <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 15, color: COLORS.outline, marginTop: 12, textAlign: 'center' }}>
                El mapa no está disponible en la versión web
              </Text>
            </View>
          ) : (
            <MapView
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              region={mapRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {mapPins.map((pin) => {
                const pal = scorePalette(pin.score);
                const displayScore = pin.score != null ? pin.score.toFixed(1) : '—';
                return (
                  <Marker
                    key={pin.key}
                    coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                    onPress={() => router.push(`/restaurant/${pin.restaurantId}`)}
                    tracksViewChanges={false}
                  >
                    {/* Custom score pin */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{
                        backgroundColor: pal.badgeBg,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        shadowColor: COLORS.onSurface,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 4,
                        minWidth: 36,
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          fontFamily: 'NotoSerif-Bold',
                          fontSize: 13,
                          color: pal.badgeText,
                        }}>
                          {displayScore}
                        </Text>
                      </View>
                      {/* Pin tail */}
                      <View style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: 6,
                        borderRightWidth: 6,
                        borderTopWidth: 8,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: pal.badgeBg,
                        marginTop: -1,
                      }} />
                    </View>
                    {Callout ? (
                      <Callout tooltip onPress={() => router.push(`/restaurant/${pin.restaurantId}`)}>
                        <View style={{
                          backgroundColor: COLORS.surfaceContainerLowest,
                          borderRadius: 16,
                          padding: 14,
                          minWidth: 200,
                          maxWidth: 280,
                          shadowColor: COLORS.onSurface,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.12,
                          shadowRadius: 8,
                          elevation: 4,
                        }}>
                          <Text style={{
                            fontFamily: 'NotoSerif-Bold',
                            fontSize: 14,
                            color: COLORS.primary,
                          }} numberOfLines={1}>
                            {pin.name}
                          </Text>
                          {pin.neighborhood ? (
                            <Text style={{
                              fontFamily: 'Manrope-Regular',
                              fontSize: 11,
                              color: COLORS.outline,
                              marginTop: 2,
                            }}>
                              {pin.neighborhood}{pin.cuisine ? ` · ${pin.cuisine}` : ''}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <View style={{
                              backgroundColor: pal.badgeBg,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 8,
                            }}>
                              <Text style={{
                                fontFamily: 'NotoSerif-Bold',
                                fontSize: 13,
                                color: pal.badgeText,
                              }}>
                                {displayScore}
                              </Text>
                            </View>
                            {pin.visitCount > 0 ? (
                              <Text style={{
                                fontFamily: 'Manrope-Medium',
                                fontSize: 11,
                                color: COLORS.outline,
                              }}>
                                {pin.visitCount} visita{pin.visitCount !== 1 ? 's' : ''}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </Callout>
                    ) : null}
                  </Marker>
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
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Search */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={COLORS.outline} />
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
                <MaterialIcons name="close" size={18} color={COLORS.outline} />
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle + Filtros — horizontal scroll on mobile */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow} style={{ marginBottom: 12, flexGrow: 0 }}>
            <View style={styles.toggle}>
              {(['amigos', 'global'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                  onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                >
                  <MaterialIcons name={m === 'amigos' ? 'people' : 'public'} size={13} color={mode === m ? COLORS.primary : COLORS.outline} />
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
              <MaterialIcons name="tune" size={15} color={activeFilterCount > 0 ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, appliedFilters.sortBy !== 'rating' && styles.controlBtnActive]}
              onPress={() => setSortOpen(true)}
            >
              <MaterialIcons name="sort" size={15} color={appliedFilters.sortBy !== 'rating' ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant} />
              <Text style={[styles.controlBtnText, appliedFilters.sortBy !== 'rating' && styles.controlBtnTextActive]}>
                {appliedFilters.sortBy === 'trending' ? 'Tendencia' : 'Valoración'}
              </Text>
            </TouchableOpacity>

            {(activeFilterCount > 0 || appliedFilters.sortBy !== 'rating' || searchText.trim().length > 0) && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setAppliedFilters({ ...EMPTY_FILTERS }); setSearchText(''); }}
              >
                <MaterialIcons name="close" size={14} color={COLORS.onSecondaryContainer} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Active pills */}
          {activeFilterCount > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activePills} style={{ marginBottom: 12 }}>
              {appliedFilters.city.trim() !== '' && (
                <TouchableOpacity
                  style={[styles.activePill, { backgroundColor: COLORS.primaryContainer }]}
                  onPress={() => setAppliedFilters((prev) => ({ ...prev, city: '', neighborhoods: [] }))}
                >
                  <MaterialIcons name="location-on" size={12} color={COLORS.secondaryContainer} />
                  <Text style={[styles.activePillText, { color: COLORS.secondaryContainer }]}>{appliedFilters.city}</Text>
                  <MaterialIcons name="close" size={12} color={COLORS.secondaryContainer} />
                </TouchableOpacity>
              )}
              {appliedFilters.neighborhoods.map((n) => (
                <TouchableOpacity key={n} style={styles.activePill} onPress={() => setAppliedFilters((prev) => ({ ...prev, neighborhoods: prev.neighborhoods.filter((x) => x !== n) }))}>
                  <Text style={styles.activePillText}>{n}</Text>
                  <MaterialIcons name="close" size={12} color={COLORS.onSecondaryContainer} />
                </TouchableOpacity>
              ))}
              {appliedFilters.prices.map((p) => (
                <TouchableOpacity key={p} style={styles.activePill} onPress={() => setAppliedFilters((prev) => ({ ...prev, prices: prev.prices.filter((x) => x !== p) }))}>
                  <Text style={styles.activePillText}>{p}</Text>
                  <MaterialIcons name="close" size={12} color={COLORS.onSecondaryContainer} />
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
              <MaterialIcons name="wifi-off" size={48} color={COLORS.outlineVariant} />
              <Text style={styles.emptyText}>Error al cargar los restaurantes</Text>
            </View>
          )}

          {/* Empty state */}
          {!isLoading && !error && restaurants.length === 0 && (
            <View style={styles.emptyState}>
              {mode === 'amigos' ? (
                <>
                  <MaterialIcons name="group" size={48} color={COLORS.outlineVariant} />
                  <Text style={styles.emptyTitle}>Aún no hay datos de amigos</Text>
                  <Text style={styles.emptyText}>
                    Conecta con amigos o registra visitas para ver recomendaciones personalizadas.
                  </Text>
                </>
              ) : activeFilterCount > 0 || searchText.trim() ? (
                <>
                  <MaterialIcons name="search-off" size={48} color={COLORS.outlineVariant} />
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
                  <MaterialIcons name="restaurant" size={48} color={COLORS.outlineVariant} />
                  <Text style={styles.emptyTitle}>Aún no hay restaurantes</Text>
                  <Text style={styles.emptyText}>
                    Registra tus primeras visitas para ver el ranking global.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Restaurant grid — 2 columns */}
          {!isLoading && !error && restaurants.length > 0 && (
            <View style={styles.grid}>
              {(restaurants as any[]).map((r, idx) => (
                <StaggerItem key={r.id} index={idx} staggerMs={70}>
                  <RestaurantCard
                    restaurant={r}
                    friendAvatars={r.friendAvatars}
                    cardWidth={grid.cardWidth}
                    imageHeight={grid.imageHeight}
                    onPress={() => router.push(`/restaurant/${r.id}`)}
                  />
                </StaggerItem>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB — map/list toggle (hidden on web where maps aren't available) */}
      {MAPS_AVAILABLE && (
        <TouchableOpacity
          style={styles.mapFab}
          activeOpacity={0.85}
          onPress={() => {
            setShowMap(!showMap);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
        >
          <MaterialIcons name={showMap ? 'list' : 'map'} size={24} color={COLORS.secondaryContainer} />
        </TouchableOpacity>
      )}

      {/* Sort modal */}
      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity style={fs.backdrop} activeOpacity={1} onPress={() => setSortOpen(false)} />
        <View style={fs.sheet}>
          <View style={fs.handle} />
          <View style={fs.sheetHeader}>
            <View style={{ width: 60 }} />
            <Text style={fs.sheetTitle}>Ordenar por</Text>
            <TouchableOpacity onPress={() => setSortOpen(false)}>
              <MaterialIcons name="close" size={22} color={COLORS.primary} />
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
                  <MaterialIcons name={icon as any} size={20} color={active ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant} />
                  <Text style={[fs.sortOptionText, active && fs.sortOptionTextActive]}>{label}</Text>
                </View>
                {active && <MaterialIcons name="check" size={20} color={COLORS.onSecondaryContainer} />}
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
              <MaterialIcons name="close" size={22} color={COLORS.primary} />
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
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.surfaceContainerHighest, borderRadius: 2, alignSelf: 'center', marginVertical: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  sheetTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary },
  resetText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: COLORS.outline, textDecorationLine: 'underline' },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  applyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: COLORS.onPrimary, letterSpacing: 0.5 },
  sortOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: COLORS.surfaceContainerLow, marginBottom: 8,
  },
  sortOptionActive: { backgroundColor: COLORS.secondaryContainer },
  sortOptionText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: COLORS.onSurfaceVariant },
  sortOptionTextActive: { color: COLORS.onSecondaryContainer },
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
  headerTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary },
  container: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surfaceContainerLow, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 11, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Regular', color: COLORS.onSurface },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { flexDirection: 'row', backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 999, padding: 3 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: COLORS.surfaceContainerLowest, shadowColor: COLORS.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  toggleText: { fontFamily: 'Manrope-Bold', fontSize: 11, color: COLORS.outline },
  toggleTextActive: { color: COLORS.primary },
  controlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceContainerLow, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(193,200,194,0.3)',
  },
  controlBtnActive: { backgroundColor: COLORS.secondaryContainer, borderColor: COLORS.secondaryFixedDim },
  controlBtnText: { fontFamily: 'Manrope-Bold', fontSize: 11, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  controlBtnTextActive: { color: COLORS.onSecondaryContainer },
  clearBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: COLORS.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  activePills: { gap: 8, paddingBottom: 4 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  activePillText: { fontFamily: 'Manrope-Bold', fontSize: 12, color: COLORS.primary },
  contextLabel: { fontFamily: 'Manrope-Medium', fontSize: 12, color: COLORS.outline, marginBottom: 16, paddingHorizontal: 2 },
  loadingState: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: COLORS.outline },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 12 },
  emptyTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, textAlign: 'center' },
  emptyText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: COLORS.outline, textAlign: 'center', lineHeight: 22 },
  emptyResetBtn: { marginTop: 4 },
  emptyReset: { fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.primary, textDecorationLine: 'underline' },
  // 2-column grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  mapFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 60,
  },
});
