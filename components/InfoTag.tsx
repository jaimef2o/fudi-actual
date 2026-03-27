import { View, Text, StyleSheet } from 'react-native';

/**
 * InfoTag — etiqueta informativa no interactiva para cuisine_type y price_level.
 * Solo se monta si `value` no es null/empty. No dejes espacio vacío en la UI.
 * Normaliza price_level numérico (1–4 o '1'–'4') a símbolos €.
 */
interface InfoTagProps {
  value: string | number | null | undefined;
}

const PRICE_NORMALIZE: Record<string, string> = {
  '1': '€', '2': '€€', '3': '€€€', '4': '€€€€',
};

export function InfoTag({ value }: InfoTagProps) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);
  const display = PRICE_NORMALIZE[str] ?? str;
  return (
    <View style={s.tag}>
      <Text style={s.text}>{display}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tag: {
    backgroundColor: '#f1ede6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#424844',
  },
});
