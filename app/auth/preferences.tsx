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
import { supabase } from '../../lib/supabase';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CUISINE_DISLIKES = [
  { id: 'spicy', label: '🌶️ Picante' },
  { id: 'seafood', label: '🦐 Marisco' },
  { id: 'meat', label: '🥩 Carne roja' },
  { id: 'pork', label: '🐷 Cerdo' },
  { id: 'gluten', label: '🌾 Gluten' },
  { id: 'dairy', label: '🧀 Lácteos' },
  { id: 'nuts', label: '🥜 Frutos secos' },
  { id: 'eggs', label: '🥚 Huevos' },
];

const DIETARY_RESTRICTIONS = [
  { id: 'vegetarian', label: '🥦 Vegetariano' },
  { id: 'vegan', label: '🌱 Vegano' },
  { id: 'gluten_free', label: '🌾 Sin gluten' },
  { id: 'halal', label: '☪️ Halal' },
  { id: 'kosher', label: '✡️ Kosher' },
  { id: 'lactose_free', label: '🥛 Sin lactosa' },
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
  const [step, setStep] = useState<1 | 2>(1);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  // ── Step 1: cuisine dislikes ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.progress}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>

          <Text style={styles.title}>¿Qué prefieres evitar?</Text>
          <Text style={styles.subtitle}>
            Así personalizamos Descubrir para que no te sugiramos lo que no te gusta.
          </Text>

          <View style={styles.chipGrid}>
            {CUISINE_DISLIKES.map((item) => {
              const active = dislikes.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.75}
                  onPress={() => toggle(item.id, dislikes, setDislikes)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.85}
              onPress={() => setStep(2)}
            >
              <Text style={styles.btnPrimaryText}>Siguiente →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSkip} activeOpacity={0.7} onPress={handleSkip}>
              <Text style={styles.btnSkipText}>Saltarme esto</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 2: dietary restrictions ────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.title}>¿Tienes restricciones alimentarias?</Text>
        <Text style={styles.subtitle}>
          Opcional — solo para que sepamos qué opciones mostrarte.
        </Text>

        <View style={styles.chipGrid}>
          {DIETARY_RESTRICTIONS.map((item) => {
            const active = restrictions.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, active && styles.chipRestriction]}
                activeOpacity={0.75}
                onPress={() => toggle(item.id, restrictions, setRestrictions)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnPrimaryText}>Entrar a fudi →</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSkip} activeOpacity={0.7} onPress={handleSkip}>
            <Text style={styles.btnSkipText}>Saltarme esto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fdf9f2',
  },
  inner: {
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 48,
    gap: 24,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e6e2db',
  },
  dotActive: {
    backgroundColor: '#c7ef48',
    width: 24,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 28,
    color: '#032417',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#f7f3ec',
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#fff0f0',
    borderColor: '#ba1a1a',
  },
  chipRestriction: {
    backgroundColor: '#f0f9e8',
    borderColor: '#516600',
  },
  chipText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#032417',
  },
  chipTextActive: {
    fontFamily: 'Manrope-SemiBold',
  },
  footer: {
    gap: 12,
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
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
