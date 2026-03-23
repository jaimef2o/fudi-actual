import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { registerForPushNotifications, configureForegroundNotifications } from '../../lib/notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store';
import { useFeed, useUserFeed } from '../../lib/hooks/useFeed';
import { useBookmark } from '../../lib/hooks/useVisit';
import type { FeedPost } from '../../lib/api/feed';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


function ScoreBadge({ score }: { score: number }) {
  return (
    <View style={styles.scoreBadge}>
      <Text style={styles.scoreBadgeText}>{score.toFixed(1)}</Text>
    </View>
  );
}


export default function FeedScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, refetch } = useFeed(currentUser?.id);
  // Also load own posts — shown when friends feed is empty
  const { data: ownData } = useUserFeed(currentUser?.id);

  function handleAvatarLongPress() {
    Alert.alert(
      currentUser?.name ?? 'Mi cuenta',
      'Opciones de cuenta',
      [
        { text: 'Ver perfil', onPress: () => router.push(`/profile/${currentUser?.id}`) },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => supabase.auth.signOut(),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  const posts = data?.pages.flatMap((p) => p) ?? [];
  const ownPosts = ownData?.pages.flatMap((p) => p) ?? [];

  // ── "New post" banner (realtime) ──────────────────────────────────────────
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const prevPostCountRef = useRef(0);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (posts.length > prevPostCountRef.current && prevPostCountRef.current > 0) {
      setHasNewPosts(true);
    }
    prevPostCountRef.current = posts.length;
  }, [posts.length]);

  // ── Push notification registration (after user has at least one post) ─────
  const pushRegistered = useRef(false);
  useEffect(() => {
    if (!currentUser?.id || pushRegistered.current) return;
    if (posts.length > 0 || ownPosts.length > 0) {
      pushRegistered.current = true;
      configureForegroundNotifications();
      registerForPushNotifications(currentUser.id);
    }
  }, [posts.length, ownPosts.length, currentUser?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Fixed glassmorphism header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/profile/${currentUser?.id}`)}
          onLongPress={handleAvatarLongPress}
          activeOpacity={0.7}
        >
          {currentUser?.avatar ? (
            <Image source={{ uri: currentUser.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="person" size={20} color="#727973" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.logoText}>fudi</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Alert.alert('Notificaciones', 'Las notificaciones push estarán disponibles pronto.')}
        >
          <MaterialIcons name="notifications-none" size={26} color="#032417" />
        </TouchableOpacity>
      </View>

      {/* "New post" realtime banner */}
      {hasNewPosts && (
        <TouchableOpacity
          onPress={() => {
            setHasNewPosts(false);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            top: 80,
            alignSelf: 'center',
            zIndex: 100,
            backgroundColor: '#032417',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <MaterialIcons name="arrow-upward" size={14} color="#c7ef48" />
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: '#ffffff' }}>
            Nueva publicación
          </Text>
        </TouchableOpacity>
      )}

      {/* Feed list */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#032417"
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
          if (isNearBottom && hasNextPage && !isLoading) fetchNextPage();
        }}
        scrollEventThrottle={400}
      >
        {isLoading && posts.length === 0 && (
          <View style={{ paddingTop: 80, alignItems: 'center', gap: 16 }}>
            <MaterialIcons name="restaurant" size={48} color="#c1c8c2" />
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417' }}>
              Cargando tu feed...
            </Text>
          </View>
        )}
        {/* Real friend posts */}
        {posts.length > 0 && posts.map((post) => (
          <RealFeedCard key={post.id} post={post} currentUserId={currentUser?.id} />
        ))}

        {/* Own posts when friends feed is empty but user has their own visits */}
        {posts.length === 0 && !isLoading && ownPosts.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8 }}>
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 10, color: '#727973', textTransform: 'uppercase', letterSpacing: 2 }}>
                Mis visitas
              </Text>
            </View>
            {ownPosts.map((post) => (
              <RealFeedCard key={post.id} post={post} currentUserId={currentUser?.id} />
            ))}
          </>
        )}

        {/* Empty state when no posts at all */}
        {posts.length === 0 && ownPosts.length === 0 && !isLoading && (
          <View style={{ paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="restaurant" size={36} color="#c7ef48" />
            </View>
            <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 22, color: '#032417', textAlign: 'center' }}>
              Tu feed está vacío
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center', lineHeight: 20 }}>
              Registra tu primera visita o añade amigos para ver sus recomendaciones.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#032417', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, marginTop: 8 }}
              onPress={() => router.push('/registrar-visita')}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff' }}>Registrar primera visita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 10 }}
              onPress={() => router.push('/(tabs)/amigos')}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#032417', textDecorationLine: 'underline' }}>Añadir amigos</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RealFeedCard({ post, currentUserId }: { post: FeedPost; currentUserId?: string }) {
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  const images = post.photos?.map((p: any) => p.photo_url) ?? [];
  const [imgIndex, setImgIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const { mutateAsync: toggleBookmark } = useBookmark(currentUserId);

  async function handleBookmark() {
    if (!currentUserId || !(post.restaurant as any)?.id) {
      setBookmarked((b) => !b); // UI-only if no auth
      return;
    }
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    try {
      await toggleBookmark({ restaurantId: (post.restaurant as any).id, save: next });
    } catch {
      setBookmarked(!next); // revert
    }
  }

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {post.user.avatar_url ? (
            <Image source={{ uri: post.user.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="person" size={18} color="#727973" />
            </View>
          )}
          <View>
            <Text style={styles.userName}>{post.user.name}</Text>
            <Text style={styles.timeText}>{timeAgo(post.visited_at)}</Text>
          </View>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{(post.rank_score ?? 0).toFixed(1)}</Text>
        </View>
      </View>

      {/* Image carousel */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push(`/visit/${post.id}`)}
      >
        <View style={{ aspectRatio: 1, width: '100%', overflow: 'hidden' }}>
          {images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}>
              {images.map((uri: string, i: number) => (
                <View key={i} style={{ width: SCREEN_WIDTH - 32, aspectRatio: 1 }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="restaurant" size={48} color="#c1c8c2" />
            </View>
          )}
          {/* Overlay info */}
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', pointerEvents: 'none' }]}>
            <LinearGradient colors={['transparent', 'rgba(3,36,23,0.75)']} style={{ padding: 16, paddingBottom: images.length > 1 ? 28 : 16 }}>
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 10, color: '#c7ef48', textTransform: 'uppercase', letterSpacing: 2 }}>
                {post.restaurant.neighborhood ?? ''}
              </Text>
              <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 26, color: '#ffffff', lineHeight: 30 }}>
                {post.restaurant.name}
              </Text>
            </LinearGradient>
          </View>
          {/* Bookmark overlay */}
          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={handleBookmark}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={bookmarked ? 'bookmark' : 'bookmark-border'}
              size={20}
              color="white"
            />
          </TouchableOpacity>
          {/* Pagination dots */}
          {images.length > 1 && (
            <View style={[styles.dotsContainer, { position: 'absolute', bottom: 8, left: 0, right: 0, paddingVertical: 0 }]}>
              {images.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, i === imgIndex ? styles.dotActive : styles.dotInactive,
                  { width: i === imgIndex ? 16 : 6 }]} />
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Note */}
      {post.note && (
        <View style={styles.quoteWrapper}>
          <View style={styles.quoteBorder} />
          <Text style={styles.quoteText}>"{post.note}"</Text>
        </View>
      )}

      {/* Dishes */}
      {post.dishes && post.dishes.length > 0 && (
        <View style={styles.dishesSection}>
          <Text style={styles.sectionLabel}>COMANDA</Text>
          <View style={styles.chipsRow}>
            {post.dishes.slice(0, 2).map((d: any, i: number) => (
              <View key={i} style={styles.chip}>
                <MaterialIcons name="restaurant-menu" size={13} color="#424844" />
                <Text style={styles.chipText}>{d.dish_name}</Text>
              </View>
            ))}
            {post.dishes.length > 2 && (
              <View style={styles.chip}>
                <Text style={[styles.chipText, { fontFamily: 'NotoSerif-Bold' }]}>+{post.dishes.length - 2} más</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(253,249,242,0.90)',
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(3,36,23,0.05)',
  },
  logoText: {
    fontStyle: 'italic',
    fontSize: 24,
    color: '#032417',
    fontFamily: 'NotoSerif-Italic',
    letterSpacing: -0.5,
  },
  feedContainer: {
    paddingTop: Platform.OS === 'ios' ? 120 : 104,
    paddingBottom: 110,
    paddingHorizontal: 16,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c18',
    fontFamily: 'Manrope-Bold',
  },
  timeText: {
    fontSize: 12,
    color: '#727973',
    marginTop: 2,
    fontFamily: 'Manrope-Regular',
  },
  scoreBadge: {
    backgroundColor: '#c7ef48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#546b00',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 20,
  },
  neighborhoodText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 3,
    color: '#c7ef48',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  restaurantNameText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: '#ffffff',
    lineHeight: 36,
  },
  cityText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: { backgroundColor: '#032417' },
  dotInactive: { backgroundColor: '#c1c8c2' },
  quoteWrapper: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
  },
  quoteBorder: {
    width: 4,
    backgroundColor: '#c7ef48',
    borderRadius: 2,
    flexShrink: 0,
  },
  quoteText: {
    fontStyle: 'italic',
    fontSize: 14,
    fontFamily: 'NotoSerif-Italic',
    color: '#424844',
    lineHeight: 21,
    flex: 1,
  },
  dishesSection: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#727973',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f7f3ec',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: '#032417',
  },
  companionsSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
  },
  companionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
