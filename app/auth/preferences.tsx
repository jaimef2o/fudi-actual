import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '../../store';
import { updateProfile } from '../../lib/api/users';

const CUISINE_DISLIKES = [
  { id: 'picante', label: 'Muy picante', icon: 'local-fire-department' },
  { id: 'marisco', label: 'Marisco', icon: 'set-meal' },
  { id: 'carne_roja', label: 'Carne roja', icon: 'kebab-dining' },
  { id: 'sushi_crudo', label: 'Pescado crudo', icon: 'water' },
  { id: 'frito', label: 'Frituras', icon: 'oil-barrel' },
  { id: 'dulce', label: 'Muy dulce', icon: 'cake' },
  { id: 'lacteos', label: 'Lácteos', icon: 'icecream' },
  { id: 'insectos', label: 'Insectos/Exótico', icon: 'bug-report' },
];

const DIETARY_RESTRICTIONS = [
  { id: 'vegetariano', label: 'Vegetariano', icon: 'eco' },
  { id: 'vegano', label: 'Vegano', icon: 'spa' },
  { id: 'sin_gluten', label: 'Sin gluten', icon: 'grain' },
  { id: 'sin_lactosa', label: 'Sin lactosa', icon: 'no-food' },
  { id: 'halal', label: 'Halal', icon: 'mosque' },
  { id: 'kosher', label: 'Kosher', icon: 'synagogue' },
  { id: 'sin_frutos_secos', label: 'Sin frutos secos', icon: 'dangerous' },
  { id: 'bajo_sodio', label: 'Bajo en sodio', icon: 'science' },
];

export default function PreferencesScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  function toggleDislike(id: string) {
    setDislikes((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  function toggleRestriction(id: string) {
    setRestrictions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      await updateProfile(currentUser.id, {
        cuisine_dislikes: dislikes.length > 0 ? dislikes : [],
        dietary_restrictions: restrictions.length > 0 ? restrictions : [],
      });
    } catch {
      // silent — not critical
    }
    setSaving(false);
    router.replace('/(tabs)/feed');
  }

  function handleSkip() {
    if (step === 1) {
      setStep(2);
    } else {
      router.replace('/(tabs)/feed');
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <>
            <View style={styles.titleWrap}>
              <Text style={styles.stepLabel}>PASO 1 DE 2</Text>
              <Text style={styles.title}>¿Qué prefieres evitar?</Text>
              <Text style={styles.subtitle}>
                Selecciona los tipos de comida que no te gustan. Esto nos ayuda a personalizar tus recomendaciones.
              </Text>
            </View>

            <View style={styles.chipsGrid}>
              {CUISINE_DISLIKES.map((item) => {
                const active = dislikes.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleDislike(item.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={20}
                      color={active ? '#ba1a1a' : '#727973'}
                    />
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {item.label}
                    </Text>
                    {active && (
                      <MaterialIcons name="close" size={16} color="#ba1a1a" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <View style={styles.titleWrap}>
              <Text style={styles.stepLabel}>PASO 2 DE 2</Text>
              <Text style={styles.title}>¿Restricciones alimentarias?</Text>
              <Text style={styles.subtitle}>
                Selecciona las que apliquen. Puedes cambiarlas en cualquier momento desde tu perfil.
              </Text>
            </View>

            <View style={styles.chipsGrid}>
              {DIETARY_RESTRICTIONS.map((item) => {
                const active = restrictions.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive2]}
                    onPress={() => toggleRestriction(item.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={20}
                      color={active ? '#546b00' : '#727973'}
                    />
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive2]}>
                      {item.label}
                    </Text>
                    {active && (
                      <MaterialIcons name="check" size={16} color="#546b00" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.footer}>
        {step === 1 ? (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Siguiente</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Saltarme esto</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Comenzar</Text>
                  <MaterialIcons name="check" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Saltarme esto</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf9f2',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e6e2db',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c7ef48',
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 140,
  },
  titleWrap: {
    gap: 8,
    marginBottom: 28,
  },
  stepLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 28,
    color: '#032417',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    lineHeight: 20,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f7f3ec',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(186,26,26,0.08)',
    borderColor: 'rgba(186,26,26,0.3)',
  },
  chipActive2: {
    backgroundColor: 'rgba(199,239,72,0.18)',
    borderColor: 'rgba(174,213,46,0.5)',
  },
  chipLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#424844',
  },
  chipLabelActive: {
    fontFamily: 'Manrope-SemiBold',
    color: '#ba1a1a',
  },
  chipLabelActive2: {
    fontFamily: 'Manrope-SemiBold',
    color: '#546b00',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    backgroundColor: 'rgba(253,249,242,0.95)',
    gap: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#032417',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#727973',
  },
});
