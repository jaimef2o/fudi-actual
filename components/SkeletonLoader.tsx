/**
 * SkeletonLoader — shimmer placeholders for loading states
 *
 * Usage:
 *   const shimmer = useShimmer();
 *   <SkeletonBox shimmer={shimmer} height={48} width="70%" />
 */
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_W = Dimensions.get('window').width;
const SHIMMER_W = SCREEN_W * 1.2; // wider than screen so it covers edge-to-edge

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useShimmer() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    ).start();
    return () => shimmer.stopAnimation();
  }, [shimmer]);

  return shimmer;
}

// ─── base box ─────────────────────────────────────────────────────────────────

export function SkeletonBox({
  shimmer,
  height,
  width,
  style,
  radius = 10,
}: {
  shimmer: Animated.Value;
  height: number;
  width?: number | string;
  style?: object;
  radius?: number;
}) {
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_W, SHIMMER_W],
  });

  return (
    <View
      style={[
        {
          height,
          width: width ?? '100%',
          backgroundColor: '#e6e2db',
          borderRadius: radius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.55)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SHIMMER_W }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Feed card skeleton ────────────────────────────────────────────────────────

export function FeedCardSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  return (
    <View style={skStyles.card}>
      {/* Header */}
      <View style={skStyles.cardHeader}>
        <SkeletonBox shimmer={shimmer} height={40} width={40} radius={20} />
        <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
          <SkeletonBox shimmer={shimmer} height={12} width="45%" radius={6} />
          <SkeletonBox shimmer={shimmer} height={10} width="28%" radius={6} />
        </View>
        <SkeletonBox shimmer={shimmer} height={30} width={52} radius={15} />
      </View>
      {/* Image */}
      <SkeletonBox shimmer={shimmer} height={SCREEN_W - 32} radius={0} />
      {/* Actions + caption */}
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBox shimmer={shimmer} height={20} width={60} radius={8} />
          <SkeletonBox shimmer={shimmer} height={20} width={60} radius={8} />
        </View>
        <SkeletonBox shimmer={shimmer} height={12} width="88%" radius={6} />
        <SkeletonBox shimmer={shimmer} height={12} width="65%" radius={6} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <SkeletonBox shimmer={shimmer} height={28} width={90} radius={14} />
          <SkeletonBox shimmer={shimmer} height={28} width={80} radius={14} />
          <SkeletonBox shimmer={shimmer} height={28} width={60} radius={14} />
        </View>
      </View>
    </View>
  );
}

// ─── Ranking item skeleton (Histórico in Listas) ───────────────────────────────

export function RankingItemSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  return (
    <View style={skStyles.rankItem}>
      <SkeletonBox shimmer={shimmer} height={64} width={64} radius={12} />
      <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
        <SkeletonBox shimmer={shimmer} height={14} width="65%" radius={7} />
        <SkeletonBox shimmer={shimmer} height={11} width="42%" radius={5} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SkeletonBox shimmer={shimmer} height={22} width={55} radius={11} />
          <SkeletonBox shimmer={shimmer} height={22} width={45} radius={11} />
        </View>
      </View>
      <SkeletonBox shimmer={shimmer} height={48} width={48} radius={24} />
    </View>
  );
}

// ─── Saved item skeleton (Guardados in Listas) ────────────────────────────────

export function SavedItemSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  return (
    <View style={[skStyles.rankItem, { paddingVertical: 10 }]}>
      <SkeletonBox shimmer={shimmer} height={60} width={60} radius={12} />
      <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
        <SkeletonBox shimmer={shimmer} height={13} width="70%" radius={6} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SkeletonBox shimmer={shimmer} height={20} width={60} radius={10} />
          <SkeletonBox shimmer={shimmer} height={20} width={45} radius={10} />
        </View>
      </View>
      <SkeletonBox shimmer={shimmer} height={11} width={36} radius={5} />
    </View>
  );
}

// ─── Discover card skeleton ────────────────────────────────────────────────────

export function DiscoverCardSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  const cardW = (SCREEN_W - 48) / 2;
  return (
    <View style={[skStyles.discoverCard, { width: cardW }]}>
      <SkeletonBox shimmer={shimmer} height={cardW * 1.25} radius={14} />
      <View style={{ padding: 10, gap: 7 }}>
        <SkeletonBox shimmer={shimmer} height={13} width="80%" radius={6} />
        <SkeletonBox shimmer={shimmer} height={10} width="55%" radius={5} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.2)',
  },
  discoverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
});
