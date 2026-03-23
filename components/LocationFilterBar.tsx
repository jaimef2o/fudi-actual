import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CityPicker } from './CityPicker';
import { NeighborhoodChips } from './NeighborhoodChips';
import { CUISINE_CATEGORIES, CUISINE_ICONS, PRICE_LEVELS, type CuisineCategory, type PriceLevel } from '../app/(tabs)/descubrir';

export type LocationFilters = {
  city: string;
  neighborhoods: string[];
  cuisines: CuisineCategory[];
  prices: PriceLevel[];
};

export const EMPTY_FILTERS: LocationFilters = {
  city: '',
  neighborhoods: [],
  cuisines: [],
  prices: [],
};

interface LocationFilterBarProps {
  filters: LocationFilters;
  onChange: (filters: LocationFilters) => void;
}

const PRICE_DESCS: Record<PriceLevel, string> = {
  '$': 'Menos de 20€',
  '$$': '20€ – 50€',
  '$$$': 'Más de 50€',
};

export function LocationFilterBar({ filters, onChange }: LocationFilterBarProps) {
  function setCity(city: string) {
    // Changing city resets neighborhoods
    onChange({ ...filters, city, neighborhoods: [] });
  }
  function setNeighborhoods(neighborhoods: string[]) {
    onChange({ ...filters, neighborhoods });
  }
  function toggleCuisine(c: CuisineCategory) {
    const cuisines = filters.cuisines.includes(c)
      ? filters.cuisines.filter((x) => x !== c)
      : [...filters.cuisines, c];
    onChange({ ...filters, cuisines });
  }
  function togglePrice(p: PriceLevel) {
    const prices = filters.prices.includes(p)
      ? filters.prices.filter((x) => x !== p)
      : [...filters.prices, p];
    onChange({ ...filters, prices });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
      {/* Ciudad */}
      <Text style={s.sectionLabel}>CIUDAD</Text>
      <View style={{ marginBottom: 20, zIndex: 10 }}>
        <CityPicker
          value={filters.city}
          onChange={setCity}
          placeholder="Ej: Madrid, Barcelona, París..."
        />
      </View>

      {/* Barrio — only when city selected and has neighborhoods */}
      {filters.city.trim() !== '' && (
        <NeighborhoodChips
          city={filters.city}
          selected={filters.neighborhoods}
          onChange={setNeighborhoods}
        />
      )}

      {/* Tipo de cocina */}
      <Text style={s.sectionLabel}>TIPO DE COCINA</Text>
      <View style={s.chipGrid}>
        {CUISINE_CATEGORIES.map((c) => {
          const active = filters.cuisines.includes(c);
          return (
            <TouchableOpacity
              key={c}
              style={[s.chip, active && s.chipActive]}
              onPress={() => toggleCuisine(c)}
              activeOpacity={0.75}
            >
              <MaterialIcons name={CUISINE_ICONS[c] as any} size={14} color={active ? '#546b00' : '#727973'} />
              <Text style={[s.chipText, active && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Precio */}
      <Text style={s.sectionLabel}>PRECIO</Text>
      <View style={s.priceRow}>
        {PRICE_LEVELS.map((p) => {
          const active = filters.prices.includes(p);
          return (
            <TouchableOpacity
              key={p}
              style={[s.priceBtn, active && s.priceBtnActive]}
              onPress={() => togglePrice(p)}
              activeOpacity={0.75}
            >
              <Text style={[s.priceBtnText, active && s.priceBtnTextActive]}>{p}</Text>
              <Text style={[s.priceDesc, active && { color: '#546b00' }]}>{PRICE_DESCS[p]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 8 },
  sectionLabel: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1ede6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#c7ef48',
    borderColor: '#aed52e',
  },
  chipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#424844',
  },
  chipTextActive: {
    color: '#032417',
    fontFamily: 'Manrope-Bold',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  priceBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f1ede6',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  priceBtnActive: {
    backgroundColor: '#c7ef48',
    borderColor: '#aed52e',
  },
  priceBtnText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#424844',
  },
  priceBtnTextActive: { color: '#032417' },
  priceDesc: {
    fontFamily: 'Manrope-Medium',
    fontSize: 10,
    color: '#727973',
  },
});
