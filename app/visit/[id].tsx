import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useVisit, useBookmark } from '../../lib/hooks/useVisit';
import { useAppStore } from '../../store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.6;


function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`;
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
}

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeFrame, setActiveFrame] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const { data: visit, isLoading } = useVisit(id);
  const currentUser = useAppStore((s) => s.currentUser);
  const { mutateAsync: toggleBookmark } = useBookmark(currentUser?.id);

  async function handleBookmark() {
    const restaurantId = (visit as any)?.restaurant?.id;
    if (!currentUser?.id || !restaurantId) return;
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await toggleBookmark({ restaurantId, save: next });
    } catch {
      setBookmarked(!next);
    }
  }

  async function handleShare() {
    const restaurantName = (visit as any)?.restaurant?.name ?? 'un restaurante';
    const score = (visit as any)?.rank_score;
    try {
      await Share.share({
        message: `He visitado ${restaurantName}${score != null ? ` y le he dado un ${score.toFixed(1)}/10` : ''} en fudi. ¡Échale un ojo!`,
      });
    } catch {
      // user dismissed
    }
  }

  const restaurantPhotos = (visit as any)?.photos
    ?.filter((p: any) => p.type === 'restaurant')
    ?.map((p: any) => p.photo_url) ?? [];
  const dishPhotos = (visit as any)?.dishes
    ?.filter((d: any) => d.photos?.[0]?.photo_url)
    ?.map((d: any) => ({ url: d.photos[0].photo_url, name: d.dish_name, rank: d.rank_position })) ?? [];

  // Build carousel frames from real photos
  const realFrames = [
    {
      image: restaurantPhotos[0] ?? (visit as any)?.restaurant?.cover_image_url ?? null,
      type: 'restaurant' as const,
      title: (visit as any)?.restaurant?.name ?? '',
      subtitle: (visit as any)?.restaurant?.neighborhood ?? '',
    },
    ...dishPhotos.slice(0, 2).map((d: any, i: number) => ({
      image: d.url,
      type: i === 0 ? ('dish' as const) : ('dish2' as const),
      badge: i === 0 ? 'Plato Estrella' : undefined,
      title: d.name,
      subtitle: '',
    })),
  ].filter((f) => f.image !== null);

  const data = {
    restaurantId: (visit as any)?.restaurant?.id ?? '',
    restaurantName: (visit as any)?.restaurant?.name ?? '',
    restaurantLocation: (visit as any)?.restaurant?.neighborhood ?? '',
    user: {
      name: (visit as any)?.user?.name ?? '',
      avatar: (visit as any)?.user?.avatar_url ?? null,
      publishedAt: (visit as any)?.visited_at ? timeAgo((visit as any).visited_at) : '',
    },
    score: (visit as any)?.rank_score ?? null,
    quote: (visit as any)?.note ?? '',
    frames: realFrames,
    dishes: ((visit as any)?.dishes ?? [])
      .sort((a: any, b: any) => (a.rank_position ?? 99) - (b.rank_position ?? 99))
      .map((d: any, i: number) => ({
        rank: d.rank_position ?? i + 1,
        name: d.dish_name,
        note: d.note ?? '',
        image: d.photos?.[0]?.photo_url ?? null,
        rankColor: i === 0 ? '#032417' : i === 1 ? '#516600' : 'rgba(81,102,0,0.6)',
      })),
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#032417" />
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973' }}>Cargando publicación...</Text>
      </View>
    );
  }

  if (!visit && !isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
        <MaterialIcons name="error-outline" size={48} color="#c1c8c2" />
        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 20, color: '#032417', textAlign: 'center' }}>
          Publicación no encontrada
        </Text>
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#727973', textAlign: 'center' }}>
          Esta publicación no existe o ya no está disponible.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#032417', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}>
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#ffffff' }}>Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/feed')} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#727973', textDecorationLine: 'underline' }}>Ir al feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Glassmorphism header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicación</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MaterialIcons name="ios-share" size={22} color="#032417" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero carousel */}
        <View style={[styles.carousel, { marginTop: Platform.OS === 'ios' ? 108 : 64 }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveFrame(Math.max(0, Math.min(idx, data.frames.length - 1)));
            }}
          >
            {data.frames.map((frame, i) => (
              <View key={i} style={styles.carouselFrame}>
                <Image
                  source={{ uri: frame.image }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.80)']}
                  style={styles.frameGradient}
                />
                <View style={styles.frameContent}>
                  {frame.type === 'restaurant' && (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push(`/restaurant/${data.restaurantId}`)}
                      >
                        <View style={styles.restaurantNameRow}>
                          <Text style={styles.frameTitleLarge}>{frame.title}</Text>
                          <MaterialIcons name="arrow-forward-ios" size={20} color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} />
                        </View>
                      </TouchableOpacity>
                      <Text style={styles.frameSubtitleUppercase}>{frame.subtitle}</Text>
                    </>
                  )}
                  {frame.type === 'dish' && (
                    <>
                      <View style={styles.frameBadge}>
                        <Text style={styles.frameBadgeText}>{frame.badge}</Text>
                      </View>
                      <Text style={styles.frameTitleMedium}>{frame.title}</Text>
                      <Text style={styles.frameSubtitleItalic}>{frame.subtitle}</Text>
                    </>
                  )}
                  {frame.type === 'dish2' && (
                    <>
                      <Text style={styles.frameTitleMedium}>{frame.title}</Text>
                      <Text style={styles.frameSubtitleItalic}>{frame.subtitle}</Text>
                    </>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Page counter */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {activeFrame + 1} / {data.frames.length}
            </Text>
          </View>

          {/* Progress indicators */}
          <View style={styles.progressBars}>
            {data.frames.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  i === activeFrame ? styles.progressBarActive : styles.progressBarInactive,
                ]}
              />
            ))}
          </View>

          {/* Scroll hint */}
          {activeFrame < data.frames.length - 1 && (
            <View style={styles.scrollHint}>
              <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            {data.user.avatar ? (
            <Image source={{ uri: data.user.avatar }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="person" size={22} color="#727973" />
            </View>
          )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{data.user.name}</Text>
              <Text style={styles.publishedAt}>
                PUBLICADO {data.user.publishedAt.toUpperCase()}
              </Text>
            </View>
            {data.score != null && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreNumber}>{data.score.toFixed(1)}</Text>
                <Text style={styles.scoreLabel}>Puntuación</Text>
              </View>
            )}
          </View>

          {/* Restaurant link */}
          <TouchableOpacity
            style={styles.restaurantLink}
            activeOpacity={0.7}
            onPress={() => router.push(`/restaurant/${data.restaurantId}`)}
          >
            <MaterialIcons name="restaurant" size={16} color="#032417" />
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantLinkText}>{data.restaurantName}</Text>
              {data.restaurantLocation ? (
                <View style={styles.locationRow}>
                  <MaterialIcons name="location-on" size={11} color="#727973" />
                  <Text style={styles.locationText}>{data.restaurantLocation}</Text>
                </View>
              ) : null}
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#727973" />
          </TouchableOpacity>

          {/* Quote */}
          <Text style={styles.quoteText}>{data.quote}</Text>
        </View>

        {/* Comanda */}
        <View style={styles.comandaSection}>
          <View style={styles.comandaHeader}>
            <View style={styles.comandaLine} />
            <Text style={styles.comandaLabel}>Comanda</Text>
          </View>

          <View style={styles.dishesList}>
            {data.dishes.map((dish: any) => (
              <View key={dish.rank} style={styles.dishItem}>
                <View style={{ position: 'relative', flexShrink: 0 }}>
                  {dish.image ? (
                    <Image source={{ uri: dish.image }} style={styles.dishImage} />
                  ) : (
                    <View style={[styles.dishImage, { backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }]}>
                      <MaterialIcons name="restaurant-menu" size={28} color="#c1c8c2" />
                    </View>
                  )}
                  <View style={[styles.rankBadge, { backgroundColor: dish.rankColor }]}>
                    <Text style={styles.rankText}>#{dish.rank}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, paddingTop: 4 }}>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  <Text style={styles.dishNote}>{dish.note}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} activeOpacity={0.8} onPress={handleBookmark}>
            <MaterialIcons name={bookmarked ? 'bookmark' : 'bookmark-border'} size={20} color="#ffffff" />
            <Text style={styles.saveBtnText}>{bookmarked ? 'Guardado' : 'Guardar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} activeOpacity={0.8} onPress={handleShare}>
            <MaterialIcons name="share" size={20} color="#032417" />
            <Text style={styles.shareBtnText}>Compartir</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
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
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.90)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
    flex: 1,
    textAlign: 'center',
  },
  carousel: {
    height: CAROUSEL_HEIGHT,
    position: 'relative',
  },
  carouselFrame: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    position: 'relative',
  },
  frameGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  frameContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    paddingBottom: 48,
    gap: 8,
  },
  frameTitleLarge: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 36,
    color: '#ffffff',
    lineHeight: 42,
  },
  frameSubtitleUppercase: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.90)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 4,
  },
  frameBadge: {
    backgroundColor: '#c7ef48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  frameBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#546b00',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  frameTitleMedium: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: '#ffffff',
    lineHeight: 36,
  },
  frameSubtitleItalic: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    marginTop: 2,
  },
  counter: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.40)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  counterText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 2,
  },
  progressBars: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressBarActive: {
    width: 24,
    backgroundColor: '#ffffff',
  },
  progressBarInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  scrollHint: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -14,
    opacity: 0.7,
  },
  metaSection: {
    padding: 24,
    paddingBottom: 8,
    gap: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#c7ef48',
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  publishedAt: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    color: '#424844',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: '#032417',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  scoreNumber: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 22,
    color: '#c7ef48',
    lineHeight: 26,
  },
  scoreLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: 'rgba(199,239,72,0.75)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  restaurantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restaurantLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f7f3ec',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  restaurantLinkText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#727973',
  },
  quoteText: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 17,
    color: '#424844',
    lineHeight: 26,
  },
  comandaSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 20,
  },
  comandaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comandaLine: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(84,107,0,0.3)',
  },
  comandaLabel: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#546b00',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  dishesList: {
    gap: 12,
  },
  dishItem: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    backgroundColor: '#f7f3ec',
    borderRadius: 16,
    padding: 16,
  },
  dishImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  rankText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#ffffff',
  },
  dishName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 17,
    color: '#032417',
    marginBottom: 6,
  },
  dishNote: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#424844',
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#032417',
  },
  saveBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#ebe8e1',
  },
  shareBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
});
