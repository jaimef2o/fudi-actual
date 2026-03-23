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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '../../store';
import { useDiscoverRestaurants } from '../../lib/hooks/useRestaurant';
import { LocationFilterBar, LocationFilters, EMPTY_FILTERS } from '../../components/LocationFilterBar';

// ── Cuisine categories (shared across the app) ───────────────────────────────
export const CUISINE_CATEGORIES = [
  'Española & Tapas',
  'Italiana & Pizza',
  'Asiática',
  'Mexicana',
  'Latinoamericana',
  'Árabe & Turca',
  'Mariscos & Pescados',
  'Carne & Parrilla',
  'Americana & Burgers',
  'Brunch & Desayunos',
  'Ensaladas & Saludable',
] as const;
export type CuisineCategory = (typeof CUISINE_CATEGORIES)[number];

export const CUISINE_ICONS: Record<CuisineCategory, string> = {
  'Española & Tapas':      'wine-bar',
  'Italiana & Pizza':      'local-pizza',
  'Asiática':              'ramen-dining',
  'Mexicana':              'whatshot',
  'Latinoamericana':       'local-dining',
  'Árabe & Turca':         'kebab-dining',
  'Mariscos & Pescados':   'set-meal',
  'Carne & Parrilla':      'outdoor-grill',
  'Americana & Burgers':   'lunch-dining',
  'Brunch & Desayunos':    'breakfast-dining',
  'Ensaladas & Saludable': 'eco',
};

export const PRICE_LEVELS = ['$', '$$', '$$$'] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export const CITIES = ['Madrid', 'Barcelona', 'Valencia', 'Bilbao', 'Sevilla'] as const;
export type City = (typeof CITIES)[number];

// Price level helper
function priceLabel(level: number | null | undefined): string {
  if (!level) return '';
  return '$'.repeat(Math.min(level, 3));
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function DescubrirScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [mode, setMode] = useState<'amigos' | 'global'>('amigos');
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<LocationFilters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<LocationFilters>({ ...EMPTY_FILTERS });

  const activeFilterCount =
    (appliedFilters.city.trim() !== '' ? 1 : 0) +
    appliedFilters.neighborhoods.length +
    appliedFilters.cuisines.length +
    appliedFilters.prices.length;

  // Real data from Supabase
  const { data: restaurants = [], isLoading, error } = useDiscoverRestaurants(
    currentUser?.id,
    mode,
    {
      city: appliedFilters.city || undefined,
      neighborhoods: appliedFilters.neighborhoods.length > 0 ? appliedFilters.neighborhoods : undefined,
      cuisines: appliedFilters.cuisines.length > 0 ? appliedFilters.cuisines : undefined,
      prices: appliedFilters.prices.length > 0 ? appliedFilters.prices : undefined,
      search: searchText.trim() || undefined,
    }
  );

  const openFilter = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setAppliedFilters({ ...draftFilters });
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setDraftFilters({ ...EMPTY_FILTERS });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Descubrir</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Alert.alert('Notificaciones', 'Las notificaciones push estarán disponibles pronto.')}
        >
          <MaterialIcons name="notifications-none" size={24} color="#032417" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Toggle Amigos / Global */}
        <View style={styles.toggleWrapper}>
          <View style={styles.toggle}>
            {(['amigos', 'global'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => setMode(m)}
              >
                <MaterialIcons
                  name={m === 'amigos' ? 'people' : 'public'}
                  size={14}
                  color={mode === m ? '#032417' : '#727973'}
                />
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'amigos' ? 'Amigos' : 'Global'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, activeFilterCount > 0 && styles.controlBtnActive]}
            onPress={openFilter}
          >
            <Text style={[styles.controlBtnText, activeFilterCount > 0 && styles.controlBtnTextActive]}>
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
            <MaterialIcons name="tune" size={16} color={activeFilterCount > 0 ? '#546b00' : '#424844'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              setAppliedFilters({ ...EMPTY_FILTERS });
              setSearchText('');
            }}
          >
            <Text style={styles.controlBtnText}>Todos</Text>
            <MaterialIcons name="refresh" size={16} color="#424844" />
          </TouchableOpacity>
        </View>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activePills}
            style={{ marginBottom: 12 }}
          >
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
            {appliedFilters.cuisines.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.activePill}
                onPress={() => setAppliedFilters((prev) => ({ ...prev, cuisines: prev.cuisines.filter((x) => x !== c) }))}
              >
                <Text style={styles.activePillText}>{c}</Text>
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

        {/* Context label */}
        {!isLoading && !error && (
          <Text style={styles.contextLabel}>
            {mode === 'amigos' ? 'Valoración media de tus amigos' : 'Valoración media global'}
            {' · '}{restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#032417" />
            <Text style={styles.loadingText}>Buscando restaurantes...</Text>
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
                  <View style={styles.cardScore}>
                    <Text style={styles.cardScoreText}>{r.score.toFixed(1)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    {r.cuisine ? (
                      <Text style={styles.cardCuisine}>{r.cuisine.toUpperCase()}</Text>
                    ) : null}
                    <Text style={styles.cardName} numberOfLines={2}>{r.name}</Text>
                    <View style={styles.cardMeta}>
                      <MaterialIcons name="place" size={12} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.cardMetaText}>
                        {[r.neighborhood, priceLabel(r.price_level)].filter(Boolean).join(' · ')}
                      </Text>
                      {r.visitCount > 0 && (
                        <View style={styles.cardVisitsChip}>
                          <MaterialIcons name="star" size={11} color="#546b00" />
                          <Text style={styles.cardVisitsText}>
                            {r.visitCount} {r.visitCount === 1 ? 'visita' : 'visitas'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter sheet modal */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
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
      </Modal>
    </View>
  );
}

// ── Filter sheet styles ───────────────────────────────────────────────────────
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
  handle: {
    width: 40, height: 4, backgroundColor: '#e6e2db',
    borderRadius: 2, alignSelf: 'center', marginVertical: 14,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  sheetTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417' },
  resetText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#727973', textDecorationLine: 'underline' },
  applyBtn: {
    backgroundColor: '#032417', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  applyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.5 },
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
  toggleWrapper: { alignItems: 'center', marginBottom: 20 },
  toggle: { flexDirection: 'row', backgroundColor: '#ebe8e1', borderRadius: 999, padding: 4 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 8, borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  toggleText: { fontFamily: 'Manrope-Bold', fontSize: 12, color: '#727973' },
  toggleTextActive: { color: '#032417' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f7f3ec', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 11, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Regular', color: '#1c1c18' },
  controlsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  controlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f7f3ec', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(193,200,194,0.3)',
  },
  controlBtnActive: { backgroundColor: '#c7ef48', borderColor: '#aed52e' },
  controlBtnText: { fontFamily: 'Manrope-Bold', fontSize: 11, color: '#424844', textTransform: 'uppercase', letterSpacing: 0.8 },
  controlBtnTextActive: { color: '#546b00' },
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
  cardScore: { position: 'absolute', top: 14, right: 14, backgroundColor: '#c7ef48', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  cardScoreText: { fontFamily: 'NotoSerif-Bold', fontSize: 17, color: '#032417' },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 3 },
  cardCuisine: { fontFamily: 'Manrope-Bold', fontSize: 9, color: '#c7ef48', letterSpacing: 2 },
  cardName: { fontFamily: 'NotoSerif-Bold', fontSize: 22, color: '#ffffff', lineHeight: 28 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaText: { fontFamily: 'Manrope-Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  cardVisitsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#c7ef48', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 6 },
  cardVisitsText: { fontFamily: 'Manrope-Bold', fontSize: 10, color: '#546b00' },
});
