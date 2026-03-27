import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const PRICE_SYMBOLS = ['€', '€€', '€€€', '€€€€'] as const;
export type PriceSymbol = (typeof PRICE_SYMBOLS)[number];

interface PriceFilterChipsProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * PriceFilterChips — fila de chips de precio inline (€/€€/€€€/€€€€).
 * Multi-select. Al filtrar con alguno activo, excluye restaurantes sin price_level.
 */
export function PriceFilterChips({ selected, onChange }: PriceFilterChipsProps) {
  function toggle(p: string) {
    const next = selected.includes(p)
      ? selected.filter((x) => x !== p)
      : [...selected, p];
    onChange(next);
  }

  return (
    <View style={s.row}>
      {PRICE_SYMBOLS.map((p) => {
        const active = selected.includes(p);
        return (
          <TouchableOpacity
            key={p}
            style={[s.chip, active && s.chipActive]}
            onPress={() => toggle(p)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ebe8e1',
  },
  chipActive: {
    backgroundColor: '#c7ef48',
  },
  chipText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 13,
    color: '#424844',
  },
  chipTextActive: {
    color: '#546b00',
  },
});
