import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { CityPicker } from '../components/CityPicker';
import { PRICE_SYMBOLS } from '../components/PriceFilterChips';
import { InfoTag } from '../components/InfoTag';
import { useAppStore } from '../store';
import { useUserRanking } from '../lib/hooks/useVisit';
import { useProfile } from '../lib/hooks/useProfile';
import { sentimentPalette } from '../lib/sentimentColors';
import { getDisplayName } from '../lib/utils/restaurantName';
import { extractPriceLabel } from '../lib/api/places';
import { ShareCard, ShareCardHandle } from '../components/ShareCard';
import { COLORS } from '../lib/theme/colors';

function MiniCircularScore({ score, sentiment }: { score: number; sentiment?: string | null }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 10);
  const pal = sentimentPalette(sentiment as any);

  return (
    <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={48} height={48} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={24} cy={24} r={radius} stroke={COLORS.surfaceContainerHigh} strokeWidth={3} fill="transparent" />
        <Circle
          cx={24}
          cy={24}
          r={radius}
          stroke={pal.ring}
          strokeWidth={3}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.miniScoreText, { color: pal.badgeText }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

const PRICE_DESCS: Record<string, string> = {
  '€':    '0 – 20€ pp',
  '€€':   '20 – 35€ pp',
  '€€€':  '35 – 60€ pp',
  '€€€€': '60€+ pp',
};

export default function RankingScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const targetUserId = paramUserId && paramUserId !== currentUser?.id ? paramUserId : currentUser?.id;
  const isOwn = !paramUserId || paramUserId === currentUser?.id;
  const { data: ranking = [], isLoading, isError, refetch } = useUserRanking(targetUserId);
  const { data: targetProfile } = useProfile(isOwn ? undefined : targetUserId);
  const targetName = isOwn ? null : (targetProfile as any)?.name ?? 'Usuario';
  const shareRef = useRef<ShareCardHandle>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCity, setActiveCity] = useState('');
  const [activePrice, setActivePrice] = useState('');
  const [draftCity, setDraftCity] = useState('');
  const [draftPrice, setDraftPrice] = useState('');

  function openFilter() {
    setDraftCity(activeCity);
    setDraftPrice(activePrice);
    setFilterOpen(true);
  }
  function applyFilter() {
    setActiveCity(draftCity);
    setActivePrice(draftPrice);
    setFilterOpen(false);
  }
  function resetFilter() {
    setDraftCity('');
    setDraftPrice('');
  }

  const totalFilters = (activeCity.trim() !== '' ? 1 : 0) + (activePrice !== '' ? 1 : 0);

  // Map real visits to display format
  const restaurants = ranking.map((v) => ({
    id: v.id,
    restaurantId: v.restaurant.id,
    name: (v.restaurant as any).name as string,
    neighborhood: (v.restaurant as any).neighborhood as string | null,
    city: (v.restaurant as any).city as string | null,
    cuisine: (v.restaurant as any).cuisine as string | null,
    price: extractPriceLabel((v.restaurant as any).price_level) ?? (v.restaurant as any).price_level as string | null,
    score: v.rank_score ?? 0,
    image: (v.restaurant as any).cover_image_url as string | null,
    sentiment: v.sentiment,
  }));

  const filteredRestaurants = restaurants
    .filter((r) => activeCity.trim() === '' || (r.city ?? '').toLowerCase().includes(activeCity.trim().toLowerCase()))
    .filter((r) => activePrice === '' || r.price === activePrice)
    .slice()
    .sort((a, b) => b.score - a.score);

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.outlineVariant} />
        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary, textAlign: 'center' }}>
          Error al cargar tu ranking
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: COLORS.secondaryContainer, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
        >
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.primary }}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: COLORS.outline, textDecorationLine: 'underline' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwn ? 'Historial' : `Historial de ${targetName}`}</Text>
        {isOwn ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.headerBtn}
              activeOpacity={0.8}
              onPress={() => shareRef.current?.share()}
            >
              <MaterialIcons name="ios-share" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rankBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/refine-ranking')}
            >
              <MaterialIcons name="tune" size={16} color={COLORS.primary} />
              <Text style={styles.rankBtnText}>Rank</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* Share card (offscreen, rendered for screenshot capture) */}
      <ShareCard
        ref={shareRef}
        type="ranking"
        userName={currentUser?.name ?? 'Mi ranking'}
        userId={currentUser?.id ?? ''}
        items={filteredRestaurants.slice(0, 5).map((r) => ({
          name: getDisplayName({ name: r.name }, 'ranking'),
          score: r.score,
          sentiment: (r.sentiment ?? 'fine') as 'loved' | 'fine' | 'disliked',
        }))}
      />

      {/* Filter modal — unified */}
      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={ms.backdrop} activeOpacity={1} onPress={() => setFilterOpen(false)} />
          <View style={ms.sheet}>
            <View style={ms.handle} />
            <View style={ms.sheetHeader}>
              <TouchableOpacity onPress={resetFilter}>
                <Text style={ms.resetText}>Resetear</Text>
              </TouchableOpacity>
              <Text style={ms.sheetTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <MaterialIcons name="close" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Ciudad */}
              <View style={ms.sectionRow}>
                <Text style={ms.sectionLabel}>Ciudad</Text>
                <View style={{ flex: 1 }}>
                  <CityPicker
                    value={draftCity}
                    onChange={setDraftCity}
                    placeholder="Ej: Madrid, Barcelona..."
                  />
                </View>
              </View>

              {/* Divider */}
              <View style={ms.divider} />

              {/* Precio */}
              <View style={ms.sectionRow}>
                <Text style={ms.sectionLabel}>Precio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingRight: 4 }} keyboardShouldPersistTaps="handled">
                  {PRICE_SYMBOLS.map((p) => {
                    const active = draftPrice === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[ms.priceBtn, active && ms.priceBtnActive]}
                        onPress={() => setDraftPrice(active ? '' : p)}
                        activeOpacity={0.75}
                      >
                        <Text style={[ms.priceBtnSymbol, active && ms.priceBtnSymbolActive]}>{p}</Text>
                        <Text style={[ms.priceBtnDesc, active && ms.priceBtnDescActive]}>{PRICE_DESCS[p]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <TouchableOpacity style={ms.applyBtn} activeOpacity={0.85} onPress={applyFilter}>
              <Text style={ms.applyBtnText}>Ver resultados</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {!isLoading && (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Controls row */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, totalFilters > 0 && styles.controlBtnActive]}
              onPress={openFilter}
              activeOpacity={0.75}
            >
              <MaterialIcons name="tune" size={15} color={totalFilters > 0 ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant} />
              <Text style={[styles.controlBtnText, totalFilters > 0 && styles.controlBtnTextActive]}>
                Filtros{totalFilters > 0 ? ` (${totalFilters})` : ''}
              </Text>
            </TouchableOpacity>
            {totalFilters > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setActiveCity(''); setActivePrice(''); }}
              >
                <MaterialIcons name="close" size={14} color="#546b00" />
              </TouchableOpacity>
            )}
          </View>

          {/* Active filter pills */}
          {totalFilters > 0 && (
            <View style={styles.activePillsRow}>
              {activeCity.trim() !== '' && (
                <TouchableOpacity
                  style={[styles.activePill, { backgroundColor: COLORS.primaryContainer }]}
                  onPress={() => setActiveCity('')}
                >
                  <MaterialIcons name="location-on" size={13} color={COLORS.secondaryContainer} />
                  <Text style={[styles.activePillText, { color: COLORS.secondaryContainer }]}>{activeCity}</Text>
                  <MaterialIcons name="close" size={13} color={COLORS.secondaryContainer} />
                </TouchableOpacity>
              )}
              {activePrice !== '' && (
                <TouchableOpacity style={styles.activePill} onPress={() => setActivePrice('')}>
                  <Text style={styles.activePillText}>{activePrice}</Text>
                  <MaterialIcons name="close" size={13} color={COLORS.onSecondaryContainer} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Ranking list */}
          <View style={styles.list}>
            {filteredRestaurants.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name={restaurants.length === 0 ? 'restaurant' : 'search-off'} size={40} color={COLORS.outlineVariant} />
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
                    style={{ marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}
                    onPress={() => router.push('/registrar-visita')}
                  >
                    <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: COLORS.onPrimary }}>
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
                  <View style={{ position: 'relative' }}>
                    {restaurant.image ? (
                      <Image source={{ uri: restaurant.image }} style={styles.rankImage} />
                    ) : (
                      <View style={[styles.rankImage, styles.rankImagePlaceholder]}>
                        <MaterialIcons name="restaurant" size={20} color={COLORS.onSurfaceVariant} />
                      </View>
                    )}
                    <View style={[styles.rankNumber, idx === 0 ? styles.rankNumber1 : styles.rankNumberOther]}>
                      <Text style={[styles.rankNumberText, idx === 0 ? styles.rankNumberText1 : styles.rankNumberTextOther]}>
                        {idx + 1}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName} numberOfLines={1} ellipsizeMode="tail">{getDisplayName(restaurant as any, 'ranking')}</Text>
                    {(restaurant.cuisine || restaurant.price) ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                        <InfoTag value={restaurant.cuisine} />
                        <InfoTag value={restaurant.price} />
                      </View>
                    ) : null}
                  </View>

                  <MiniCircularScore score={restaurant.score} sentiment={restaurant.sentiment} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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
    color: COLORS.primary,
  },
  rankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  rankBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.primary,
  },
  container: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.3)',
  },
  controlBtnActive: {
    backgroundColor: COLORS.secondaryContainer,
    borderColor: COLORS.secondaryFixedDim,
  },
  controlBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controlBtnTextActive: { color: COLORS.onSecondaryContainer },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activePillText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: COLORS.onSecondaryContainer,
  },
  list: { gap: 10 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: COLORS.primary,
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: COLORS.outline,
    textAlign: 'center',
  },
  rankItem: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.onSurface,
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
    backgroundColor: COLORS.surfaceContainerHighest,
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
  rankNumber1: { backgroundColor: COLORS.secondaryContainer },
  rankNumberOther: { backgroundColor: COLORS.surfaceContainerHighest },
  rankNumberText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
  },
  rankNumberText1: { color: COLORS.primary },
  rankNumberTextOther: { color: COLORS.onSurfaceVariant },
  rankName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 5,
  },
  miniScoreText: {
    position: 'absolute',
    fontFamily: 'NotoSerif-Bold',
    fontSize: 11,
    color: COLORS.primary,
  },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sheetTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: COLORS.primary },
  resetText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: COLORS.outline, textDecorationLine: 'underline' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: COLORS.outline,
    paddingTop: 14,
    width: 48,
    flexShrink: 0,
  },
  divider: { height: 1, backgroundColor: COLORS.surfaceContainerHigh, marginBottom: 16 },
  priceBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f1ede6',
    minWidth: 60,
    gap: 2,
  },
  priceBtnActive: { backgroundColor: '#c7ef48' },
  priceBtnSymbol: { fontFamily: 'NotoSerif-Bold', fontSize: 15, color: '#424844' },
  priceBtnSymbolActive: { color: '#032417' },
  priceBtnDesc: { fontFamily: 'Manrope-Medium', fontSize: 9, color: '#727973', textAlign: 'center' },
  priceBtnDescActive: { color: '#546b00' },
  applyBtn: {
    backgroundColor: '#032417',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.5 },
});
