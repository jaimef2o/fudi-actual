/**
 * Reusable animation primitives — Reanimated 3.
 *
 * FadeIn:          fade + slide-up on mount
 * StaggerItem:     fade + slide-up with index-based delay
 * ScoreReveal:     scale-pop for score badges
 * PressableScale:  spring scale on press (Reanimated version of AnimatedCard)
 *
 * On web, animations are skipped (pass-through) to avoid Reanimated
 * compatibility issues that can leave items invisible.
 */
import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  FadeIn as RNFadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  LinearTransition,
} from 'react-native-reanimated';

const IS_WEB = Platform.OS === 'web';

// ── FadeIn — single element fade + slide up ─────────────────────────────────

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeIn({
  children,
  delay = 0,
  duration = 400,
  translateY = 16,
  style,
}: FadeInProps) {
  // On web, skip Reanimated to avoid opacity:0 stuck bug
  if (IS_WEB) {
    return <View style={style as any}>{children}</View>;
  }

  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(translateY);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
    offsetY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.out(Easing.quad) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ── StaggerItem — for lists: fade + slide with staggered delay ──────────────

type StaggerItemProps = {
  children: React.ReactNode;
  index: number;
  staggerMs?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
};

export function StaggerItem({
  children,
  index,
  staggerMs = 60,
  duration = 350,
  translateY = 20,
  style,
}: StaggerItemProps) {
  // On web, skip Reanimated to avoid opacity:0 stuck bug
  if (IS_WEB) {
    return <View style={style as any}>{children}</View>;
  }

  const delay = Math.min(index * staggerMs, 600); // cap at 600ms total
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(translateY);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    offsetY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ── ScoreReveal — pop-in for score badges ───────────────────────────────────

type ScoreRevealProps = {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function ScoreReveal({ children, delay = 200, style }: ScoreRevealProps) {
  // On web, skip Reanimated to avoid opacity:0 stuck bug
  if (IS_WEB) {
    return <View style={style as any}>{children}</View>;
  }

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 180, mass: 0.8 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ── Re-export Reanimated's built-in entering animations for convenience ─────

export { FadeInDown, FadeInUp, SlideInRight, LinearTransition };
export { RNFadeIn };
