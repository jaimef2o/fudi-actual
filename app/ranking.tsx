import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { CUISINE_CATEGORIES, CUISINE_ICONS, PRICE_LEVELS, type CuisineCategory, type PriceLevel } from './(tabs)/descubrir';
import { CityPicker } from '../components/CityPicker';
import { useAppStore } from '../store';
import { useUserRanking } from '../lib/hooks/useVisit';

function MiniCircularScore({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 10);

  return (
    <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={48} height={48} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={24} cy={24} r={radius} stroke="#ebe8e1" strokeWidth={3} fill="transparent" />
        <Circle
          cx={24}
          cy={24}
          r={radius}
          stroke="#516600"
          strokeWidth={3}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.miniScoreText}>{score.toFixed(1)}</Text>
    </View>
  );
}

function priceLevelToSymbol(level: number | null | undefined): PriceLevel | null {
  if (level === 1) return '$';
  if (level === 2) return '$$';
  if (level === 3 || level === 4) return '$$$';
  return null;
}

export default function RankingScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: ranking = [], isLoading, isError, refetch } = useUserRanking(currentUser?.id);

  const [activeCuisine, setActiveCuisine] = useState<CuisineCategory | 'Todo'>('Todo');
  const [draftCuisine, setDraftCuisine] = useState<CuisineCategory | 'Todo'>('Todo');
  const [activePrice, setActivePrice] = useState<PriceLevel | 'Todo'>('Todo');
  const [draftPrice, setDraftPrice] = useState<PriceLevel | 'Todo'>('Todo');
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [activeCity, setActiveCity] = useState<string>('');
  const [draftCity, setDraftCity] = useState<string>('');
  const [cityOpen, setCityOpen] = useState(false);

  // Map real visits to display format
  const restaurants = ranking.map((v) => ({
    id: v.id,
    restaurantId: v.restaurant.id,
    name: (v.restaurant as any).name as string,
    neighborhood: (v.restaurant as any).neighborhood as string | null,
    city: (v.restaurant as any).city as string | null,
    cuisine: (v.restaurant as any).cuisine as string | null,
    price: priceLevelToSymbol((v.restaurant as any).price_level),
    score: v.rank_score ?? 0,
    image: (v.restaurant as any).cover_image_url as string | null,
    sentiment: v.sentiment,
  }));

  const filteredRestaurants = restaurants
    .filter((r) => activeCity.trim() === '' || (r.city ?? '').toLowerCase().includes(activeCity.trim().toLowerCase()))
    .filter((r) => activeCuisine === 'Todo' || r.cuisine === activeCuisine)
    .filter((r) => activePrice === 'Todo' || r.price === activePrice)
    .slice()
    .sort((a, b) => b.score - a.score);

  const totalFilters = (activeCity.trim() !== '' ? 1 : 0) + (activeCuisine !== 'Todo' ? 1 : 0) + (activePrice !== 'Todo' ? 1 : 0);

  const PRICE_DESCS: Record<PriceLevel, string> = {
    '$': 'Menos de 20€',
    '$$': '20€ – 50€',
    '$$$': 'Más de 50€',
  };

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
        <MaterialIcons name="error-outline" size={48} color="#c1c8c2" />
        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' }}>
          Error al cargar tu ranking
        </Text>
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center' }}>
          Comprueba tu conexión e inténtalo de nuevo.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: '#c7ef48', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
        >
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#032417' }}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#727973', textDecorationLine: 'underline' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ranking</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Cuisine filter modal */}
      <Modal visible={cuisineOpen} animationType="slide" transparent onRequestClose={() => setCuisineOpen(false)}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={() => setCuisineOpen(false)} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Tipo de cocina</Text>
            {draftCuisine !== 'Todo' && (
              <TouchableOpacity onPress={() => setDraftCuisine('Todo')}>
                <Text style={modalStyles.resetText}>Resetear</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={modalStyles.chipGrid}>
              {(['Todo', ...CUISINE_CATEGORIES] as const).map((c) => {
                const active = draftCuisine === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[modalStyles.chip, active && modalStyles.chipActive]}
                    onPress={() => setDraftCuisine(c)}
                    activeOpacity={0.75}
                  >
                    {c !== 'Todo' && (
                      <MaterialIcons
                        name={CUISINE_ICONS[c as CuisineCategory] as any}
                        size={14}
                        color={active ? '#546b00' : '#727973'}
                      />
                    )}
                    <Text style={[modalStyles.chipText, active && modalStyles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={modalStyles.applyBtn}
            activeOpacity={0.85}
            onPress={() => { setActiveCuisine(draftCuisine); setCuisineOpen(false); }}
          >
            <Text style={modalStyles.applyText}>
              {draftCuisine === 'Todo' ? 'Ver todos' : `Ver ${draftCuisine}`}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Price filter modal */}
      <Modal visible={priceOpen} animationType="slide" transparent onRequestClose={() => setPriceOpen(false)}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={() => setPriceOpen(false)} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Precio</Text>
            {draftPrice !== 'Todo' && (
              <TouchableOpacity onPress={() => setDraftPrice('Todo')}>
                <Text style={modalStyles.resetText}>Resetear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ gap: 8, paddingBottom: 16 }}>
            {(['Todo', ...PRICE_LEVELS] as const).map((p) => {
              const active = draftPrice === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[modalStyles.priceRow, active && modalStyles.priceRowActive]}
                  onPress={() => setDraftPrice(p)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[modalStyles.priceLabel, active && modalStyles.priceLabelActive]}>
                      {p === 'Todo' ? 'Todos los precios' : p}
                    </Text>
                    {p !== 'Todo' && (
                      <Text style={modalStyles.priceDesc}>{PRICE_DESCS[p as PriceLevel]}</Text>
                    )}
                  </View>
                  {active && <MaterialIcons name="check" size={18} color="#546b00" />}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={modalStyles.applyBtn}
            activeOpacity={0.85}
            onPress={() => { setActivePrice(draftPrice); setPriceOpen(false); }}
          >
            <Text style={modalStyles.applyText}>
              {draftPrice === 'Todo' ? 'Ver todos' : `Ver precio ${draftPrice}`}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* City filter modal */}
      <Modal visible={cityOpen} animationType="slide" transparent onRequestClose={() => setCityOpen(false)}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={() => setCityOpen(false)} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Ciudad</Text>
            {draftCity.trim() !== '' && (
              <TouchableOpacity onPress={() => setDraftCity('')}>
                <Text style={modalStyles.resetText}>Borrar</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ marginBottom: 16, zIndex: 10 }}>
            <CityPicker
              value={draftCity}
              onChange={setDraftCity}
              placeholder="Ej: Madrid, Barcelona, París..."
              autoFocus
            />
          </View>
          <TouchableOpacity
            style={modalStyles.applyBtn}
            activeOpacity={0.85}
            onPress={() => { setActiveCity(draftCity); setCityOpen(false); }}
          >
            <Text style={modalStyles.applyText}>
              {draftCity.trim() === '' ? 'Ver todas las ciudades' : `Ver ${draftCity}`}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {isLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#032417" />
        </View>
      )}
      {!isLoading && <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Controls row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, activeCity.trim() !== '' && styles.controlBtnCityActive]}
            onPress={() => { setDraftCity(activeCity); setCityOpen(true); }}
            activeOpacity={0.75}
          >
            <MaterialIcons name="location-on" size={14} color={activeCity.trim() !== '' ? '#c7ef48' : '#727973'} />
            <Text style={[styles.controlBtnText, activeCity.trim() !== '' && styles.controlBtnTextCity]} numberOfLines={1}>
              {activeCity.trim() !== '' ? activeCity : 'Ciudad'}
              {activeCity.trim() !== '' ? ' ✓' : ' ⚙'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, activeCuisine !== 'Todo' && styles.controlBtnActive]}
            onPress={() => { setDraftCuisine(activeCuisine); setCuisineOpen(true); }}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={CUISINE_ICONS['Española & Tapas'] as any}
              size={14}
              color={activeCuisine !== 'Todo' ? '#546b00' : '#727973'}
            />
            <Text style={[styles.controlBtnText, activeCuisine !== 'Todo' && styles.controlBtnTextActive]} numberOfLines={1}>
              {activeCuisine !== 'Todo' ? activeCuisine.split(' ')[0] : 'Cocina'}
              {activeCuisine !== 'Todo' ? ' ✓' : ' ⚙'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, activePrice !== 'Todo' && styles.controlBtnActive]}
            onPress={() => { setDraftPrice(activePrice); setPriceOpen(true); }}
            activeOpacity={0.75}
          >
            <MaterialIcons name="attach-money" size={14} color={activePrice !== 'Todo' ? '#546b00' : '#727973'} />
            <Text style={[styles.controlBtnText, activePrice !== 'Todo' && styles.controlBtnTextActive]} numberOfLines={1}>
              {activePrice !== 'Todo' ? activePrice : 'Precio'}
              {activePrice !== 'Todo' ? ' ✓' : ' ⚙'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active filter pills */}
        {totalFilters > 0 && (
          <View style={styles.activePillsRow}>
            {activeCity.trim() !== '' && (
              <TouchableOpacity
                style={[styles.activePill, { backgroundColor: '#1a3a2b' }]}
                onPress={() => setActiveCity('')}
              >
                <MaterialIcons name="location-on" size={13} color="#c7ef48" />
                <Text style={[styles.activePillText, { color: '#c7ef48' }]}>{activeCity}</Text>
                <MaterialIcons name="close" size={13} color="#c7ef48" />
              </TouchableOpacity>
            )}
            {activeCuisine !== 'Todo' && (
              <TouchableOpacity style={styles.activePill} onPress={() => setActiveCuisine('Todo')}>
                <Text style={styles.activePillText}>{activeCuisine}</Text>
                <MaterialIcons name="close" size={13} color="#546b00" />
              </TouchableOpacity>
            )}
            {activePrice !== 'Todo' && (
              <TouchableOpacity style={styles.activePill} onPress={() => setActivePrice('Todo')}>
                <Text style={styles.activePillText}>{activePrice}</Text>
                <MaterialIcons name="close" size={13} color="#546b00" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Ranking list — sorted by score */}
        <View style={styles.list}>
          {filteredRestaurants.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name={restaurants.length === 0 ? 'restaurant' : 'search-off'} size={40} color="#c1c8c2" />
              <Text style={styles.emptyTitle}>
                {restaurants.length === 0 ? 'Aún no has visitado nada' : 'Sin resultados'}
              </Text>
              <Text style={styles.emptyText}>
                {restaurants.length === 0
                  ? 'Registra tu primera visita para empezar tu ranking.'
                  : 'No tienes restaurantes con estos filtros.'}
              </Text>
              {restaurants.length === 0 && (
                <TouchableOpacity
                  style={{ marginTop: 16, backgroundColor: '#032417', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}
                  onPress={() => router.push('/registrar-visita')}
                >
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#ffffff' }}>
                    Registrar visita
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {filteredRestaurants.map((restaurant, idx) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.rankItem}
              activeOpacity={0.82}
              onPress={() => router.push(`/restaurant/${restaurant.restaurantId}`)}
            >
              <View style={styles.rankItemMain}>
                {/* Image + rank number */}
                <View style={{ position: 'relative' }}>
                  {restaurant.image ? (
                    <Image source={{ uri: restaurant.image }} style={styles.rankImage} />
                  ) : (
                    <View style={[styles.rankImage, styles.rankImagePlaceholder]}>
                      <MaterialIcons name="restaurant" size={20} color="#424844" />
                    </View>
                  )}
                  <View style={[styles.rankNumber, idx === 0 ? styles.rankNumber1 : styles.rankNumberOther]}>
                    <Text style={[styles.rankNumberText, idx === 0 ? styles.rankNumberText1 : styles.rankNumberTextOther]}>
                      {idx + 1}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName} numberOfLines={1} ellipsizeMode="tail">{restaurant.name}</Text>
                  <Text style={styles.rankMeta} numberOfLines={1} ellipsizeMode="tail">
                    {[restaurant.neighborhood, restaurant.city].filter(Boolean).join(' · ')}
                  </Text>
                  {restaurant.price && (
                    <Text style={styles.rankPrice}>{restaurant.price}</Text>
                  )}
                </View>

                {/* Score */}
                <MiniCircularScore score={restaurant.score} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>}

    </View>
  );
}

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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.90)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
  },
  container: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f7f3ec',
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.3)',
  },
  controlBtnActive: {
    backgroundColor: '#c7ef48',
    borderColor: '#c7ef48',
  },
  controlBtnCityActive: {
    backgroundColor: '#1a3a2b',
    borderColor: '#1a3a2b',
  },
  controlBtnTextCity: {
    color: '#c7ef48',
  },
  controlBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#424844',
  },
  controlBtnTextActive: {
    color: '#546b00',
  },
  activePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c7ef48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activePillText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#546b00',
  },
  list: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
  },
  rankItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rankItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  rankImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  rankImagePlaceholder: {
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber1: { backgroundColor: '#c7ef48' },
  rankNumberOther: { backgroundColor: '#e6e2db' },
  rankNumberText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
  },
  rankNumberText1: { color: '#032417' },
  rankNumberTextOther: { color: '#424844' },
  rankName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: '#032417',
    marginBottom: 2,
  },
  rankMeta: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#424844',
  },
  rankPrice: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#516600',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  miniScoreText: {
    position: 'absolute',
    fontFamily: 'NotoSerif-Bold',
    fontSize: 11,
    color: '#032417',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,36,23,0.3)',
  },
  sheet: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c1c8c2',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
  },
  resetText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#727973',
    textDecorationLine: 'underline',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f7f3ec',
  },
  chipActive: { backgroundColor: '#c7ef48' },
  chipText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: '#424844',
  },
  chipTextActive: {
    fontFamily: 'Manrope-Bold',
    color: '#546b00',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f7f3ec',
  },
  priceRowActive: { backgroundColor: '#c7ef48' },
  priceLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  priceLabelActive: { color: '#546b00' },
  priceDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    marginTop: 2,
  },
  applyBtn: {
    marginTop: 8,
    backgroundColor: '#032417',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
});
