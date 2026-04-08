import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { MapView, Marker, Callout, MAPS_AVAILABLE } from '../../lib/maps';
import { scorePalette } from '../../lib/sentimentColors';
import { useUserRanking } from '../../lib/hooks/useVisit';
import { useProfile } from '../../lib/hooks/useProfile';
import { useAppStore } from '../../store';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { COLORS } from '../../lib/theme/colors';

type MapPin = {
  key: string;
  lat: number;
  lng: number;
  name: string;
  neighborhood: string | null;
  cuisine: string | null;
  score: number;
  restaurantId: string;
};

export default function ProfileMapScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const targetUserId = (!userId || userId === 'me') ? currentUser?.id : userId;

  const { data: ranking = [], isLoading } = useUserRanking(targetUserId || undefined);
  const { data: profile } = useProfile(targetUserId || undefined);
  const isOwn = targetUserId === currentUser?.id;
  const profileName = (profile as any)?.name || 'Usuario';

  // Build pins from ranking data (deduplicated visits with restaurant info)
  const mapPins: MapPin[] = useMemo(() => {
    const pins: MapPin[] = [];
    const seenRestaurants = new Set<string>();
    for (const visit of ranking as any[]) {
      const r = visit.restaurant;
      if (!r || seenRestaurants.has(r.id)) continue;
      const lat = r.lat != null ? Number(r.lat) : null;
      const lng = r.lng != null ? Number(r.lng) : null;
      if (!lat || !lng) continue;
      seenRestaurants.add(r.id);
      pins.push({
        key: r.id,
        lat,
        lng,
        name: getDisplayName(r, 'search'),
        neighborhood: r.neighborhood ?? null,
        cuisine: r.cuisine ?? null,
        score: visit.rank_score ?? 0,
        restaurantId: r.id,
      });
    }
    return pins;
  }, [ranking]);

  const mapRegion = useMemo(() => {
    if (mapPins.length === 0) {
      return { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    const lats = mapPins.map((p) => p.lat);
    const lngs = mapPins.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.4),
    };
  }, [mapPins]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isOwn ? 'Mi mapa' : `Mapa de ${profileName}`}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <MaterialIcons name="place" size={16} color={COLORS.onSecondaryContainer} />
        <Text style={styles.statsText}>
          {mapPins.length} {mapPins.length === 1 ? 'restaurante' : 'restaurantes'} visitados
        </Text>
      </View>

      {/* Map */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !MAPS_AVAILABLE || !MapView ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MaterialIcons name="map" size={48} color={COLORS.outlineVariant} />
          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 15, color: COLORS.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
            El mapa no está disponible en esta plataforma
          </Text>
        </View>
      ) : mapPins.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MaterialIcons name="explore-off" size={48} color={COLORS.outlineVariant} />
          <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 16, color: COLORS.primary, marginTop: 12, textAlign: 'center' }}>
            {isOwn ? 'Aún no has visitado restaurantes' : `${profileName} aún no tiene visitas`}
          </Text>
          <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: COLORS.outline, marginTop: 6, textAlign: 'center' }}>
            Los restaurantes visitados aparecerán aquí con sus puntuaciones.
          </Text>
        </View>
      ) : (
        <MapView
          style={{ flex: 1 }}
          initialRegion={mapRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {mapPins.map((pin) => {
            const pal = scorePalette(pin.score);
            const displayScore = pin.score > 0 ? pin.score.toFixed(1) : '—';
            return (
              <Marker
                key={pin.key}
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                onCalloutPress={() => router.push(`/restaurant/${pin.restaurantId}`)}
              >
                {/* Custom pin */}
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.pinBody, { backgroundColor: pal.badgeBg }]}>
                    <Text style={[styles.pinScore, { color: pal.badgeText }]}>{displayScore}</Text>
                  </View>
                  <View style={[styles.pinTail, {
                    borderTopColor: pal.badgeBg,
                  }]} />
                </View>

                {/* Callout tooltip */}
                <Callout tooltip onPress={() => router.push(`/restaurant/${pin.restaurantId}`)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutName} numberOfLines={1}>{pin.name}</Text>
                    {(pin.neighborhood || pin.cuisine) && (
                      <Text style={styles.calloutMeta} numberOfLines={1}>
                        {[pin.neighborhood, pin.cuisine].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                    <View style={styles.calloutRow}>
                      <View style={[styles.calloutBadge, { backgroundColor: pal.badgeBg }]}>
                        <Text style={[styles.calloutBadgeText, { color: pal.badgeText }]}>
                          {displayScore}
                        </Text>
                      </View>
                      <Text style={styles.calloutAction}>Ver restaurante →</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.90)',
  },
  headerBtn: {
    padding: 10,
    borderRadius: 999,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: COLORS.primary,
    flex: 1,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Platform.OS === 'ios' ? 112 : 92,
    paddingBottom: 10,
    backgroundColor: COLORS.secondaryContainer,
  },
  statsText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.onSecondaryContainer,
  },
  // Pin styles
  pinBody: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 36,
    alignItems: 'center',
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pinScore: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 13,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  // Callout styles
  callout: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 12,
    minWidth: 180,
    maxWidth: 260,
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  calloutName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 15,
    color: COLORS.primary,
    marginBottom: 2,
  },
  calloutMeta: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: COLORS.outline,
    marginBottom: 8,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calloutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  calloutBadgeText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 14,
  },
  calloutAction: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: COLORS.onSecondaryContainer,
  },
});
