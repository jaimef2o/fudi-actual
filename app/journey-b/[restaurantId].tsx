import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useRestaurant, useRelevantRestaurantIds, useFriendStats } from '../../lib/hooks/useRestaurant';
import { useFriendDishesForRestaurant } from '../../lib/hooks/useDishes';
import { useAppStore } from '../../store';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? 'es' : ''}`;
}

export default function JourneyBScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const currentUser = useAppStore((s) => s.currentUser);

  const isUuid = /^[0-9a-f-]{36}$/i.test(restaurantId ?? '');
  const { data: realRestaurant } = useRestaurant(isUuid ? restaurantId : undefined);
  const { data: chainData } = useRelevantRestaurantIds(isUuid ? restaurantId : undefined);
  const relevantIds = chainData?.ids;

  const { data: friendVisits = [], isLoading: loadingDishes } = useFriendDishesForRestaurant(
    relevantIds,
    currentUser?.id
  );
  const { data: friendStats } = useFriendStats(relevantIds, currentUser?.id);

  const restaurantName = chainData?.chainName ?? realRestaurant?.name ?? 'este restaurante';
  const friendVisitCount = friendStats?.friendVisitCount ?? 0;
  const friendScore = friendStats?.friendScore;

  return (
    <View style={{ flex: 1, backgroundColor: '#1a3a2b' }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{restaurantName}</Text>
          <Text style={s.headerSub}>
            {friendVisitCount > 0
              ? `${friendVisitCount} ${friendVisitCount === 1 ? 'amigo estuvo aquí' : 'amigos estuvieron aquí'}${friendScore ? ` · ${friendScore.toFixed(1)} media` : ''}`
              : 'Sin visitas de amigos aún'}
          </Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      {loadingDishes ? (
        <ActivityIndicator size="large" color="#c7ef48" style={{ marginTop: 80 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Section header */}
          {(friendVisits as any[]).length > 0 && (
            <Text style={s.sectionTitle}>Lo que pidieron tus amigos</Text>
          )}

          {/* Per-person visit groups */}
          {(friendVisits as any[]).length > 0 ? (
            <View style={s.list}>
              {(friendVisits as any[]).map((fv: any) => (
                <View key={fv.visitId} style={s.visitGroup}>
                  {/* Person header */}
                  <View style={s.personRow}>
                    {fv.userAvatarUrl ? (
                      <Image source={{ uri: fv.userAvatarUrl }} style={s.personAvatar} />
                    ) : (
                      <View style={[s.personAvatar, s.personAvatarPlaceholder]}>
                        <MaterialIcons name="person" size={14} color="#82a491" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.personName}>{fv.userName}</Text>
                      {fv.userHandle && (
                        <Text style={s.personHandle}>@{fv.userHandle}</Text>
                      )}
                    </View>
                    <Text style={s.visitTime}>{timeAgo(fv.visitedAt)}</Text>
                  </View>

                  {/* Dish chips */}
                  <View style={s.dishRow}>
                    {fv.dishes.map((d: any, i: number) => (
                      <View key={i} style={[s.dishChip, d.highlighted && s.dishChipHighlighted]}>
                        {d.highlighted && <Text style={s.dishStar}>★</Text>}
                        <Text style={[s.dishChipText, d.highlighted && s.dishChipTextHighlighted]} numberOfLines={1}>
                          {d.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.emptyState}>
              <MaterialIcons name="restaurant-menu" size={40} color="rgba(255,255,255,0.15)" />
              <Text style={s.emptyTitle}>Ningún amigo ha registrado platos aquí aún.</Text>
              <Text style={s.emptySubtitle}>Sé el primero en registrar tu visita.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky CTA */}
      <TouchableOpacity
        style={s.cta}
        activeOpacity={0.88}
        onPress={() => router.push(`/registrar-visita?restaurantId=${restaurantId ?? ''}`)}
      >
        <MaterialIcons name="edit-note" size={22} color="#032417" />
        <Text style={s.ctaText}>Registrar mi visita</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: Platform.OS === 'ios' ? 108 : 88,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBtn: { padding: 8, minWidth: 40 },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#ffffff',
    lineHeight: 24,
  },
  headerSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#82a491',
    marginTop: 2,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 148 : 120,
    gap: 4,
  },

  sectionTitle: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },

  list: { gap: 0 },

  visitGroup: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(199,239,72,0.30)',
  },
  personAvatarPlaceholder: {
    backgroundColor: 'rgba(130,164,145,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  personHandle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#82a491',
  },
  visitTime: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#82a491',
  },

  dishRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 42, // align with text after avatar
  },

  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dishChipHighlighted: {
    backgroundColor: 'rgba(199,239,72,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(199,239,72,0.25)',
  },
  dishStar: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#c7ef48',
  },
  dishChipText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  dishChipTextHighlighted: {
    fontFamily: 'Manrope-SemiBold',
    color: '#c7ef48',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },

  cta: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 24, right: 24,
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#032417',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#032417' },
});
