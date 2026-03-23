import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useRestaurant, useFriendDishes, useRecentVisits } from '../../lib/hooks/useRestaurant';
import { useAppStore } from '../../store';


function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function JourneyBScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const [mode, setMode] = useState<'amigos' | 'global'>('amigos');
  const currentUser = useAppStore((s) => s.currentUser);

  // Real data hooks
  const isUuid = /^[0-9a-f-]{36}$/i.test(restaurantId ?? '');
  const { data: realRestaurant } = useRestaurant(isUuid ? restaurantId : undefined);
  const { data: friendDishes = [], isLoading: loadingDishes } = useFriendDishes(
    isUuid ? restaurantId : undefined,
    currentUser?.id
  );
  const { data: recentVisits = [], isLoading: loadingVisits } = useRecentVisits(
    isUuid ? restaurantId : undefined,
    currentUser?.id
  );

  const restaurantName = realRestaurant?.name ?? 'este restaurante';
  const restaurantLocation = realRestaurant?.neighborhood ?? realRestaurant?.address ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: '#1a3a2b' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedir ahora</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Toggle */}
        <View style={styles.toggleWrapper}>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'amigos' && styles.toggleBtnActive]}
              onPress={() => setMode('amigos')}
            >
              <Text style={[styles.toggleText, mode === 'amigos' && styles.toggleTextActive]}>
                Amigos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'global' && styles.toggleBtnActive]}
              onPress={() => setMode('global')}
            >
              <Text style={[styles.toggleText, mode === 'global' && styles.toggleTextActive]}>
                Global
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Label + Title + Subtitle */}
        <Text style={styles.eyebrow}>ACIERTA SIEMPRE</Text>
        <Text style={styles.mainTitle}>¿Qué pedimos?</Text>
        <Text style={styles.subtitle}>
          Lo que piden tus amigos en <Text style={{ color: '#c7ef48' }}>{restaurantName}</Text>.
        </Text>
        {restaurantLocation ? (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={13} color="rgba(199,239,72,0.7)" />
            <Text style={styles.locationText}>{restaurantLocation}</Text>
          </View>
        ) : null}

        {/* Dishes section */}
        {loadingDishes ? (
          <ActivityIndicator size="large" color="#c7ef48" style={{ marginVertical: 32 }} />
        ) : friendDishes.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center', gap: 16 }}>
            <MaterialIcons name="restaurant-menu" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              Aún no hay platos recomendados por tus amigos aquí
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#c7ef48', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              activeOpacity={0.85}
              onPress={() => router.push(`/registrar-visita?restaurantId=${restaurantId}`)}
            >
              <MaterialIcons name="add" size={16} color="#032417" />
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#032417' }}>Sé el primero en registrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Featured card #1 */}
            {friendDishes[0] && (
              <View style={styles.featuredCard}>
                <View style={{ position: 'relative' }}>
                  {friendDishes[0].photo_url ? (
                    <Image source={{ uri: friendDishes[0].photo_url }} style={styles.featuredImage} />
                  ) : (
                    <View style={[styles.featuredImage, { backgroundColor: '#0d2b1a', alignItems: 'center', justifyContent: 'center' }]}>
                      <MaterialIcons name="restaurant-menu" size={48} color="rgba(199,239,72,0.3)" />
                    </View>
                  )}
                  <View style={styles.featuredRankBadge}>
                    <Text style={styles.featuredRankText}>#1</Text>
                  </View>
                </View>
                <View style={styles.featuredContent}>
                  <View style={styles.featuredAvatarRow}>
                    {friendDishes[0].friends.slice(0, 3).map((f, i) => (
                      f.avatar_url ? (
                        <Image key={f.id} source={{ uri: f.avatar_url }} style={[styles.featuredAvatar, { marginLeft: i > 0 ? -10 : 0 }]} />
                      ) : (
                        <View key={f.id} style={[styles.featuredAvatar, { marginLeft: i > 0 ? -10 : 0, backgroundColor: '#1a3a2b', alignItems: 'center', justifyContent: 'center' }]}>
                          <MaterialIcons name="person" size={12} color="rgba(199,239,72,0.6)" />
                        </View>
                      )
                    ))}
                    <Text style={styles.featuredFriendsText}>
                      {friendDishes[0].friends.length} {friendDishes[0].friends.length === 1 ? 'amigo' : 'amigos'} recomiendan
                    </Text>
                  </View>
                  <Text style={styles.featuredName}>{friendDishes[0].dish_name}</Text>
                  <Text style={styles.featuredQuote}>Pedido {friendDishes[0].times_ordered} {friendDishes[0].times_ordered === 1 ? 'vez' : 'veces'}</Text>
                </View>
              </View>
            )}

            {/* List items #2+ */}
            {friendDishes.length > 1 && (
              <View style={styles.list}>
                {friendDishes.slice(1).map((dish, idx) => (
                  <View key={dish.dish_name} style={styles.listItem}>
                    {dish.photo_url ? (
                      <Image source={{ uri: dish.photo_url }} style={styles.listImage} />
                    ) : (
                      <View style={[styles.listImage, { backgroundColor: '#0d2b1a', alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name="restaurant-menu" size={24} color="rgba(199,239,72,0.3)" />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.listName}>{dish.dish_name}</Text>
                      <Text style={styles.listNote}>Pedido {dish.times_ordered} {dish.times_ordered === 1 ? 'vez' : 'veces'}</Text>
                      <View style={styles.listByRow}>
                        <MaterialIcons name="person" size={12} color="rgba(199,239,72,0.6)" />
                        <Text style={styles.listBy}>
                          {dish.friends.map((f) => f.name).join(', ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.listRank}>#{idx + 2}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Visitas recientes */}
        {!loadingVisits && recentVisits.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Visitas recientes</Text>
            {recentVisits.map((visit: any) => (
              <View key={visit.id} style={styles.recentItem}>
                {visit.user?.avatar_url ? (
                  <Image source={{ uri: visit.user.avatar_url }} style={styles.recentAvatar} />
                ) : (
                  <View style={[styles.recentAvatar, { backgroundColor: '#0d2b1a', alignItems: 'center', justifyContent: 'center' }]}>
                    <MaterialIcons name="person" size={18} color="rgba(199,239,72,0.4)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{visit.user?.name ?? ''}</Text>
                  <Text style={styles.recentTime}>{timeAgo(visit.visited_at)}</Text>
                </View>
                {visit.rank_score != null && (
                  <View style={styles.recentScoreBadge}>
                    <Text style={styles.recentScoreText}>{visit.rank_score.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA — Registrar visita */}
      <TouchableOpacity
        style={styles.stickyCta}
        activeOpacity={0.88}
        onPress={() => router.push(`/registrar-visita?restaurantId=${restaurantId ?? '1'}`)}
      >
        <MaterialIcons name="edit-note" size={22} color="#032417" />
        <Text style={styles.stickyCtaText}>Registrar mi visita</Text>
      </TouchableOpacity>
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
  },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    textAlign: 'center',
  },
  headerBtn: { padding: 8, minWidth: 40 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 148 : 120,
  },
  toggleWrapper: {
    alignItems: 'center',
    marginBottom: 28,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleBtn: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: '#c7ef48',
  },
  toggleText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: '#032417',
  },
  eyebrow: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#c7ef48',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 8,
  },
  mainTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 38,
    color: '#ffffff',
    lineHeight: 44,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 20,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  locationText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: 'rgba(199,239,72,0.7)',
  },
  // Featured card
  featuredCard: {
    backgroundColor: '#0d1f14',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  featuredImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  featuredRankBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#c7ef48',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredRankText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 13,
    color: '#032417',
  },
  featuredContent: {
    padding: 20,
    gap: 10,
  },
  featuredAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1a3a2b',
  },
  featuredFriendsText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
    marginLeft: 4,
  },
  featuredName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 24,
    color: '#ffffff',
    lineHeight: 30,
  },
  featuredQuote: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
  },
  // List items
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  listImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  listName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  listNote: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  listByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  listBy: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: 'rgba(199,239,72,0.60)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listRank: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 18,
    color: '#c7ef48',
    opacity: 0.5,
    minWidth: 28,
    textAlign: 'right',
  },
  recentSection: {
    marginTop: 28,
    gap: 12,
  },
  recentTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 4,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  recentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  recentName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  recentDish: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  recentTime: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: 'rgba(199,239,72,0.6)',
    marginTop: 2,
  },
  recentRight: {
    position: 'relative',
  },
  recentThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  recentScoreBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#c7ef48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1a3a2b',
  },
  recentScoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 11,
    color: '#032417',
  },
  stickyCta: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 24,
    right: 24,
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
  stickyCtaText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
});
