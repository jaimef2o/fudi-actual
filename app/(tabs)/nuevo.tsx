import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../lib/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

export default function NuevoScreen() {
  // ── Animations ─────────────────────────────────────────────────────────
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;
  const card1Scale = useRef(new Animated.Value(0.85)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Scale = useRef(new Animated.Value(0.85)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 22, stiffness: 220, mass: 0.9, useNativeDriver: true }),
    ]).start();

    // Staggered card entrances
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(card1Scale, { toValue: 1, damping: 16, stiffness: 200, useNativeDriver: true }),
        Animated.timing(card1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 100);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(card2Scale, { toValue: 1, damping: 16, stiffness: 200, useNativeDriver: true }),
        Animated.timing(card2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 200);

    // Subtle glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function handleDismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 400, duration: 250, useNativeDriver: true }),
    ]).start(() => router.back());
  }

  function handleOption(route: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(route as any);
  }

  return (
    <View style={s.container}>
      {/* Blurred backdrop */}
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
        {/* Drag handle */}
        <View style={s.handleRow}>
          <View style={s.handle} />
        </View>

        {/* Close button */}
        <TouchableOpacity style={s.closeBtn} onPress={handleDismiss} activeOpacity={0.7}>
          <MaterialIcons name="close" size={20} color={COLORS.outline} />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerLabel}>NUEVA ACTIVIDAD</Text>
          <Text style={s.headerTitle}>¿Qué quieres hacer?</Text>
        </View>

        {/* Option 1 — ¿Qué pedimos? (Hero card, dark) */}
        <Animated.View style={{ transform: [{ scale: card1Scale }], opacity: card1Opacity }}>
          <TouchableOpacity
            style={s.heroCard}
            activeOpacity={0.88}
            onPress={() => handleOption('/select-restaurant')}
          >
            <LinearGradient
              colors={['#1a3a2b', '#0d2a1c', '#032417']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroGradient}
            >
              {/* Animated glow accent */}
              <Animated.View style={[s.heroGlow, { opacity: glowOpacity }]} />

              <View style={s.heroContent}>
                {/* Icon */}
                <View style={s.heroIconWrap}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={26} color={COLORS.secondaryContainer} />
                </View>

                {/* Text */}
                <View style={s.heroText}>
                  <Text style={s.heroTitle}>¿Qué pedimos?</Text>
                  <Text style={s.heroSubtitle}>
                    Descubre qué piden tus amigos antes de sentarte a la mesa
                  </Text>
                </View>

                {/* Arrow */}
                <View style={s.heroArrow}>
                  <MaterialIcons name="arrow-forward" size={20} color={COLORS.secondaryContainer} />
                </View>
              </View>

              {/* Decorative badge */}
              <View style={s.heroBadge}>
                <MaterialIcons name="auto-awesome" size={12} color={COLORS.onSecondaryContainer} />
                <Text style={s.heroBadgeText}>RECOMENDACIONES</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Option 2 — Registrar visita (Lima accent card) */}
        <Animated.View style={{ transform: [{ scale: card2Scale }], opacity: card2Opacity }}>
          <TouchableOpacity
            style={s.visitCard}
            activeOpacity={0.88}
            onPress={() => handleOption('/registrar-visita')}
          >
            <View style={s.visitContent}>
              {/* Icon */}
              <View style={s.visitIconWrap}>
                <MaterialIcons name="add" size={26} color={COLORS.primary} />
              </View>

              {/* Text */}
              <View style={s.visitText}>
                <Text style={s.visitTitle}>Registrar visita</Text>
                <Text style={s.visitSubtitle}>
                  Documenta tu experiencia y comparte con tu círculo
                </Text>
              </View>

              {/* Arrow */}
              <View style={s.visitArrow}>
                <MaterialIcons name="arrow-forward" size={18} color={COLORS.primary} />
              </View>
            </View>

            {/* Bottom accent strip */}
            <View style={s.visitAccent}>
              <View style={s.visitAccentDot} />
              <Text style={s.visitAccentText}>Puntúa, rankea y comparte</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom hint */}
        <View style={s.hintRow}>
          <MaterialIcons name="swipe-down" size={14} color={COLORS.outlineVariant} />
          <Text style={s.hintText}>Desliza hacia abajo para cerrar</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,36,23,0.55)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
    gap: 14,
  },

  // Handle
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 2,
  },

  // Close
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
    gap: 6,
  },
  headerLabel: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: COLORS.secondaryContainer,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 26,
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // ── Hero card (dark, ¿Qué pedimos?) ──────────────────────────────
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  heroGradient: {
    padding: 22,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.secondaryContainer,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(199,239,72,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(199,239,72,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 19,
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: COLORS.onPrimaryContainer,
    lineHeight: 18,
  },
  heroArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(199,239,72,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(199,239,72,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(199,239,72,0.15)',
  },
  heroBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.secondaryContainer,
    letterSpacing: 1.5,
  },

  // ── Visit card (light, lima accent) ──────────────────────────────
  visitCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  visitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  visitIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitText: {
    flex: 1,
    gap: 3,
  },
  visitTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: COLORS.primary,
    letterSpacing: -0.2,
  },
  visitSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  visitArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    borderTopWidth: 0,
  },
  visitAccentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondaryContainer,
  },
  visitAccentText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: COLORS.outline,
    letterSpacing: 0.5,
  },

  // ── Bottom hint ──────────────────────────────────────────────────
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  hintText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: COLORS.outlineVariant,
  },
});
