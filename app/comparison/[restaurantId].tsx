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
import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store';
import { useUserRanking, useUpdateVisitRank } from '../../lib/hooks/useVisit';
import { recomputeRankPositions, SCORE_BRACKETS } from '../../lib/api/visits';
import { scorePalette } from '../../lib/sentimentColors';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { extractPriceLabel } from '../../lib/api/places';
import { useQueryClient } from '@tanstack/react-query';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop';

type Sentiment = 'loved' | 'fine' | 'disliked';

// ─── Bracket helpers ──────────────────────────────────────────────────────────

const BRACKET_LABELS: Record<Sentiment, string> = {
  loved:    'entre tus favoritos',
  fine:     'entre los que estuvieron bien',
  disliked: 'entre los que no te convencieron',
};

/** Score for inserting at 0-indexed position `idx` in a bracket that will have `total` items. */
function calcBracketScore(sentiment: Sentiment, idx: number, total: number): number {
  const { min, max } = SCORE_BRACKETS[sentiment];
  if (total <= 1) return Math.round(((min + max) / 2) * 10) / 10;
  const s = max - (max - min) * idx / (total - 1);
  return Math.round(s * 10) / 10;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComparisonScreen() {
  // Route params — "restaurantId" holds visitId (legacy naming kept for routing)
  const { restaurantId: visitId, restaurantName, sentiment: sentimentParam } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
    sentiment?: string;
  }>();

  const sentiment = ((sentimentParam ?? 'fine') as Sentiment);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const { data: ranking = [], isLoading } = useUserRanking(currentUser?.id);
  const queryClient = useQueryClient();
  const { mutateAsync: updateRank } = useUpdateVisitRank();

  const newRestaurantName = restaurantName ?? 'Nuevo restaurante';

  // ── Build bracket list ──────────────────────────────────────────────────────
  // Only compare against restaurants in the SAME sentiment category,
  // sorted best-first (rank_score DESC).
  const bracketList = useMemo(
    () =>
      ranking
        .filter((v) => v.id !== visitId && v.sentiment === sentiment)
        .sort((a, b) => (b.rank_score ?? -999) - (a.rank_score ?? -999)),
    [ranking, visitId, sentiment]
  );

  // ── Binary search state ─────────────────────────────────────────────────────
  // lo = left boundary (inclusive), hi = right boundary (exclusive).
  // The restaurant to compare against is at bracketList[mid = floor((lo+hi)/2)].
  // Invariant: new restaurant's final position is in [lo, hi).
  //
  //  • New wins  → hi = mid  (new is better → goes to left of current)
  //  • Existing wins → lo = mid + 1  (existing is better → new goes right)
  //  • Done when lo >= hi → insert at index lo
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [history, setHistory] = useState<Array<{ lo: number; hi: number }>>([]);

  const [done, setDone] = useState(false);
  const [finalPosition, setFinalPosition] = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const finishedRef = useRef(false);

  // Derived: current pivot to compare against
  const mid = Math.floor((lo + hi) / 2);
  const currentComparison = initialized && !done ? bracketList[mid] : null;

  // Max comparisons needed for a bracket of this size = ceil(log2(n+1))
  const maxSteps = Math.max(1, Math.ceil(Math.log2((bracketList.length || 0) + 1)));

  // ── Initialise search when ranking loads ────────────────────────────────────
  useEffect(() => {
    if (isLoading || initialized || finishedRef.current) return;

    if (bracketList.length === 0) {
      // No other restaurants in this bracket → place automatically
      finishComparison(0);
    } else {
      setHi(bracketList.length);
      setInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, bracketList.length, initialized]);

  // ── Animate transition ──────────────────────────────────────────────────────
  function animateTransition(callback: () => void) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 150);
  }

  // ── Finish: save score + recompute all positions ────────────────────────────
  async function finishComparison(insertIdx: number) {
    if (finishedRef.current) return;
    finishedRef.current = true;

    // Score for this position within the bracket
    const totalInBracket = bracketList.length + 1;
    const score = calcBracketScore(sentiment, insertIdx, totalInBracket);

    setSaving(true);
    try {
      // 1. Set preliminary rank on new visit (position within bracket, not global yet)
      await updateRank({ visitId: visitId!, rankPosition: insertIdx + 1, rankScore: score });
      // 2. Recompute ALL scores + global positions so the whole ranking is consistent
      await recomputeRankPositions(currentUser!.id);
    } catch (e) {
      console.error('Error saving rank:', e);
    } finally {
      setSaving(false);
    }

    setFinalScore(score);
    setFinalPosition(insertIdx + 1);
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['ranking', currentUser?.id] });
    showToast(`¡${newRestaurantName} — ${score.toFixed(1)} puntos!`);
    animateTransition(() => setDone(true));
  }

  // ── Choice handler ──────────────────────────────────────────────────────────
  function handleChoose(winner: 'new' | 'existing') {
    const nextLo = winner === 'existing' ? mid + 1 : lo;
    const nextHi = winner === 'new' ? mid : hi;

    setHistory((h) => [...h, { lo, hi }]);

    if (nextLo >= nextHi) {
      animateTransition(() => finishComparison(nextLo));
    } else {
      animateTransition(() => {
        setLo(nextLo);
        setHi(nextHi);
      });
    }
  }

  function handleUndo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    animateTransition(() => {
      setLo(prev.lo);
      setHi(prev.hi);
      setHistory((h) => h.slice(0, -1));
    });
  }

  function handleSkip() {
    // Skip = treat as a draw → insert at midpoint of remaining range
    setHistory((h) => [...h, { lo, hi }]);
    animateTransition(() => finishComparison(mid));
  }

  // ── Progress ────────────────────────────────────────────────────────────────
  const progressPct = initialized && bracketList.length > 0
    ? (bracketList.length - (hi - lo)) / bracketList.length
    : 0;

  // ── Done state ──────────────────────────────────────────────────────────────
  if (done) {
    const bracket = SCORE_BRACKETS[sentiment];
    const scoreColor = sentiment === 'loved' ? '#546b00' : sentiment === 'fine' ? '#424844' : '#ba1a1a';
    return (
      <View style={styles.successContainer}>
        {saving ? (
          <ActivityIndicator size="large" color="#032417" />
        ) : (
          <View style={styles.successCard}>
            <View style={[styles.successBadge, { backgroundColor: sentiment === 'loved' ? '#c7ef48' : sentiment === 'fine' ? '#f1ede6' : '#fff0f0' }]}>
              <Text style={[styles.successScore, { color: scoreColor }]}>{finalScore.toFixed(1)}</Text>
              <Text style={[styles.successScoreLabel, { color: scoreColor }]}>puntos</Text>
            </View>
            <Text style={styles.successTitle}>¡Visita guardada!</Text>
            <Text style={styles.successRestaurant}>{newRestaurantName}</Text>
            <View style={styles.successBracketPill}>
              <Text style={styles.successBracketText}>
                {sentiment === 'loved' ? 'Te encantó' : sentiment === 'fine' ? 'Estuvo bien' : 'No te convenció'}
                {'  '}·{'  '}
                Rango {bracket.min.toFixed(1)}–{bracket.max.toFixed(1)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.85}
              onPress={() => {
                router.dismissAll();
                router.navigate('/ranking');
              }}
            >
              <Text style={styles.successBtnText}>Ver mi ranking →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondaryBtn}
              onPress={() => {
                router.dismissAll();
                router.navigate('/(tabs)/feed');
              }}
            >
              <Text style={styles.successSecondaryText}>Volver al feed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Loading / placing ───────────────────────────────────────────────────────
  if (isLoading || !initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#032417" />
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973' }}>
          {isLoading ? 'Cargando tu ranking...' : 'Guardando posición...'}
        </Text>
      </View>
    );
  }

  const compareWith = currentComparison;

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ubicar en ranking</Text>
        <Text style={styles.headerStep}>
          {history.length + 1}/{maxSteps}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(progressPct * 100, 95)}%` }]} />
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>¿Cuál prefieres?</Text>
          <Text style={styles.subtitle}>
            Comparando{' '}
            <Text style={styles.subtitleHighlight}>"{newRestaurantName}"</Text>
            {' '}{BRACKET_LABELS[sentiment]}
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
                    {compareWith.rank_score?.toFixed(1) ?? '–'} pts
                  </Text>
                </View>
              </View>
              <View style={styles.cardInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{getDisplayName(compareWith.restaurant as any, 'ranking')}</Text>
                  <Text style={styles.cardLocation}>{[(compareWith.restaurant as any).cuisine, extractPriceLabel((compareWith.restaurant as any).price_level) ?? (compareWith.restaurant as any).price_level].filter(Boolean).join(' · ')}</Text>
                </View>
                {compareWith.rank_score != null && (() => {
                    const pal = scorePalette(compareWith.rank_score);
                    return (
                      <View style={[styles.scoreRow, { backgroundColor: pal.badgeBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }]}>
                        <Text style={[styles.scoreValue, { color: pal.badgeText }]}>{compareWith.rank_score.toFixed(1)}</Text>
                        <Text style={[styles.scoreLabel, { color: pal.badgeText }]}>Score</Text>
                      </View>
                    );
                  })()}
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
              style={[styles.secondaryBtn, history.length === 0 && { opacity: 0.3 }]}
              onPress={handleUndo}
              disabled={history.length === 0}
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

        {/* Bracket info pill */}
        <View style={styles.bracketInfo}>
          <Text style={styles.bracketInfoText}>
            <MaterialIcons
              name={sentiment === 'loved' ? 'favorite' : sentiment === 'fine' ? 'thumb-up' : 'thumb-down'}
              size={14}
              color={sentiment === 'loved' ? '#ba1a1a' : sentiment === 'fine' ? '#424844' : '#727973'}
            />
            {'  '}
            {sentiment === 'loved' ? 'Te encantó' : sentiment === 'fine' ? 'Estuvo bien' : 'No te convenció'}
            {'  ·  '}
            Rango {SCORE_BRACKETS[sentiment].min.toFixed(1)}–{SCORE_BRACKETS[sentiment].max.toFixed(1)}
          </Text>
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
  titleSection: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
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
  actions: { marginTop: 16, paddingHorizontal: 16, gap: 12 },
  hardBtn: { backgroundColor: '#f7f3ec', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  hardBtnText: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#424844' },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  secondaryBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#727973' },
  bracketInfo: {
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1ede6',
    borderRadius: 12,
    alignItems: 'center',
  },
  bracketInfoText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: '#424844',
    textAlign: 'center',
  },
  // ── Success ──────────────────────────────────────────────────────────────────
  successContainer: { flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', padding: 32 },
  successCard: {
    width: '100%', backgroundColor: '#ffffff', borderRadius: 32, padding: 32, alignItems: 'center', gap: 16,
    shadowColor: '#1c1c18', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 8,
  },
  successBadge: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  successScore: { fontFamily: 'NotoSerif-Bold', fontSize: 32 },
  successScoreLabel: { fontFamily: 'Manrope-Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 },
  successTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 26, color: '#032417' },
  successRestaurant: { fontFamily: 'NotoSerif-BoldItalic', fontSize: 18, color: '#546b00' },
  successBracketPill: {
    backgroundColor: '#f1ede6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  successBracketText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: '#424844',
  },
  successBtn: { width: '100%', backgroundColor: '#032417', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  successBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#ffffff' },
  successSecondaryBtn: { paddingVertical: 8 },
  successSecondaryText: { fontFamily: 'Manrope-Medium', fontSize: 14, color: '#727973', textDecorationLine: 'underline' },
});
