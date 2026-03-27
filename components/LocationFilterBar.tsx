import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { CityPicker } from './CityPicker';
import { NeighborhoodChips } from './NeighborhoodChips';
import { PRICE_SYMBOLS, type PriceSymbol } from './PriceFilterChips';

export type LocationFilters = {
  city: string;
  neighborhoods: string[];
  prices: string[];
  sortBy: 'rating' | 'trending';
};

export const EMPTY_FILTERS: LocationFilters = {
  city: '',
  neighborhoods: [],
  prices: [],
  sortBy: 'rating',
};

interface LocationFilterBarProps {
  filters: LocationFilters;
  onChange: (filters: LocationFilters) => void;
}

const PRICE_DESCS: Record<PriceSymbol, string> = {
  '€':    '0–20€ pp',
  '€€':   '20–35€ pp',
  '€€€':  '35–60€ pp',
  '€€€€': '60€+ pp',
};

export function LocationFilterBar({ filters, onChange }: LocationFilterBarProps) {
  function setCity(city: string) {
    onChange({ ...filters, city, neighborhoods: [] });
  }
  function setNeighborhoods(neighborhoods: string[]) {
    onChange({ ...filters, neighborhoods });
  }
  function togglePrice(p: string) {
    const prices = filters.prices.includes(p)
      ? filters.prices.filter((x) => x !== p)
      : [...filters.prices, p];
    onChange({ ...filters, prices });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
      {/* Ciudad */}
      <View style={s.row}>
        <Text style={s.sectionLabel}>Ciudad</Text>
        <View style={{ flex: 1, zIndex: 10 }}>
          <CityPicker
            value={filters.city}
            onChange={setCity}
            placeholder="Ej: Madrid, Barcelona..."
          />
        </View>
      </View>

      {filters.city.trim() !== '' && (
        <View style={{ marginBottom: 16 }}>
          <NeighborhoodChips
            city={filters.city}
            selected={filters.neighborhoods}
            onChange={setNeighborhoods}
          />
        </View>
      )}

      {/* Precio */}
      <View style={s.row}>
        <Text style={s.sectionLabel}>Precio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.priceRow}>
          {PRICE_SYMBOLS.map((p) => {
            const active = filters.prices.includes(p);
            return (
              <TouchableOpacity
                key={p}
                style={[s.priceBtn, active && s.priceBtnActive]}
                onPress={() => togglePrice(p)}
                activeOpacity={0.75}
              >
                <Text style={[s.priceBtnSymbol, active && s.priceBtnSymbolActive]}>{p}</Text>
                <Text style={[s.priceBtnDesc, active && s.priceBtnDescActive]}>{PRICE_DESCS[p]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#727973',
    paddingTop: 14,
    width: 48,
    flexShrink: 0,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
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
  priceBtnSymbol: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 15,
    color: '#424844',
  },
  priceBtnSymbolActive: { color: '#032417' },
  priceBtnDesc: {
    fontFamily: 'Manrope-Medium',
    fontSize: 9,
    color: '#727973',
    textAlign: 'center',
  },
  priceBtnDescActive: { color: '#546b00' },
});
