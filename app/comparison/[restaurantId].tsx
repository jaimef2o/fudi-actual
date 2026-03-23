import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';
import { useUserRanking, useUpdateVisitRank } from '../../lib/hooks/useVisit';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop';

export default function ComparisonScreen() {
  // The route param "restaurantId" holds the visitId (legacy naming)
  const { restaurantId: visitId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
  }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: ranking = [], isLoading } = useUserRanking(currentUser?.id);
  const { mutateAsync: updateRank } = useUpdateVisitRank();

  // Exclude the current visit from the ranking list to compare against
  const existingRanking = ranking.filter((v) => v.id !== visitId);

  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [finalPosition, setFinalPosition] = useState(1);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // Prevent finishComparison from firing more than once (e.g. on ranking refetch)
  const finishedRef = useRef(false);

  const newRestaurantName = restaurantName ?? 'Nuevo restaurante';

  // Build binary search steps from real ranking
  function buildSteps() {
    if (existingRanking.length === 0) return [];
    const mid = Math.floor(existingRanking.length / 2);
    const steps: number[] = [mid];
    if (existingRanking.length > 1) {
      steps.push(0);
      if (mid + 1 < existingRanking.length) steps.push(mid + 1);
    }
    return steps;
  }

  const steps = buildSteps();
  const step = steps[stepIndex] !== undefined ? existingRanking[steps[stepIndex]] : null;

  function animateTransition(callback: () => void) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 150);
  }

  async function finishComparison(position: number) {
    // Score: position 1 = 10.0, each step down = -0.3 (rough approximation)
    const rankScore = Math.max(1, Math.round((10 - (position - 1) * 0.5) * 10) / 10);
    setSaving(true);
    try {
      await updateRank({ visitId: visitId!, rankPosition: position, rankScore });
    } catch (e) {
      console.error('Error saving rank:', e);
    } finally {
      setSaving(false);
    }
    setFinalPosition(position);
    animateTransition(() => setDone(true));
  }

  function handleChoose(winner: 'new' | 'existing') {
    const newHistory = [...history, winner];
    setHistory(newHistory);

    if (stepIndex >= steps.length - 1 || steps.length === 0) {
      const wins = newHistory.filter((h) => h === 'new').length;
      const position = Math.max(1, existingRanking.length - wins + 1);
      finishComparison(position);
    } else {
      animateTransition(() => setStepIndex(stepIndex + 1));
    }
  }

  function handleUndo() {
    if (stepIndex === 0) return;
    animateTransition(() => {
      setHistory(history.slice(0, -1));
      setStepIndex(stepIndex - 1);
    });
  }

  function handleSkip() {
    animateTransition(() => {
      if (stepIndex >= steps.length - 1) {
        finishComparison(Math.floor(existingRanking.length / 2) + 1);
      } else {
        setStepIndex(stepIndex + 1);
      }
    });
  }

  // If no existing ranking, auto-place at position 1 (first visit ever)
  useEffect(() => {
    if (!isLoading && existingRanking.length === 0 && !finishedRef.current) {
      finishedRef.current = true;
      finishComparison(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, existingRanking.length]);

  // Done state — checked FIRST so a ranking refetch can't snap back to the spinner
  if (done) {
    return (
      <View style={styles.successContainer}>
        {saving ? (
          <ActivityIndicator size="large" color="#032417" />
        ) : (
          <View style={styles.successCard}>
            <View style={styles.successBadge}>
              <Text style={styles.successPosition}>#{finalPosition}</Text>
            </View>
            <Text style={styles.successTitle}>¡Visita guardada!</Text>
            <Text style={styles.successRestaurant}>{newRestaurantName}</Text>
            <Text style={styles.successSub}>
              Ha entrado en la posición{' '}
              <Text style={styles.successHighlight}>#{finalPosition}</Text>{' '}
              de tu ranking personal.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.85}
              onPress={() => router.replace('/ranking')}
            >
              <Text style={styles.successBtnText}>Ver mi ranking →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondaryBtn}
              onPress={() => router.replace('/(tabs)/feed')}
            >
              <Text style={styles.successSecondaryText}>Volver al feed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Loading/placing state (shown before first comparison or while auto-placing first visit)
  if (isLoading || existingRanking.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#032417" />
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973' }}>
          {isLoading ? 'Cargando tu ranking...' : 'Guardando posición...'}
        </Text>
      </View>
    );
  }

  const compareWith = step;

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ubicar en ranking</Text>
        <Text style={styles.headerStep}>{stepIndex + 1}/{steps.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((stepIndex + 1) / Math.max(steps.length, 1)) * 100}%` }]} />
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>¿Cuál prefieres?</Text>
          <Text style={styles.subtitle}>
            Para ubicar{' '}
            <Text style={styles.subtitleHighlight}>"{newRestaurantName}"</Text>
            {' '}en tu ranking
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.comparisonWrapper}>
          {/* NEW */}
          <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => handleChoose('new')}>
            <View style={styles.cardImageWrapper}>
              <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NUEVO</Text>
              </View>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{newRestaurantName}</Text>
              <View style={styles.cardMeta}>
                <MaterialIcons name="place" size={14} color="#727973" />
                <Text style={styles.cardMetaText}>Recién visitado</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* OR */}
          <View style={styles.orCircle}>
            <Text style={styles.orText}>OR</Text>
          </View>

          {/* EXISTING */}
          {compareWith && (
            <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => handleChoose('existing')}>
              <View style={styles.cardImageWrapper}>
                <Image
                  source={{ uri: compareWith.restaurant.cover_image_url ?? PLACEHOLDER_IMAGE }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.historicBadge}>
                  <Text style={styles.historicBadgeText}>
                    #{compareWith.rank_position ?? steps[stepIndex] + 1} ACTUAL
                  </Text>
                </View>
              </View>
              <View style={styles.cardInfo}>
                <View>
                  <Text style={styles.cardName}>{compareWith.restaurant.name}</Text>
                  <Text style={styles.cardLocation}>{compareWith.restaurant.neighborhood ?? ''}</Text>
                </View>
                {compareWith.rank_score != null && (
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreValue}>{compareWith.rank_score.toFixed(1)}</Text>
                    <Text style={styles.scoreLabel}>Score</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.hardBtn} activeOpacity={0.85} onPress={() => handleChoose('existing')}>
            <Text style={styles.hardBtnText}>Muy difícil de elegir</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, stepIndex === 0 && { opacity: 0.3 }]}
              onPress={handleUndo}
              disabled={stepIndex === 0}
            >
              <MaterialIcons name="undo" size={18} color="#727973" />
              <Text style={styles.secondaryBtnText}>Deshacer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
              <Text style={styles.secondaryBtnText}>Saltar</Text>
              <MaterialIcons name="skip-next" size={18} color="#727973" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: Platform.OS === 'ios' ? 108 : 88,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(253,249,242,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontFamily: 'Manrope-Bold', fontSize: 18, color: '#032417', flex: 1, textAlign: 'center' },
  headerStep: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#727973' },
  progressBar: { height: 3, backgroundColor: '#e6e2db' },
  progressFill: { height: 3, backgroundColor: '#c7ef48', borderRadius: 2 },
  titleSection: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  mainTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 28, color: '#032417', marginBottom: 6 },
  subtitle: { fontFamily: 'Manrope-Medium', fontSize: 14, color: '#424844', textAlign: 'center', lineHeight: 20 },
  subtitleHighlight: { fontFamily: 'NotoSerif-BoldItalic', color: '#032417' },
  comparisonWrapper: { paddingHorizontal: 16, gap: 12, position: 'relative' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  cardImageWrapper: { aspectRatio: 16 / 9, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  newBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#c7ef48', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  newBadgeText: { fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: '#546b00', letterSpacing: 2 },
  historicBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#032417', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  historicBadgeText: { fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: '#ffffff', letterSpacing: 2 },
  cardInfo: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'NotoSerif-Bold', fontSize: 18, color: '#032417' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaText: { fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973' },
  cardLocation: { fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973', marginTop: 2 },
  scoreRow: { alignItems: 'flex-end' },
  scoreValue: { fontFamily: 'NotoSerif-Bold', fontSize: 22, color: '#546b00' },
  scoreLabel: { fontFamily: 'Manrope-Bold', fontSize: 9, color: '#727973', textTransform: 'uppercase', letterSpacing: 1 },
  orCircle: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -22, marginLeft: -22,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#032417',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
    borderWidth: 5, borderColor: '#fdf9f2',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  orText: { fontFamily: 'NotoSerif-BoldItalic', fontSize: 13, color: '#ffffff' },
  actions: { marginTop: 20, paddingHorizontal: 16, gap: 12 },
  hardBtn: { backgroundColor: '#f7f3ec', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  hardBtnText: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#424844' },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  secondaryBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#727973' },
  successContainer: { flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', padding: 32 },
  successCard: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 32, padding: 32, alignItems: 'center', gap: 16,
    shadowColor: '#1c1c18', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 8,
  },
  successBadge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#c7ef48', alignItems: 'center', justifyContent: 'center',
  },
  successPosition: { fontFamily: 'NotoSerif-Bold', fontSize: 28, color: '#032417' },
  successTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 26, color: '#032417' },
  successRestaurant: { fontFamily: 'NotoSerif-BoldItalic', fontSize: 18, color: '#546b00' },
  successSub: { fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 22 },
  successHighlight: { fontFamily: 'Manrope-Bold', color: '#032417' },
  successBtn: { width: '100%', backgroundColor: '#032417', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  successBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#ffffff' },
  successSecondaryBtn: { paddingVertical: 8 },
  successSecondaryText: { fontFamily: 'Manrope-Medium', fontSize: 14, color: '#727973', textDecorationLine: 'underline' },
});
