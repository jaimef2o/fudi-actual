import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

// Mock neighborhood data by city — replace with DB query in production
const NEIGHBORHOODS_BY_CITY: Record<string, string[]> = {
  'Madrid': ['Malasaña', 'Chueca', 'Chamberí', 'La Latina', 'Retiro', 'Salamanca', 'Lavapiés', 'Moncloa', 'Huertas', 'Almagro', 'Tetuán', 'Ponzano'],
  'Barcelona': ['Gràcia', 'Eixample', 'Barri Gòtic', 'Poblenou', 'Barceloneta', 'Sarrià', 'El Born', 'Sants', 'Gràcia Alta'],
  'Valencia': ['Ruzafa', 'El Carmen', 'Benimaclet', 'Cabanyal', 'Exposición'],
  'Sevilla': ['Triana', 'Santa Cruz', 'Nervión', 'Macarena', 'Los Remedios'],
  'Bilbao': ['Casco Viejo', 'Ensanche', 'Abando', 'Deusto', 'Indautxu'],
  'San Sebastián': ['Parte Vieja', 'Centro', 'Gros', 'Amara'],
  'Málaga': ['Centro Histórico', 'El Soho', 'La Malagueta', 'Pedregalejo'],
};

interface NeighborhoodChipsProps {
  city: string;
  selected: string[];
  onChange: (neighborhoods: string[]) => void;
}

export function NeighborhoodChips({ city, selected, onChange }: NeighborhoodChipsProps) {
  const neighborhoods = NEIGHBORHOODS_BY_CITY[city] ?? [];
  if (neighborhoods.length === 0) return null;

  function toggle(n: string) {
    if (selected.includes(n)) {
      onChange(selected.filter((x) => x !== n));
    } else {
      onChange([...selected, n]);
    }
  }

  return (
    <View style={s.wrapper}>
      <Text style={s.label}>BARRIO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {neighborhoods.map((n) => {
          const active = selected.includes(n);
          return (
            <TouchableOpacity
              key={n}
              style={[s.chip, active && s.chipActive]}
              onPress={() => toggle(n)}
              activeOpacity={0.75}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  row: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1ede6',
  },
  chipActive: { backgroundColor: '#c7ef48' },
  chipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#424844',
  },
  chipTextActive: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
  },
});
