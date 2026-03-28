/**
 * Refine Ranking — depura tu clasificación comparando pares vecinos inciertos.
 *
 * Solo muestra pares de restaurantes del mismo bracket de sentiment que:
 *  1. Son adyacentes en el ranking (podrían haberse insertado sin compararse directamente), Y
 *  2. Tienen una diferencia de score ≤ umbral = bracket_span / bracket_size
 *     (cuanto más lleno está el bracket, más estrecho es el umbral de "duda").
 *
 * Formato idéntico al de la pantalla de comparación inicial (cards + OR circle).
 * El lenguaje es neutral — "¿Cuál prefieres?" — sin implicar que ya comparaste antes.
 */
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
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store';
import { useUserRanking } from '../lib/hooks/useVisit';
import { swapVisitRanks, recomputeRankPositions, SCORE_BRACKETS } from '../lib/api/visits';
import { sentimentPalette } from '../lib/sentimentColors';
import { getDisplayName } from '../lib/utils/restaurantName';
import type { VisitDetail } from '../lib/api/visits';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop';

type Sentiment = 'loved' | 'fine' | 'disliked';
type Pair = [VisitDetail, VisitDetail]; // [higher-ranked, lower-ranked]

const BRACKET_LABELS: Record<Sentiment, string> = {
  loved:    'entre tus favoritos',
  fine:     'entre los que estuvieron bien',
  disliked: 'entre los que no te convencieron',
};

/**
 * Build uncertain pairs: adjacent within bracket, score diff ≤ threshold.
 * Threshold = bracket_span / bracket_size — narrows as the bracket fills up,
 * so only "neighbor" pairs that could realistically be swapped are shown.
 */
function buildUncertainPairs(ranking: VisitDetail[]): Pair[] {
  const byBracket: Record<Sentiment, VisitDetail[]> = { loved: [], fine: [], disliked: [] };
  for (const v of ranking) {
    const key = (v.sentiment ?? 'fine') as Sentiment;
    if (byBracket[key]) byBracket[key].push(v);
  }

  const pairs: Pair[] = [];

  for (const [key, group] of Object.entries(byBracket) as [Sentiment, VisitDetail[]][]) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => (a.rank_position ?? 999) - (b.rank_position ?? 999));
    const { min, max } = SCORE_BRACKETS[key];
    const span = max - min;
    // Threshold: one "step" worth of score — pairs closer than this may never have been directly compared
    const threshold = span / Math.max(sorted.length - 1, 1);

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const diff = Math.abs((a.rank_score ?? 0) - (b.rank_score ?? 0));
      if (diff <= threshold + 0.05) { // +0.05 tolerance for floating-point rounding
        pairs.push([a, b]);
      }
    }
  }

  // Smallest diff first = most uncertain
  return pairs.sort((a, b) => {
    const dA = Math.abs((a[0].rank_score ?? 0) - (a[1].rank_score ?? 0));
    const dB = Math.abs((b[0].rank_score ?? 0) - (b[1].rank_score ?? 0));
    return dA - dB;
  });
}

export default function RefineRankingScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const { data: ranking = [], isLoading } = useUserRanking(currentUser?.id);
  const queryClient = useQueryClient();

  const pairs = useMemo(() => buildUncertainPairs(ranking), [ranking]);

  const [pairIdx, setPairIdx] = useState(0);
  const [swapped, setSwapped] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const finishedRef = useRef(false);

  function animateTransition(cb: () => void) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 190, useNativeDriver: true }),
    ]).start();
    setTimeout(cb, 140);
  }

  async function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSaving(true);
    try {
      await recomputeRankPositions(currentUser!.id);
      queryClient.invalidateQueries({ queryKey: ['ranking', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      console.error('recompute error', e);
    } finally {
      setSaving(false);
    }
    animateTransition(() => setDone(true));
  }

  async function advance(didSwap: boolean) {
    if (didSwap) setSwapped((n) => n + 1);
    const next = pairIdx + 1;
    if (next >= pairs.length) {
      await finish();
    } else {
      animateTransition(() => setPairIdx(next));
    }
  }

  async function handleChoose(winner: 'higher' | 'lower') {
    const [higher, lower] = pairs[pairIdx];
    if (winner === 'lower') {
      // User prefers the lower-ranked one → swap
      try {
        await swapVisitRanks(
          { id: higher.id, rank_position: higher.rank_position, rank_score: higher.rank_score },
          { id: lower.id, rank_position: lower.rank_position, rank_score: lower.rank_score }
        );
      } catch (e) {
        console.error('swap error', e);
      }
      await advance(true);
    } else {
      await advance(false);
    }
  }

  function handleSkip() {
    animateTransition(() => finish());
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color="#032417" />
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973' }}>
          Cargando tu ranking…
        </Text>
      </View>
    );
  }

  // ── Nothing uncertain ───────────────────────────────────────────────────────
  if (pairs.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 }}>
        <Text style={{ fontSize: 48 }}>🎯</Text>
        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 22, color: '#032417', textAlign: 'center' }}>
          Tu ranking está depurado
        </Text>
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 22 }}>
          No hay pares con dudas en este momento. Vuelve después de añadir más restaurantes.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: '#c7ef48', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, marginTop: 8 }}
        >
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#032417' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.successContainer}>
        {saving ? (
          <ActivityIndicator size="large" color="#032417" />
        ) : (
          <View style={styles.successCard}>
            <View style={styles.successBadge}>
              <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 32, color: '#032417' }}>
                {swapped > 0 ? `+${swapped}` : '✓'}
              </Text>
            </View>
            <Text style={styles.successTitle}>
              {swapped > 0 ? 'Ranking ajustado' : 'Ranking confirmado'}
            </Text>
            <Text style={styles.successSub}>
              {swapped > 0
                ? `Has intercambiado ${swapped} par${swapped > 1 ? 'es' : ''} y recalculado todos los scores.`
                : 'El orden de tus restaurantes está bien. Scores actualizados.'}
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.85}
              onPress={() => {
                router.dismissAll();
                router.navigate('/ranking');
              }}
            >
              <Text style={styles.successBtnText}>Ver ranking →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondaryBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.successSecondaryText}>Volver a Listas</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Main comparison — mismo formato que comparison/[restaurantId] ─────────
  const [higher, lower] = pairs[pairIdx];
  const sentiment = (higher.sentiment ?? 'fine') as Sentiment;
  const higherPal = sentimentPalette(higher.sentiment as any);
  const lowerPal = sentimentPalette(lower.sentiment as any);
  const maxSteps = pairs.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Depurar ranking</Text>
        <Text style={styles.headerStep}>{pairIdx + 1}/{maxSteps}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(pairIdx / maxSteps) * 100}%` }]} />
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>¿Cuál prefieres?</Text>
          <Text style={styles.subtitle}>
            Para ordenar{' '}
            <Text style={styles.subtitleHighlight}>{BRACKET_LABELS[sentiment]}</Text>
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.comparisonWrapper}>
          {/* Higher-ranked card */}
          <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => handleChoose('higher')}>
            <View style={styles.cardImageWrapper}>
              <Image
                source={{ uri: higher.restaurant.cover_image_url ?? PLACEHOLDER }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{higher.rank_position ?? '–'} ACTUAL</Text>
              </View>
            </View>
            <View style={styles.cardInfo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{getDisplayName(higher.restaurant as any, 'ranking')}</Text>
                <Text style={styles.cardLocation}>{[(higher.restaurant as any).cuisine, (higher.restaurant as any).price_level ? '€'.repeat((higher.restaurant as any).price_level) : null].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={[styles.scoreRow, { backgroundColor: higherPal.badgeBg }]}>
                <Text style={[styles.scoreValue, { color: higherPal.badgeText }]}>{(higher.rank_score ?? 0).toFixed(1)}</Text>
                <Text style={[styles.scoreLabel, { color: higherPal.badgeText }]}>Score</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* OR circle */}
          <View style={styles.orCircle}>
            <Text style={styles.orText}>OR</Text>
          </View>

          {/* Lower-ranked card */}
          <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => handleChoose('lower')}>
            <View style={styles.cardImageWrapper}>
              <Image
                source={{ uri: lower.restaurant.cover_image_url ?? PLACEHOLDER }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={[styles.rankBadge, styles.rankBadgeSecondary]}>
                <Text style={[styles.rankBadgeText, { color: '#727973' }]}>#{lower.rank_position ?? '–'} ACTUAL</Text>
              </View>
            </View>
            <View style={styles.cardInfo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{getDisplayName(lower.restaurant as any, 'ranking')}</Text>
                <Text style={styles.cardLocation}>{[(lower.restaurant as any).cuisine, (lower.restaurant as any).price_level ? '€'.repeat((lower.restaurant as any).price_level) : null].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={[styles.scoreRow, { backgroundColor: lowerPal.badgeBg }]}>
                <Text style={[styles.scoreValue, { color: lowerPal.badgeText }]}>{(lower.rank_score ?? 0).toFixed(1)}</Text>
                <Text style={[styles.scoreLabel, { color: lowerPal.badgeText }]}>Score</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.hardBtn} activeOpacity={0.85} onPress={() => handleChoose('higher')}>
            <Text style={styles.hardBtnText}>Muy difícil de elegir</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <View style={{ width: 80 }} />
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
              <Text style={styles.secondaryBtnText}>Terminar</Text>
              <MaterialIcons name="done-all" size={18} color="#727973" />
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
  rankBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#032417', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  rankBadgeSecondary: { backgroundColor: '#f1ede6' },
  rankBadgeText: { fontFamily: 'Manrope-ExtraBold', fontSize: 10, color: '#ffffff', letterSpacing: 2 },
  cardInfo: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'NotoSerif-Bold', fontSize: 18, color: '#032417' },
  cardLocation: { fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973', marginTop: 2 },
  scoreRow: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  scoreValue: { fontFamily: 'NotoSerif-Bold', fontSize: 22 },
  scoreLabel: { fontFamily: 'Manrope-Bold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
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
  // Success
  successContainer: { flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', padding: 32 },
  successCard: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 32, padding: 32, alignItems: 'center', gap: 16,
    shadowColor: '#1c1c18', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 8,
  },
  successBadge: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#c7ef48', alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 26, color: '#032417' },
  successSub: { fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 22 },
  successBtn: { width: '100%', backgroundColor: '#032417', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  successBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#ffffff' },
  successSecondaryBtn: { paddingVertical: 8 },
  successSecondaryText: { fontFamily: 'Manrope-Medium', fontSize: 14, color: '#727973', textDecorationLine: 'underline' },
});
