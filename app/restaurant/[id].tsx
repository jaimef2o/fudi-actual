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
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useAppStore } from '../../store';
import {
  useRestaurant,
  useRestaurantStats,
  useFriendDishes,
  useRecentVisits,
} from '../../lib/hooks/useRestaurant';
import { useBookmark } from '../../lib/hooks/useVisit';

const IMG_REST = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwTgROq2RTEr8n6fVTKzoBQV7JfU3c_sY4jT7drdus_7SG7VK_GDkPfoyvqqFpNVTSjPyyJP7uy8GIb-uucfjWFUkLo6pmTNi2HEdmjfS67bpoNR5aXYsOqXFJJaHFtOCbXHngWzQyoYsh8MKqsWZt_jfSBerWY6eHybkfvS6GC-PnCSCKN5WTjBUV4k5pWv71zG0WfXO-fGL840en1AeqUoTNRupaLzyr_FsbgXImTGDQ7-FJGvAd7ZEKtPfb7CBs5kgZo3iQwWY';
const IMG_COCHINILLO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMZV_WojyxnnP3GhLLKT3PyPXUA4X4dGId_1sI2dmcgKEvOqZrcveLcwiBp5qrxM6xcjkRWMiU9jiQhigjDD-NQrWB841h1nnGmiWbuFQpJUF4uB1n9IcfJK5PNA0kE3_0IpEzcxoNVNyUR-YG5lu0Wg50eU5-X_DiEBU6j9iR1vUM-1s2BSYwVoCsUXLgUUZptGLzC-AhCBhMGtk_6ndHDeFN4BglfimU2LiYx6S575Gf6WsVaRl6XA1ZYQElIa4DHxTDMH-ooFQ';
const IMG_CORDERO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrPJnME-zs4KV1PEEliIuSWe6we9KkGSbUGhTQiQcaZXYwYpA-5GRngMYWhO5m9b6yFQGT9M4KbYC7JoNk8MUR1PrW0cYbU7LA7LWa9p06CbxySXXsfTL3nZ8KYsjERF98EudAOvUXr5i_5lw-roDBFX1Hg9OniEVA2H7gTUnXGKlFnioFYdq4uKOcd-XWZVOEXBAe_pLIFsnFqf-pF3X8_Bce6XA5UANSViVfK0W0tbcCdur48r5wzgMEeY623Zv9BOo4wZMUE';
const IMG_SOPA = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8Qxcy6TTA1owp6bBozdPnOYIEbT09tO8Ajleq8u1uU2TH6pOkqvEZZZbm9o1TdVl-yvrOB1SS9oX1FGgCCtc4ZT_nZdAgLrgbrgRUQzhrMMrp4thOzOMvGHRTxnc7cRqlJj75sMpQ6bI2z66UdwnUVTz5LSrRY573zXxpInss3o1SqnVadPFbeTGzrGk8DlXeBwKPqt_HKS7CacEol3kNHMxGl1LcSqgBcL2tzaJo77WuUna_shLBnz5cs-L8Hyt_UgydNV1s3Bk';
const AVT_ELENA = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCshqfu17SkfytNBsWvHTdZVFJvD1d36xezrVplFXfKngGJhcR--knUcvVfnmBc9QpAb4hz8EeilLUFRPXWC-3bjNa5e0OA6jrVKCdsnp_GF8ZDzIF9LuUmJP56qgJxGpuGZOm9p7HVyyVKzdu_KgA33Ouf2zEPg-y8nUOqImFccdQI2lk3cHmwTTVn6tjTIFFRv86E80NKtE2ywkJ58gZ5DBaBQBZC2uBUNxv-eBK7C-Pa687xheadVznM3v1JpygDryc11HD-d5U';
const AVT_MARCOS = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYcqNp6jVFXZXm4aMdDlZQggdphR4UYfjTVE_CETMzDn9gCZkT3aHm8Otgmb4OZTZ2H39MnGN1bIp1buJMqVUqShadC-AQ2v_N7Y3A-qP_BMSM4-5Ra8191d6dF-zP_2LJeMQdvQkjuMyYArFrDWcP8kV1RuamQpUAzoZypKRCXOww_HEKkyh7Q2ECt4kXQRMDgMYscmij1hpIRV9dxk_0xP3do6hhfqCtIyQ4m418nWqGl93AfUwOTvmbzbcBy7zgMN2z_PSB42s';
const AVT_JAVIER = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAFdDwvquATLmpsLf8yzCu7IVfZaYZL2NBqWCZvEyAV0fCCBjeS6gr4LXlclF_7aPXTfuWNmsDcY_Po1nP1RT7Q7yOllSvdJ76fhD1vgsgvg6D9LuO41CudDHbvfcVVZPuTxXW4X4QHcbd4mM5McSBaduhW6RhJ4yEFU6TLMexQz2WWwL8_53xmXEHqc5jHXeNFSo9qFWcBfy9BrxEUvfqPlcCYIBY4k2XKfa-X3Y3fErrYK6zO_XWM39beb0Z9MsE9W6aA9HwiPY';
const AVT_SOFIA = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCT6XkKRCDK0V3jy8EP6N74OA0WAFokkdSIG6fiBIVjKr8CsbFEztT-Lc7YhEG1kn3GvdcHqUEQ2B0e5N9oKrO15B65RDjhNi0wOqktuIAK0ReJojw2_hN7VtUb_verbMOpA0GLeHesiBcSmAU9n2zyabfzAAJGuAEniAQ7ZzBZemRLLeAN6Z6KUF7u8xQD93sdvebl106OhL7M7Z2xgDR-pJAWCb6ZiayyRjsvfqyJbZbPyWtvRiUJmGCYf739YqCFYYdqcEtBWZo';
const AVT_CARLOS = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY_P8WAwGdtqJnDEfmkWwGtMEBxK_q75-e3WPeq3eJtCZ9hvBphNe8kNaM-xp6PnisryCyvD2VhhMwd6E4QEhzEdq0k6WoCRGXgFAr-yZybHU-kOnwrGLaKlcPke2b-9-SlUxxBHIFI6nUVRXrQ9DnrhC9Mxf15r8ZbBeahLaqzBoCWyNbE3LZCNAr_UhXId5-GXgJ9NiaOxkNb1HrVw8S-MxnHnWArARJccpyQiTNC1OrPdqWpdA_SeKxMihbbi2TqlfhHmJUYVE';

// Lookup for name/neighborhood by ID (all IDs used across mock data)
const RESTAURANT_META: Record<string, { name: string; neighborhood: string; cuisine: string }> = {
  '1': { name: 'Casa Botín', neighborhood: 'La Latina · Madrid', cuisine: 'Cocina Castellana' },
  '2': { name: 'Sala Equis', neighborhood: 'El Rastro · Madrid', cuisine: 'Mediterránea' },
  '3': { name: 'DiverXO', neighborhood: 'Tetuán · Madrid', cuisine: 'Alta Cocina' },
  '4': { name: 'Sacha', neighborhood: 'Almagro · Madrid', cuisine: 'Cocina de Autor' },
  '5': { name: 'El Celler de Can Roca', neighborhood: 'Girona', cuisine: 'Alta Cocina' },
  '6': { name: 'Brasas & Sal', neighborhood: 'Chueca · Madrid', cuisine: 'Carne & Parrilla' },
  '7': { name: 'El Rincón de Lavapiés', neighborhood: 'Lavapiés · Madrid', cuisine: 'Española & Tapas' },
  '8': { name: 'Taberna Veracruz', neighborhood: 'Huertas · Madrid', cuisine: 'Mexicana' },
};

const RESTAURANT_DATA = {
  id: '1',
  name: 'Casa Botín',
  cuisine: 'Cocina Castellana',
  priceLevel: '€€',
  address: 'Calle de Cuchilleros, 17',
  neighborhood: 'La Latina · Madrid',
  image: IMG_REST,

  // Amigos
  friendScore: 8.8,
  friendVisits: 42,
  friendSaved: 128,
  friendDishes: [
    {
      id: '1',
      name: 'Cochinillo asado',
      note: 'La piel crujiente y la carne se deshace',
      image: IMG_COCHINILLO,
      friendsCount: 8,
      friendAvatars: [AVT_JAVIER, AVT_ELENA, AVT_MARCOS],
    },
    {
      id: '2',
      name: 'Cordero lechal asado',
      note: 'Cocinado durante 8 horas a baja temperatura',
      image: IMG_CORDERO,
      friendsCount: 5,
      friendAvatars: [AVT_SOFIA, AVT_CARLOS],
    },
    {
      id: '3',
      name: 'Sopa castellana',
      note: 'El clásico reconfortante de la casa',
      image: IMG_SOPA,
      friendsCount: 3,
      friendAvatars: [AVT_ELENA],
    },
  ],
  recentVisits: [
    { visitId: '1', name: 'Lucía Moreno', timeAgo: 'hace 3 días', score: 9.5, avatar: AVT_ELENA, dish: 'Cochinillo asado' },
    { visitId: '2', name: 'Marcos Pérez', timeAgo: 'hace 1 semana', score: 8.0, avatar: AVT_MARCOS, dish: 'Cordero lechal' },
    { visitId: '3', name: 'Sonia G.', timeAgo: 'hace 2 semanas', score: 8.8, avatar: AVT_SOFIA, dish: 'Cochinillo asado' },
    { visitId: '4', name: 'Carlos R.', timeAgo: 'hace 3 semanas', score: 9.2, avatar: AVT_CARLOS, dish: 'Sopa castellana' },
    { visitId: '5', name: 'Javier R.', timeAgo: 'hace 1 mes', score: 8.5, avatar: AVT_JAVIER, dish: 'Cordero lechal' },
  ],

  // Global
  globalScore: 9.1,
  globalVisits: 12400,
  globalSaved: 45200,
  globalDishes: [
    { id: '1', name: 'Cochinillo asado', note: 'El plato más emblemático del restaurante', image: IMG_COCHINILLO, totalOrders: 8420 },
    { id: '2', name: 'Cordero lechal asado', note: 'Cocinado durante 8 horas a baja temperatura', image: IMG_CORDERO, totalOrders: 6100 },
    { id: '3', name: 'Sopa castellana', note: 'El clásico reconfortante de la casa', image: IMG_SOPA, totalOrders: 3800 },
  ],
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mode, setMode] = useState<'amigos' | 'global'>('amigos');
  const [isFavorited, setIsFavorited] = useState(false);
  const currentUser = useAppStore((s) => s.currentUser);
  const { mutateAsync: toggleBookmark } = useBookmark(currentUser?.id);

  const { data: restaurant, isLoading: loadingRest } = useRestaurant(id);
  const { data: stats } = useRestaurantStats(id);
  const { data: friendDishes } = useFriendDishes(id, currentUser?.id);
  const { data: recentVisits } = useRecentVisits(id, currentUser?.id);

  // Merge real data with mock fallback for display
  const meta = RESTAURANT_META[id ?? '1'] ?? {};
  const mockData = { ...RESTAURANT_DATA, ...meta };

  const name = restaurant?.name ?? mockData.name;
  const neighborhood = restaurant?.neighborhood ?? mockData.neighborhood;
  const cuisine = restaurant?.cuisine ?? mockData.cuisine;
  const coverImage = restaurant?.cover_image_url ?? mockData.image;
  const priceLevel = restaurant?.price_level
    ? ['', '€', '€€', '€€€', '€€€€'][restaurant.price_level] ?? '€€'
    : mockData.priceLevel;

  const score = stats?.avg_score ?? (mode === 'amigos' ? mockData.friendScore : mockData.globalScore);
  const visits = stats?.visit_count ?? (mode === 'amigos' ? mockData.friendVisits : mockData.globalVisits);
  const saved = stats?.saved_count ?? (mode === 'amigos' ? mockData.friendSaved : mockData.globalSaved);
  const scoreLabel = mode === 'amigos' ? 'media amigos' : 'media fudi';

  const displayDishes = (friendDishes && friendDishes.length > 0)
    ? friendDishes.map((d: any, idx: number) => ({
        id: String(idx),
        name: d.dish_name,
        note: `Pedido por ${d.times_ordered} ${d.times_ordered === 1 ? 'amigo' : 'amigos'}`,
        image: d.photo_url ?? mockData.friendDishes[0]?.image ?? '',
        friendsCount: d.friends?.length ?? d.times_ordered,
        friendAvatars: (d.friends ?? []).slice(0, 3).map((f: any) => f.avatar_url).filter(Boolean),
      }))
    : mockData.friendDishes;

  const displayVisits = (recentVisits && recentVisits.length > 0)
    ? recentVisits.map((v: any) => ({
        visitId: v.id,
        name: v.user?.name ?? 'Usuario',
        timeAgo: v.visited_at ? `hace ${Math.floor((Date.now() - new Date(v.visited_at).getTime()) / 86400000)}d` : '',
        score: v.rank_score ?? 8.0,
        avatar: v.user?.avatar_url ?? '',
        dish: '',
      }))
    : mockData.recentVisits;

  if (loadingRest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#032417" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={async () => {
            const next = !isFavorited;
            setIsFavorited(next); // optimistic
            try {
              if (id && currentUser?.id) {
                await toggleBookmark({ restaurantId: id, save: next });
              }
            } catch {
              setIsFavorited(!next); // revert on error
            }
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isFavorited ? 'favorite' : 'favorite-border'}
            size={24}
            color={isFavorited ? '#c7ef48' : '#032417'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={{ uri: coverImage }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(3,36,23,0.92)']}
            style={styles.heroOverlay}
          />

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

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <View style={styles.heroScoreBadge}>
              <Text style={styles.heroScoreText}>{score.toFixed(1)}</Text>
              <Text style={styles.heroScoreLabel}>{scoreLabel}</Text>
            </View>
            <Text style={styles.heroName}>{name}</Text>
            <View style={styles.heroMeta}>
              <MaterialIcons name="location-on" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{neighborhood}</Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{cuisine}</Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{priceLevel}</Text>
            </View>
          </View>
        </View>

        {/* Bento stats */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCell}>
            <Text style={styles.bentoCellValue}>{visits.toLocaleString()}</Text>
            <Text style={styles.bentoCellLabel}>VISITAS</Text>
          </View>
          <View style={styles.bentoCell}>
            <Text style={styles.bentoCellValue}>{saved.toLocaleString()}</Text>
            <Text style={styles.bentoCellLabel}>GUARDADOS</Text>
          </View>
          <View style={[styles.bentoCell, styles.bentoCellHighlight]}>
            <Text style={[styles.bentoCellValue, styles.bentoCellValueHighlight]}>
              {score.toFixed(1)}
            </Text>
            <Text style={[styles.bentoCellLabel, styles.bentoCellLabelHighlight]}>
              {mode === 'amigos' ? 'AMIGOS' : 'GLOBAL'}
            </Text>
          </View>
        </View>

        {/* ── AMIGOS MODE ── */}
        {mode === 'amigos' && (
          <>
            {/* Lo que piden tus amigos */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="people" size={20} color="#032417" />
                <Text style={styles.sectionTitle}>Lo que piden tus amigos</Text>
              </View>
              <View style={styles.dishesList}>
                {displayDishes.map((dish, idx) => (
                  <View key={dish.id} style={styles.dishItem}>
                    <View style={styles.dishRankBadge}>
                      <Text style={styles.dishRankText}>#{idx + 1}</Text>
                    </View>
                    {dish.image ? (
                      <Image source={{ uri: dish.image }} style={styles.dishImage} />
                    ) : (
                      <View style={[styles.dishImage, { backgroundColor: '#f1ede6', alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name="restaurant-menu" size={28} color="#c1c8c2" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dishName}>{dish.name}</Text>
                      <Text style={styles.dishNote}>{dish.note}</Text>
                      <View style={styles.dishAvatarRow}>
                        {(dish.friendAvatars ?? []).filter(Boolean).map((a: any, i: number) => (
                          <Image
                            key={i}
                            source={{ uri: a }}
                            style={[styles.dishAvatar, { marginLeft: i > 0 ? -8 : 0 }]}
                          />
                        ))}
                        <Text style={styles.dishFriendsText}>
                          {dish.friendsCount} amigos
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Visitas recientes de amigos */}
            <View style={styles.visitsSection}>
              <Text style={styles.visitsSectionTitle}>Visitas recientes</Text>
              <Text style={styles.visitsSectionSubtitle}>
                Últimas visitas de tu círculo
              </Text>
              <View style={styles.visitsList}>
                {displayVisits.map((visit: any, i: number) => (
                  <TouchableOpacity
                    key={visit.visitId}
                    style={[styles.visitItem, i < displayVisits.length - 1 && styles.visitItemBorder]}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/visit/${visit.visitId}`)}
                  >
                    {visit.avatar ? (
                      <Image source={{ uri: visit.avatar }} style={styles.visitAvatar} />
                    ) : (
                      <View style={[styles.visitAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                        <MaterialIcons name="person" size={20} color="#727973" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitName}>{visit.name}</Text>
                      {visit.dish ? <Text style={styles.visitDish}>{visit.dish}</Text> : null}
                      <Text style={styles.visitTime}>{visit.timeAgo}</Text>
                    </View>
                    <View style={styles.visitRight}>
                      <View style={styles.visitScoreBadge}>
                        <Text style={styles.visitScoreText}>{(visit.score ?? 0).toFixed(1)}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color="#c1c8c2" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── GLOBAL MODE ── */}
        {mode === 'global' && (
          <>
            {/* Platos más pedidos en Fudi */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="public" size={20} color="#032417" />
                <Text style={styles.sectionTitle}>Los más pedidos en Fudi</Text>
              </View>
              <View style={styles.dishesList}>
                {mockData.globalDishes.map((dish, idx) => (
                  <View key={dish.id} style={styles.dishItem}>
                    <View style={styles.dishRankBadge}>
                      <Text style={styles.dishRankText}>#{idx + 1}</Text>
                    </View>
                    <Image source={{ uri: dish.image }} style={styles.dishImage} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dishName}>{dish.name}</Text>
                      <Text style={styles.dishNote}>{dish.note}</Text>
                      <View style={styles.globalOrdersRow}>
                        <MaterialIcons name="restaurant" size={12} color="#727973" />
                        <Text style={styles.globalOrdersText}>
                          {dish.totalOrders.toLocaleString()} pedidos en Fudi
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Privacy notice */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyIconWrapper}>
                <MaterialIcons name="lock" size={22} color="#032417" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Las visitas son privadas</Text>
                <Text style={styles.privacyText}>
                  En la vista Global solo se comparten estadísticas agregadas. Para ver las visitas individuales, consulta la pestaña de Amigos.
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyCtaWrapper}>
        <TouchableOpacity
          style={styles.stickyCtaBtn}
          activeOpacity={0.88}
          onPress={() => router.push(`/journey-b/${id}`)}
        >
          <MaterialIcons name="restaurant-menu" size={20} color="#ffffff" />
          <Text style={styles.stickyCtaText}>¿Qué pedimos?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  stickyCtaWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 24,
    right: 24,
    zIndex: 60,
  },
  stickyCtaBtn: {
    backgroundColor: '#032417',
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  stickyCtaText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: '#ffffff',
  },
  headerBtn: { padding: 8, borderRadius: 999 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
    flex: 1,
    textAlign: 'center',
  },
  hero: {
    height: 480,
    position: 'relative',
    marginTop: Platform.OS === 'ios' ? 108 : 88,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
  toggleWrapper: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(235,232,225,0.92)',
    borderRadius: 999,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 7,
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleTextActive: { color: '#032417' },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 28,
    paddingBottom: 44,
    gap: 10,
  },
  heroScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#c7ef48',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  heroScoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#546b00',
  },
  heroScoreLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#546b00',
  },
  heroName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 38,
    color: '#ffffff',
    lineHeight: 44,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  heroMetaText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
  },
  heroMetaDot: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 13,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -28,
    zIndex: 10,
  },
  bentoCell: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  bentoCellHighlight: {
    backgroundColor: '#c7ef48',
  },
  bentoCellValue: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
  },
  bentoCellValueHighlight: {
    color: '#546b00',
    fontSize: 22,
  },
  bentoCellLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#727973',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
  bentoCellLabelHighlight: {
    color: '#546b00',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: '#032417',
  },
  dishesList: { gap: 12 },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dishRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f7f3ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishRankText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#032417',
  },
  dishImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  dishName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: '#032417',
    marginBottom: 3,
  },
  dishNote: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    lineHeight: 17,
    marginBottom: 8,
  },
  dishAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dishAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dishFriendsText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#546b00',
    marginLeft: 6,
  },
  globalOrdersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  globalOrdersText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#727973',
  },

  // Recent visits (amigos only)
  visitsSection: {
    backgroundColor: '#f7f3ec',
    borderRadius: 28,
    marginHorizontal: 20,
    marginTop: 32,
    padding: 24,
  },
  visitsSectionTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
    marginBottom: 2,
  },
  visitsSectionSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    marginBottom: 20,
  },
  visitsList: { gap: 0 },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  visitItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.25)',
  },
  visitAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#c7ef48',
  },
  visitName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  visitDish: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#424844',
    fontStyle: 'italic',
    marginTop: 1,
  },
  visitTime: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#727973',
    marginTop: 2,
  },
  visitRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  visitScoreBadge: {
    backgroundColor: '#c7ef48',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  visitScoreText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 14,
    color: '#546b00',
  },

  // Privacy notice (global only)
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#f7f3ec',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 32,
    padding: 20,
  },
  privacyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
    marginBottom: 4,
  },
  privacyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    lineHeight: 19,
  },
});
