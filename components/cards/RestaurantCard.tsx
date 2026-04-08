import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../lib/theme/colors';
import { scorePalette } from '../../lib/sentimentColors';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { InfoTag } from '../InfoTag';

// ── Types ────────────────────────────────────────────────────────────────────

interface FriendAvatar {
  id: string;
  avatar_url: string | null;
}

interface RestaurantData {
  id: string;
  name: string;
  neighborhood?: string | null;
  city?: string | null;
  cuisine?: string | null;
  cover_image_url?: string | null;
  price_level?: number | null;
  chain_name?: string | null;
  score: number;
  visitCount?: number;
}

interface RestaurantCardProps {
  restaurant: RestaurantData;
  friendAvatars?: FriendAvatar[];
  cardWidth: number;
  imageHeight: number;
  onPress: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RestaurantCard({
  restaurant,
  friendAvatars = [],
  cardWidth,
  imageHeight,
  onPress,
}: RestaurantCardProps) {
  const r = restaurant;
  const pal = scorePalette(r.score);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={[styles.imageWrapper, { height: imageHeight }]}>
        {r.cover_image_url ? (
          <ExpoImage
            source={{ uri: r.cover_image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <MaterialIcons name="restaurant" size={32} color="rgba(199,239,72,0.4)" />
          </View>
        )}
        {/* Score badge */}
        <View style={[styles.scoreBadge, { backgroundColor: pal.badgeBg }]}>
          <Text style={[styles.scoreText, { color: pal.badgeText }]}>
            {r.score.toFixed(1)}
          </Text>
        </View>
        {/* Friend avatars */}
        {friendAvatars.length > 0 && (
          <View style={styles.avatarRow}>
            {friendAvatars.slice(0, 3).map((f, i) => (
              <Image
                key={f.id}
                source={
                  f.avatar_url
                    ? { uri: f.avatar_url }
                    : require('../../assets/icon.png')
                }
                style={[styles.avatar, i > 0 && { marginLeft: -8 }]}
              />
            ))}
          </View>
        )}
      </View>
      {/* Meta below image */}
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={2}>
          {getDisplayName(r as Parameters<typeof getDisplayName>[0], 'search')}
        </Text>
        {r.chain_name ? (
          <Text style={styles.location} numberOfLines={1}>
            Múltiples ubicaciones
          </Text>
        ) : (r.neighborhood || r.city) ? (
          <Text style={styles.location} numberOfLines={1}>
            {r.neighborhood && r.city && r.neighborhood.toLowerCase() !== r.city.toLowerCase()
              ? `${r.neighborhood} · ${r.city}`
              : r.neighborhood || r.city}
          </Text>
        ) : null}
        <View style={styles.chips}>
          <InfoTag value={r.cuisine} />
          <InfoTag value={r.price_level} />
          {r.visitCount != null && r.visitCount > 0 && (
            <View style={styles.visitsChip}>
              <Text style={styles.visitsText}>
                {r.visitCount} {r.visitCount === 1 ? 'visita' : 'visitas'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexGrow: 0,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceContainerLowest,
    marginBottom: 4,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: COLORS.onSurface,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  scoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 15,
  },
  avatarRow: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.surfaceContainerLowest,
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  meta: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  name: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 19,
  },
  location: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  visitsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  visitsText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.onSecondaryContainer,
  },
});
