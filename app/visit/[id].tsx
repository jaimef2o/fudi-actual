import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
  ViewToken,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { showAlert } from '../../lib/utils/alerts';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef, useCallback, useMemo } from 'react';
import { useVisit, useBookmark, useSavePost, useDeleteVisit, useSavedRestaurants } from '../../lib/hooks/useVisit';
import { useVisitDishes } from '../../lib/hooks/useDishes';
import { useAppStore } from '../../store';
import { scorePalette } from '../../lib/sentimentColors';
import { InfoTag } from '../../components/InfoTag';
import { getDisplayName } from '../../lib/utils/restaurantName';
import * as Haptics from 'expo-haptics';
import { useComments, useAddComment } from '../../lib/hooks/useComments';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 108 : 88;
const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.6;

function formatSpend(spend: string | null | undefined): string | null {
  if (!spend) return null;
  const map: Record<string, string> = { '0-20': '~€0–20pp', '20-35': '~€20–35pp', '35-60': '~€35–60pp', '60+': '~€60+pp' };
  return map[spend] ?? null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`;
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
}

type CarouselFrame = {
  image: string;
  type: 'restaurant' | 'dish';
  title: string;
  subtitle: string;
  highlighted: boolean;
};

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeFrame, setActiveFrame] = useState(0);
  const [postSaved, setPostSaved] = useState(false);
  const { data: visit, isLoading } = useVisit(id);
  const { data: visitDishes = [] } = useVisitDishes(id);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast   = useAppStore((s) => s.showToast);
  const { mutateAsync: toggleBookmark } = useBookmark(currentUser?.id);
  const { data: savedRestaurants } = useSavedRestaurants(currentUser?.id);
  const restaurantId = (visit as any)?.restaurant?.id as string | undefined;
  // Derive saved state from real data; pendingOverride gives instant optimistic feedback
  const restaurantSavedFromDB = useMemo(
    () => (savedRestaurants ?? []).some((r: any) => r.restaurant?.id === restaurantId),
    [savedRestaurants, restaurantId]
  );
  const [pendingRestaurantSaved, setPendingRestaurantSaved] = useState<boolean | null>(null);
  const restaurantSaved = pendingRestaurantSaved !== null ? pendingRestaurantSaved : restaurantSavedFromDB;
  const { mutateAsync: toggleSavePost } = useSavePost(currentUser?.id);
  const { mutateAsync: deleteVisit, isPending: isDeleting } = useDeleteVisit();
  const { data: comments } = useComments(id as string);
  const { mutateAsync: postComment, isPending: commentPosting } = useAddComment(id as string);
  const [commentText, setCommentText] = useState('');

  const isOwnPost = !!currentUser?.id && (visit as any)?.user_id === currentUser.id;

  // Stable refs for FlatList viewability (must not be recreated on re-render)
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveFrame(viewableItems[0].index);
      }
    }
  ).current;

  async function handleDelete() {
    async function doDelete() {
      try {
        await deleteVisit({ visitId: id!, userId: currentUser!.id });
        router.back();
      } catch {
        showAlert('Error', 'No se pudo eliminar la publicación. Inténtalo de nuevo.');
      }
    }

    showAlert(
      'Eliminar publicación',
      '¿Seguro que quieres eliminar esta visita? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]
    );
  }

  async function handleSaveRestaurant() {
    if (!currentUser?.id || !restaurantId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !restaurantSaved;
    setPendingRestaurantSaved(next);
    try {
      await toggleBookmark({ restaurantId, save: next });
      showToast(next ? 'Restaurante guardado ✓' : 'Restaurante eliminado de guardados');
    } catch {
      setPendingRestaurantSaved(!next);
      showToast('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setPendingRestaurantSaved(null);
    }
  }

  async function handleSavePost() {
    if (!currentUser?.id || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !postSaved;
    setPostSaved(next);
    try {
      await toggleSavePost({ visitId: id, save: next });
      if (next) showToast('Publicación guardada');
    } catch { setPostSaved(!next); }
  }

  const visitRestaurant = (visit as any)?.restaurant;
  const resolvedRestaurantName = visitRestaurant ? getDisplayName(visitRestaurant, 'detail') : 'un restaurante';

  async function handleShare() {
    const restaurantName = resolvedRestaurantName;
    const score = (visit as any)?.rank_score;
    const postUrl = `https://fudi.app/visit/${id}`;
    try {
      await Share.share({
        message: `"${restaurantName}"${score != null ? ` — ${score.toFixed(1)}/10` : ''} en fudi.\n${postUrl}`,
        url: postUrl,
        title: `${restaurantName} en fudi`,
      });
    } catch {
      // user dismissed
    }
  }

  // ─── Build carousel frames ──────────────────────────────────────────────────
  // Restaurant photos — all of them, cover as fallback if none
  const rawRestaurantPhotos: string[] = (visit as any)?.photos
    ?.filter((p: any) => p.type === 'restaurant' && p.photo_url)
    ?.map((p: any) => p.photo_url) ?? [];
  const restaurantImages = rawRestaurantPhotos.length > 0
    ? rawRestaurantPhotos
    : ((visit as any)?.restaurant?.cover_image_url ? [(visit as any).restaurant.cover_image_url] : []);

  // Dish photos: match visit_photos (dish_id set) → visitDishes for name + highlighted, sorted highlighted first
  const dishPhotoEntries = ((visit as any)?.photos ?? [])
    .filter((p: any) => p.dish_id && p.photo_url)
    .map((p: any) => {
      const dish = (visitDishes as any[]).find((d: any) => d.id === p.dish_id);
      return {
        url: p.photo_url as string,
        name: dish?.name ?? '',
        highlighted: dish?.highlighted ?? false,
        position: dish?.position ?? 99,
      };
    })
    .sort((a: any, b: any) => {
      if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
      return a.position - b.position;
    });

  const frames: CarouselFrame[] = [
    ...restaurantImages.map((img) => ({
      image: img,
      type: 'restaurant' as const,
      title: resolvedRestaurantName,
      subtitle: (visit as any)?.restaurant?.neighborhood ?? '',
      highlighted: false,
    })),
    ...dishPhotoEntries.map((d: any) => ({
      image: d.url,
      type: 'dish' as const,
      title: d.name,
      subtitle: '',
      highlighted: d.highlighted,
    })),
  ].filter((f) => f.image);

  // ─── Render ──────────────────────────────────────────────────────────────────
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

  const dishes = visitDishes
    .filter((d) => d.name?.trim())
    .map((d) => ({
      name: d.name,
      highlighted: d.highlighted ?? false,
    }));

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Absolute glassmorphism header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicación</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={isOwnPost ? () => router.push(`/edit-visit/${id}`) : handleShare}
        >
          <MaterialIcons name={isOwnPost ? 'edit' : 'ios-share'} size={22} color="#032417" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}>
      {/* ── Carousel ── */}
      <View style={styles.carouselContainer}>
        {frames.length > 0 ? (
          <FlatList<CarouselFrame>
            data={frames}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item: frame }) => (
              <View style={styles.carouselFrame}>
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
                  {frame.type === 'restaurant' ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push(`/restaurant/${(visit as any)?.restaurant?.id}`)}
                      >
                        <View style={styles.restaurantNameRow}>
                          <Text style={styles.frameTitleLarge}>{frame.title}</Text>
                          <MaterialIcons name="arrow-forward-ios" size={20} color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} />
                        </View>
                      </TouchableOpacity>
                      {!!frame.subtitle && (
                        <Text style={styles.frameSubtitleUppercase}>{frame.subtitle}</Text>
                      )}
                    </>
                  ) : (
                    <>
                      {frame.highlighted && (
                        <View style={styles.frameBadge}>
                          <Text style={styles.frameBadgeText}>★ Destacado</Text>
                        </View>
                      )}
                      <Text style={styles.frameTitleMedium}>{frame.title}</Text>
                    </>
                  )}
                </View>
              </View>
            )}
          />
        ) : (
          // Fallback when no images at all
          <View style={[styles.carouselFrame, { backgroundColor: '#1a3a2b', justifyContent: 'flex-end', padding: 32 }]}>
            <Text style={styles.frameTitleLarge}>{resolvedRestaurantName}</Text>
          </View>
        )}

        {/* Page counter */}
        {frames.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {activeFrame + 1} / {frames.length}
            </Text>
          </View>
        )}

        {/* Progress bar indicators */}
        {frames.length > 1 && (
          <View style={styles.progressBars}>
            {frames.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  i === activeFrame ? styles.progressBarActive : styles.progressBarInactive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Scroll hint arrow */}
        {activeFrame < frames.length - 1 && (
          <View style={styles.scrollHint}>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.7)" />
          </View>
        )}
      </View>

      {/* ── Content below carousel ── */}
      <View>
        {/* Metadata */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            {(visit as any)?.user?.avatar_url ? (
              <Image source={{ uri: (visit as any).user.avatar_url }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="person" size={22} color="#727973" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{(visit as any)?.user?.name ?? ''}</Text>
              <Text style={styles.publishedAt}>
                PUBLICADO {(visit as any)?.visited_at ? timeAgo((visit as any).visited_at).toUpperCase() : ''}
              </Text>
              {(visit as any)?.spend_per_person ? (
                <View style={{ marginTop: 4 }}>
                  <InfoTag value={formatSpend((visit as any).spend_per_person)} />
                </View>
              ) : null}
            </View>
            {(visit as any)?.rank_score != null && (() => {
              const pal = scorePalette((visit as any).rank_score);
              return (
                <View style={[styles.scoreBadge, { backgroundColor: pal.badgeBg }]}>
                  <Text style={[styles.scoreNumber, { color: pal.badgeText }]}>{((visit as any).rank_score as number).toFixed(1)}</Text>
                  <Text style={[styles.scoreLabel, { color: pal.badgeText, opacity: 0.75 }]}>Puntuación</Text>
                </View>
              );
            })()}
          </View>

          {/* Restaurant link */}
          <TouchableOpacity
            style={styles.restaurantLink}
            activeOpacity={0.7}
            onPress={() => router.push(`/restaurant/${(visit as any)?.restaurant?.id}`)}
          >
            <MaterialIcons name="restaurant" size={16} color="#032417" />
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantLinkText}>{resolvedRestaurantName}</Text>
              {(() => {
                const cuisine = (visit as any)?.restaurant?.cuisine as string | null;
                const price = (visit as any)?.restaurant?.price_level as string | null;
                return (cuisine || price) ? (
                  <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
                    <InfoTag value={cuisine} />
                    <InfoTag value={price} />
                  </View>
                ) : null;
              })()}
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#727973" />
          </TouchableOpacity>

          {/* Quote */}
          {!!(visit as any)?.note && (
            <Text style={styles.quoteText}>{(visit as any).note}</Text>
          )}
        </View>

        {/* Comanda */}
        {dishes.length > 0 && (
          <View style={styles.comandaSection}>
            <View style={styles.comandaHeader}>
              <View style={styles.comandaLine} />
              <Text style={styles.comandaLabel}>Comanda</Text>
            </View>

            <View style={styles.dishesList}>
              {dishes.map((dish: any, i: number) => (
                <View key={i} style={styles.dishItem}>
                  {dish.highlighted
                    ? <Text style={styles.dishStar}>★</Text>
                    : <View style={styles.dishIconWrap}><MaterialIcons name="restaurant" size={11} color="#c1c8c2" /></View>
                  }
                  <Text style={[styles.dishName, dish.highlighted && styles.dishNameHighlighted]}>
                    {dish.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary row — save actions, always visible */}
          <View style={styles.actionRowPrimary}>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, postSaved && styles.actionBtnPrimaryActive]}
              activeOpacity={0.8}
              onPress={handleSavePost}
            >
              <MaterialIcons
                name={postSaved ? 'bookmark' : 'bookmark-border'}
                size={20}
                color={postSaved ? '#546b00' : '#032417'}
              />
              <Text style={[styles.actionBtnPrimaryText, postSaved && styles.actionBtnPrimaryTextActive]}>
                {postSaved ? 'Post guardado' : 'Guardar post'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnPrimary, restaurantSaved && styles.actionBtnPrimaryActive]}
              activeOpacity={0.8}
              onPress={handleSaveRestaurant}
            >
              <MaterialIcons
                name={restaurantSaved ? 'star' : 'star-border'}
                size={20}
                color={restaurantSaved ? '#546b00' : '#032417'}
              />
              <Text style={[styles.actionBtnPrimaryText, restaurantSaved && styles.actionBtnPrimaryTextActive]}>
                {restaurantSaved ? 'En mi lista' : 'Guardar lugar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Secondary row — own post actions */}
          {isOwnPost && (
            <TouchableOpacity
              style={styles.actionBtnEdit}
              activeOpacity={0.8}
              onPress={() => router.push(`/edit-visit/${id}`)}
            >
              <MaterialIcons name="edit" size={18} color="#032417" />
              <Text style={styles.actionBtnEditText}>Editar publicación</Text>
            </TouchableOpacity>
          )}

          {/* Destructive — text-only, minimal weight */}
          {isOwnPost && (
            <TouchableOpacity
              style={styles.actionBtnDelete}
              activeOpacity={0.7}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <MaterialIcons name="delete-outline" size={16} color="#ba1a1a" />
              <Text style={styles.actionBtnDeleteText}>
                {isDeleting ? 'Eliminando…' : 'Eliminar publicación'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Comments Section */}
        <View style={{
          marginTop: 24,
          paddingHorizontal: 20,
          paddingBottom: 24,
          gap: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 14, backgroundColor: '#c7ef48', borderRadius: 2 }} />
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 10, color: '#727973', textTransform: 'uppercase', letterSpacing: 3 }}>
              COMENTARIOS {comments?.length ? `(${comments.length})` : ''}
            </Text>
          </View>

          {/* Comment input */}
          {currentUser?.id && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#f7f3ec',
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  fontFamily: 'Manrope-Regular',
                  fontSize: 14,
                  color: '#1c1c18',
                  maxHeight: 80,
                }}
                placeholder="Escribe un comentario..."
                placeholderTextColor="#c1c8c2"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!commentText.trim() || !currentUser?.id) return;
                  await postComment({ userId: currentUser.id, text: commentText.trim() });
                  setCommentText('');
                }}
                disabled={commentPosting || !commentText.trim()}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: commentText.trim() ? '#032417' : '#e6e2db',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {commentPosting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialIcons name="send" size={16} color={commentText.trim() ? '#ffffff' : '#a0a6a1'} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Comments list */}
          {(comments ?? []).map((c: any) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <TouchableOpacity onPress={() => router.push(`/profile/${c.user.id}`)}>
                {c.user.avatar_url ? (
                  <Image source={{ uri: c.user.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                ) : (
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="person" size={16} color="#727973" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: '#032417' }}>
                  {c.user.name}
                  <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#424844' }}>
                    {'  '}{c.text}
                  </Text>
                </Text>
                <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 11, color: '#c1c8c2', marginTop: 3 }}>
                  {(() => {
                    const diff = Date.now() - new Date(c.created_at).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 60) return `hace ${mins}m`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `hace ${hrs}h`;
                    return `hace ${Math.floor(hrs / 24)}d`;
                  })()}
                </Text>
              </View>
            </View>
          ))}

          {(!comments || comments.length === 0) && (
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#c1c8c2', textAlign: 'center', paddingVertical: 8 }}>
              Sé el primero en comentar
            </Text>
          )}
        </View>

        <View style={{ height: 48 }} />
      </View>
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
    height: HEADER_HEIGHT,
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
  carouselContainer: {
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
  restaurantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  scoreNumber: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 22,
    lineHeight: 26,
  },
  scoreLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    gap: 4,
    marginTop: 8,
  },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  dishStar: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#516600',
    width: 18,
    textAlign: 'center',
  },
  dishIconWrap: {
    width: 18,
    alignItems: 'center',
  },
  dishName: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 15,
    color: '#1c1c18',
    flex: 1,
  },
  dishNameHighlighted: {
    color: '#032417',
    fontFamily: 'NotoSerif-Bold',
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 10,
  },
  actionRowPrimary: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#f1ede6',
  },
  actionBtnPrimaryActive: {
    backgroundColor: '#c7ef48',
  },
  actionBtnPrimaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#032417',
  },
  actionBtnPrimaryTextActive: {
    color: '#546b00',
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#f7f3ec',
  },
  actionBtnEditText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  actionBtnDeleteText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#ba1a1a',
  },
  // legacy aliases (unused but kept for safety)
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f1ede6',
  },
  actionBtnActive: { backgroundColor: '#c7ef48' },
  actionBtnStar: { backgroundColor: '#c7ef48' },
  actionBtnTextStar: { color: '#546b00' },
  actionBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#032417' },
  actionBtnTextActive: { color: '#546b00' },
});
