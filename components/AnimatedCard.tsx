/**
 * AnimatedCard — TouchableOpacity with a spring scale press animation.
 * Drop-in replacement for TouchableOpacity on any card or button that
 * should feel alive when tapped (Instagram / Airbnb style).
 */
import { useRef } from 'react';
import { Animated, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedCardProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  /** If true, fires a Light haptic impact on press-in. Default: false */
  haptic?: boolean;
  activeOpacity?: number;
  disabled?: boolean;
}

export function AnimatedCard({
  onPress,
  onLongPress,
  style,
  children,
  haptic = false,
  activeOpacity = 1,
  disabled = false,
}: AnimatedCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.965,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 0,
    }).start();
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 18,
      bounciness: 10,
    }).start();
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
