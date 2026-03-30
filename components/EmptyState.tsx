import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type EmptyStateProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaOnPress?: () => void;
  secondaryLabel?: string;
  secondaryOnPress?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  ctaOnPress,
  secondaryLabel,
  secondaryOnPress,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
        <MaterialIcons name={icon} size={compact ? 28 : 36} color="#c7ef48" />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
      {ctaLabel && ctaOnPress ? (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={ctaOnPress}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {secondaryLabel && secondaryOnPress ? (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={secondaryOnPress}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: 16,
  },
  containerCompact: {
    paddingTop: 24,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleCompact: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: '#032417',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: '#032417',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 8,
  },
  ctaText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#032417',
    textDecorationLine: 'underline',
  },
});
