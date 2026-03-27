import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { useSavedPosts } from '../lib/hooks/useVisit';

export default function SavedPostsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: posts = [], isLoading } = useSavedPosts(currentUser?.id);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts guardados</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#032417" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="bookmark-border" size={56} color="#c1c8c2" />
          <Text style={styles.emptyTitle}>Sin publicaciones guardadas</Text>
          <Text style={styles.emptyBody}>
            Cuando guardes una publicación desde el feed aparecerá aquí.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/feed')}>
            <Text style={styles.emptyBtnText}>Ir al feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => router.push(`/visit/${item.id}`)}
            >
              {/* Cover photo */}
              {item.photos?.[0]?.photo_url ? (
                <Image
                  source={{ uri: item.photos[0].photo_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <MaterialIcons name="restaurant" size={32} color="#c1c8c2" />
                </View>
              )}

              <View style={styles.cardBody}>
                {/* User row */}
                <View style={styles.userRow}>
                  {item.user?.avatar_url ? (
                    <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <MaterialIcons name="person" size={14} color="#727973" />
                    </View>
                  )}
                  <Text style={styles.userName} numberOfLines={1}>{item.user?.name ?? '—'}</Text>
                  {(item.rank_score ?? 0) > 0 && (
                    <View style={styles.score}>
                      <Text style={styles.scoreText}>{item.rank_score!.toFixed(1)}</Text>
                    </View>
                  )}
                </View>

                {/* Restaurant */}
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {item.restaurant?.name ?? '—'}
                </Text>
                {(item.restaurant?.cuisine || item.restaurant?.price_level) ? (
                  <Text style={styles.meta}>{[item.restaurant.cuisine, item.restaurant.price_level ? '€'.repeat(item.restaurant.price_level) : null].filter(Boolean).join(' · ')}</Text>
                ) : null}

                {/* Note */}
                {item.note ? (
                  <Text style={styles.note} numberOfLines={2}>"{item.note}"</Text>
                ) : null}

                {/* Dishes */}
                {item.dishes?.length > 0 && (
                  <View style={styles.dishesRow}>
                    {item.dishes.slice(0, 3).map((d: any, i: number) => (
                      <View key={i} style={styles.dishChip}>
                        <Text style={styles.dishChipText} numberOfLines={1}>
                          {d.name ?? ''}
                        </Text>
                      </View>
                    ))}
                    {item.dishes.length > 3 && (
                      <View style={styles.dishChip}>
                        <Text style={styles.dishChipText}>+{item.dishes.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  header: {
    height: Platform.OS === 'ios' ? 108 : 88,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(253,249,242,0.92)',
  },
  headerBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 18, color: '#032417' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' },
  emptyBody: { fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: '#032417', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardImage: { width: '100%', height: 180 },
  cardImagePlaceholder: { backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16, gap: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' },
  userName: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: '#424844', flex: 1 },
  score: { backgroundColor: '#c7ef48', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  scoreText: { fontFamily: 'NotoSerif-Bold', fontSize: 14, color: '#546b00' },
  restaurantName: { fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417' },
  meta: { fontFamily: 'Manrope-Regular', fontSize: 12, color: '#727973' },
  note: { fontFamily: 'NotoSerif-Italic', fontSize: 13, color: '#424844', marginTop: 4, lineHeight: 18 },
  dishesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  dishChip: { backgroundColor: '#f7f3ec', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dishChipText: { fontFamily: 'Manrope-Medium', fontSize: 12, color: '#032417' },
});
