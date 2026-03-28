import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// ─── Data ─────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const CUISINE_DISLIKES: { id: string; label: string; icon: IconName }[] = [
  { id: 'spicy',   label: 'Picante',       icon: 'local-fire-department' },
  { id: 'seafood', label: 'Marisco',        icon: 'set-meal' },
  { id: 'meat',    label: 'Carne roja',     icon: 'kebab-dining' },
  { id: 'pork',    label: 'Cerdo',          icon: 'restaurant' },
  { id: 'gluten',  label: 'Gluten',         icon: 'grain' },
  { id: 'dairy',   label: 'Lácteos',        icon: 'local-drink' },
  { id: 'nuts',    label: 'Frutos secos',   icon: 'eco' },
  { id: 'eggs',    label: 'Huevos',         icon: 'egg-alt' },
];

const DIETARY_RESTRICTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'vegetarian',   label: 'Vegetariano',  icon: 'spa' },
  { id: 'vegan',        label: 'Vegano',        icon: 'grass' },
  { id: 'gluten_free',  label: 'Sin gluten',    icon: 'do-not-disturb' },
  { id: 'halal',        label: 'Halal',         icon: 'star-outline' },
  { id: 'kosher',       label: 'Kosher',        icon: 'verified' },
  { id: 'lactose_free', label: 'Sin lactosa',   icon: 'no-drinks' },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

async function updateUserPreferences(
  dislikes: string[],
  restrictions: string[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase.from('users') as any)
    .update({ cuisine_dislikes: dislikes, dietary_restrictions: restrictions })
    .eq('id', user.id);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PreferencesScreen() {
  const [step, setStep]             = useState<1 | 2>(1);
  const [dislikes, setDislikes]     = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);

  function toggle(id: string, list: string[], setList: (l: string[]) => void) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleFinish() {
    setLoading(true);
    await updateUserPreferences(dislikes, restrictions);
    setLoading(false);
    router.replace('/(tabs)/feed');
  }

  function handleSkip() {
    router.replace('/(tabs)/feed');
  }

  const items      = step === 1 ? CUISINE_DISLIKES : DIETARY_RESTRICTIONS;
  const selected   = step === 1 ? dislikes : restrictions;
  const setSelected = step === 1 ? setDislikes : setRestrictions;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, step === 2 && styles.progressBarActive]} />
        </View>

        {/* Header */}
        <Text style={styles.title}>
          {step === 1 ? '¿Qué prefieres\nevitar?' : '¿Restricciones\nalimentarias?'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? 'Personalizamos las recomendaciones según tus preferencias.'
            : 'Opcional — para mostrarte solo lo que encaja contigo.'}
        </Text>

        {/* Chips */}
        <View style={styles.chipGrid}>
          {items.map((item) => {
            const active = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, active && (step === 1 ? styles.chipActiveDislike : styles.chipActiveRestriction)]}
                activeOpacity={0.75}
                onPress={() => toggle(item.id, selected, setSelected)}
              >
                <MaterialIcons
                  name={item.icon}
                  size={16}
                  color={active ? (step === 1 ? '#ba1a1a' : '#516600') : '#727973'}
                />
                <Text style={[styles.chipText, active && (step === 1 ? styles.chipTextDislike : styles.chipTextRestriction)]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={step === 1 ? () => setStep(2) : handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {step === 1 ? 'Siguiente' : 'Entrar a fudi'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSkip} activeOpacity={0.7} onPress={handleSkip}>
            <Text style={styles.btnSkipText}>Saltar este paso</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  inner: {
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 48,
    gap: 24,
  },

  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e6e2db',
  },
  progressBarActive: {
    backgroundColor: '#c7ef48',
  },

  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: '#032417',
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
    marginTop: -8,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f7f3ec',
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActiveDislike: {
    backgroundColor: '#fff0f0',
    borderColor: '#ba1a1a',
  },
  chipActiveRestriction: {
    backgroundColor: '#f0f9e8',
    borderColor: '#516600',
  },
  chipText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#1c1c18',
  },
  chipTextDislike: {
    fontFamily: 'Manrope-SemiBold',
    color: '#ba1a1a',
  },
  chipTextRestriction: {
    fontFamily: 'Manrope-SemiBold',
    color: '#516600',
  },

  footer: { gap: 12, marginTop: 8 },
  btnPrimary: {
    backgroundColor: '#c7ef48',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  btnSkip: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnSkipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#727973',
    textDecorationLine: 'underline',
  },
});
