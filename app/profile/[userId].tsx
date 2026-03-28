import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAppStore } from '../../store';
import { useProfile, useFriends, useRelationship, useFollowUser, useUnfollowUser, useFollowerCount, useFollowingCount } from '../../lib/hooks/useProfile';
import { useUserRanking } from '../../lib/hooks/useVisit';
import { useUserFeed } from '../../lib/hooks/useFeed';
import { InfoTag } from '../../components/InfoTag';
import { getDisplayName } from '../../lib/utils/restaurantName';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const GRID_CELL = (width - 4) / 3;

// ── SHARED IMAGE CONSTANTS ────────────────────────────────────────────────────

const P_R1 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwTgROq2RTEr8n6fVTKzoBQV7JfU3c_sY4jT7drdus_7SG7VK_GDkPfoyvqqFpNVTSjPyyJP7uy8GIb-uucfjWFUkLo6pmTNi2HEdmjfS67bpoNR5aXYsOqXFJJaHFtOCbXHngWzQyoYsh8MKqsWZt_jfSBerWY6eHybkfvS6GC-PnCSCKN5WTjBUV4k5pWv71zG0WfXO-fGL840en1AeqUoTNRupaLzyr_FsbgXImTGDQ7-FJGvAd7ZEKtPfb7CBs5kgZo3iQwWY';
const P_R2 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzTvAwayFpahAbDrhNrgvM_e9ikaYZoRUIsNfC1sWjH1DLS0K4It7mmEzg8yQD3is2i65dg1Zd0ppZl8d73tDr46tzUcom6vk1IxiEeYwN539xQJDt9ylx2JG5nLIdZxpz98NpbycZ7qna6zkzsM6Wph4N--HgEXcY6r_Beb__sw7MF1hlgUkdVQOMMxI5RusdU5Ydi4LrtiThsTYBbV8JDr--9cgdkJrgit24GYvEczOfCUwMNGDEAq1v9EU37nCUsnSVsr2dX88';
const P_R3 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtxAL136ZY9-KwgNPCo1ED5Uu2to_Yvf0zK4iINAuDaiYuGujR2Gl2zB5ShHd8XF9lVX7x0hMMXePugLZWBxxLaZEys-Fi9uj9D5BpqJdsGySfJevfuf0srNqKuqD4o-xmhb183neQALQySxMTOr_58uPGMdmdpHUoiuOYdPvfoQcW1NWF1c0y1GmJcxNhqFfRfLztDn3db0vEVcuUJxEbtHuNPOV9TggjA3YYnmc7KGVzVYZn2DXuoWeJeqyat2bj-oTw5Sf8xRY';
const P_D1 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMZV_WojyxnnP3GhLLKT3PyPXUA4X4dGId_1sI2dmcgKEvOqZrcveLcwiBp5qrxM6xcjkRWMiU9jiQhigjDD-NQrWB841h1nnGmiWbuFQpJUF4uB1n9IcfJK5PNA0kE3_0IpEzcxoNVNyUR-YG5lu0Wg50eU5-X_DiEBU6j9iR1vUM-1s2BSYwVoCsUXLgUUZptGLzC-AhCBhMGtk_6ndHDeFN4BglfimU2LiYx6S575Gf6WsVaRl6XA1ZYQElIa4DHxTDMH-ooFQ';
const P_D2 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8Qxcy6TTA1owp6bBozdPnOYIEbT09tO8Ajleq8u1uU2TH6pOkqvEZZZbm9o1TdVl-yvrOB1SS9oX1FGgCCtc4ZT_nZdAgLrgbrgRUQzhrMMrp4thOzOMvGHRTxnc7cRqlJj75sMpQ6bI2z66UdwnUVTz5LSrRY573zXxpInss3o1SqnVadPFbeTGzrGk8DlXeBwKPqt_HKS7CacEol3kNHMxGl1LcSqgBcL2tzaJo77WuUna_shLBnz5cs-L8Hyt_UgydNV1s3Bk';
const P_D3 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrPJnME-zs4KV1PEEliIuSWe6we9KkGSbUGhTQiQcaZXYwYpA-5GRngMYWhO5m9b6yFQGT9M4KbYC7JoNk8MUR1PrW0cYbU7LA7LWa9p06CbxySXXsfTL3nZ8KYsjERF98EudAOvUXr5i_5lw-roDBFX1Hg9OniEVA2H7gTUnXGKlFnioFYdq4uKOcd-XWZVOEXBAe_pLIFsnFqf-pF3X8_Bce6XA5UANSViVfK0W0tbcCdur48r5wzgMEeY623Zv9BOo4wZMUE';
const P_D4 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAoqJDSK1wNGM_4yPL7M_SWV4npDVCkRXk3o_RHz9tjuqVKfrTqhBZNlhnO00mYeQ9VsWS3XcxQ0aXfgYvu1ocH2cxzCxAKY_v84RQ0pgGjUzlnzUA6qLsczSZ4CzXibis81zQ39yGvE45d2Q_7K2pzzhZDZD68s91NWycN8mKm0cDMZ1sky_kUBBqYxvoAtv0WXUIDutqivsnUmJQPlt1isqffDauBnMjL83K2-p2wWqSjwVSy_lmH1qASx2G-mTYD7LFawf-mcw';
const P_D5 = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJurDJ_H6kKlQMwlk3OeTfVn5Yr-rTtKukgmvJptdvGaZdKnsCVSTb1zxZhltyu8U7KtqtnFCvh4ZKHBua73kZi4VBWcw5ozP9wjtv7Jcyf5CkiX4kngL-SSMkr0AgFPZlGE1wOH_M5Fx9WO0mBKApyqFVGB0BY8ly6FHeLXxTjWL1uoOGMNbw4X6K0zwfew53yXRGhwMb-8n1q8PUIjawUR2RMO4y3E5PIkklPJ0XYuw4n-Y3e1MS2ktzr8uWDbPT1Lu0VbILyFU';
const P_AVT = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY_P8WAwGdtqJnDEfmkWwGtMEBxK_q75-e3WPeq3eJtCZ9hvBphNe8kNaM-xp6PnisryCyvD2VhhMwd6E4QEhzEdq0k6WoCRGXgFAr-yZybHU-kOnwrGLaKlcPke2b-9-SlUxxBHIFI6nUVRXrQ9DnrhC9Mxf15r8ZbBeahLaqzBoCWyNbE3LZCNAr_UhXId5-GXgJ9NiaOxkNb1HrVw8S-MxnHnWArARJccpyQiTNC1OrPdqWpdA_SeKxMihbbi2TqlfhHmJUYVE';
const AVT_JAVIER = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAFdDwvquATLmpsLf8yzCu7IVfZaYZL2NBqWCZvEyAV0fCCBjeS6gr4LXlclF_7aPXTfuWNmsDcY_Po1nP1RT7Q7yOllSvdJ76fhD1vgsgvg6D9LuO41CudDHbvfcVVZPuTxXW4X4QHcbd4mM5McSBaduhW6RhJ4yEFU6TLMexQz2WWwL8_53xmXEHqc5jHXeNFSo9qFWcBfy9BrxEUvfqPlcCYIBY4k2XKfa-X3Y3fErrYK6zO_XWM39beb0Z9MsE9W6aA9HwiPY';
const AVT_ELENA = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCshqfu17SkfytNBsWvHTdZVFJvD1d36xezrVplFXfKngGJhcR--knUcvVfnmBc9QpAb4hz8EeilLUFRPXWC-3bjNa5e0OA6jrVKCdsnp_GF8ZDzIF9LuUmJP56qgJxGpuGZOm9p7HVyyVKzdu_KgA33Ouf2zEPg-y8nUOqImFccdQI2lk3cHmwTTVn6tjTIFFRv86E80NKtE2ywkJ58gZ5DBaBQBZC2uBUNxv-eBK7C-Pa687xheadVznM3v1JpygDryc11HD-d5U';
const AVT_MARCOS = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYcqNp6jVFXZXm4aMdDlZQggdphR4UYfjTVE_CETMzDn9gCZkT3aHm8Otgmb4OZTZ2H39MnGN1bIp1buJMqVUqShadC-AQ2v_N7Y3A-qP_BMSM4-5Ra8191d6dF-zP_2LJeMQdvQkjuMyYArFrDWcP8kV1RuamQpUAzoZypKRCXOww_HEKkyh7Q2ECt4kXQRMDgMYscmij1hpIRV9dxk_0xP3do6hhfqCtIyQ4m418nWqGl93AfUwOTvmbzbcBy7zgMN2z_PSB42s';
const AVT_SOFIA = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCT6XkKRCDK0V3jy8EP6N74OA0WAFokkdSIG6fiBIVjKr8CsbFEztT-Lc7YhEG1kn3GvdcHqUEQ2B0e5N9oKrO15B65RDjhNi0wOqktuIAK0ReJojw2_hN7VtUb_verbMOpA0GLeHesiBcSmAU9n2zyabfzAAJGuAEniAQ7ZzBZemRLLeAN6Z6KUF7u8xQD93sdvebl106OhL7M7Z2xgDR-pJAWCb6ZiayyRjsvfqyJbZbPyWtvRiUJmGCYf739YqCFYYdqcEtBWZo';

// ── OWN PROFILE ───────────────────────────────────────────────────────────────

const MY_PROFILE = {
  name: 'Jaime F.',
  city: 'Madrid',
  country: 'España',
  home_city: 'Madrid',
  title: 'CRÍTICO GASTRONÓMICO & GOURMET',
  levelLabel: 'QuintoExquisito',
  bio: 'Apasionado de la gastronomía española y la cocina de autor. Siempre buscando el próximo descubrimiento.',
  avatar: P_AVT,
  stats: { visited: 124, average: 9.1, friends: 850 },
  topRestaurants: [
    { id: '1', name: 'Casa Botín', neighborhood: 'La Latina · Madrid', cuisine: 'Española & Tapas', price: '€€', score: 9.5, image: P_R1 },
    { id: '2', name: "L'Atelier", neighborhood: 'Chamberí · Madrid', cuisine: 'Cocina de Autor', price: '€€€€', score: 9.2, image: P_R2 },
    { id: '3', name: 'DiverXO', neighborhood: 'Tetuán · Madrid', cuisine: null, price: '€€€€', score: 9.0, image: P_R3 },
  ],
  activityPosts: [
    { id: '1', image: P_D1 }, { id: '2', image: P_R1 }, { id: '3', image: P_R2 },
    { id: '4', image: P_D2 }, { id: '5', image: P_D3 }, { id: '6', image: P_R3 },
    { id: '7', image: P_D4 }, { id: '8', image: P_D5 }, { id: '9', image: P_D1 },
    { id: '10', image: P_R1 }, { id: '11', image: P_D2 }, { id: '12', image: P_R2 },
  ],
};

// ── OTHER USERS ───────────────────────────────────────────────────────────────

const OTHER_PROFILES: Record<string, {
  name: string; city: string; country: string; title: string;
  bio: string; levelLabel: string; avatar: string; affinity: number;
  stats: { visited: number; average: number; friends: number };
  topRestaurants: { id: string; name: string; neighborhood: string; cuisine: string; score: number; image: string }[];
  commonRestaurants: { id: string; name: string; image: string }[];
  activityPosts: { id: string; image: string }[];
}> = {
  '1': {
    name: 'Javier Ruiz',
    city: 'Madrid', country: 'España',
    title: 'EXPLORADOR GASTRONÓMICO',
    bio: 'Me muevo por Madrid buscando rincones con historia y cocina honesta. El cochinillo y los vermuts son mi religión.',
    levelLabel: 'GourmetTotal',
    avatar: AVT_JAVIER,
    affinity: 98,
    stats: { visited: 42, average: 8.4, friends: 127 },
    topRestaurants: [
      { id: '1', name: 'Casa Botín', neighborhood: 'La Latina · Madrid', cuisine: 'Cocina Castellana', score: 9.2, image: P_R1 },
      { id: '3', name: 'Sacha', neighborhood: 'Almagro · Madrid', cuisine: 'Bistró', score: 8.9, image: P_R3 },
      { id: '2', name: 'Disfrutar', neighborhood: 'Eixample · Barcelona', cuisine: 'Alta Cocina', score: 8.7, image: P_R2 },
    ],
    commonRestaurants: [
      { id: '1', name: 'Casa Botín', image: P_R1 },
      { id: '3', name: 'Sacha', image: P_R3 },
    ],
    activityPosts: [
      { id: '1', image: P_R1 }, { id: '2', image: P_D1 }, { id: '3', image: P_D2 },
      { id: '4', image: P_R2 }, { id: '5', image: P_D3 }, { id: '6', image: P_R3 },
    ],
  },
  '2': {
    name: 'Elena M.',
    city: 'Barcelona', country: 'España',
    title: 'FANÁTICA DE LA COCINA ASIÁTICA',
    bio: 'Barcelona es mi casa y Disfrutar mi catedral. Obsesionada con los sabores umami y la cocina de fusión asiática.',
    levelLabel: 'UmamiMaster',
    avatar: AVT_ELENA,
    affinity: 85,
    stats: { visited: 128, average: 9.1, friends: 340 },
    topRestaurants: [
      { id: '2', name: 'Disfrutar', neighborhood: 'Eixample · Barcelona', cuisine: 'Alta Cocina', score: 9.5, image: P_R2 },
      { id: '1', name: 'Tickets', neighborhood: 'Poble Sec · Barcelona', cuisine: 'Tapas Creativas', score: 9.1, image: P_R1 },
      { id: '3', name: 'Hoja Santa', neighborhood: 'Eixample · Barcelona', cuisine: 'Mexicana', score: 8.8, image: P_R3 },
    ],
    commonRestaurants: [
      { id: '2', name: 'Disfrutar', image: P_R2 },
      { id: '1', name: 'Casa Botín', image: P_R1 },
      { id: '3', name: 'DiverXO', image: P_R3 },
    ],
    activityPosts: [
      { id: '1', image: P_D4 }, { id: '2', image: P_R2 }, { id: '3', image: P_D5 },
      { id: '4', image: P_R1 }, { id: '5', image: P_D1 }, { id: '6', image: P_R3 },
    ],
  },
  '3': {
    name: 'Marcos V.',
    city: 'Madrid', country: 'España',
    title: 'TAPAS & VERMUT AFICIONADO',
    bio: 'La barra del bar es mi oficina. Ponzano es mi barrio y el vermut del domingo, mi ritual sagrado.',
    levelLabel: 'TapasLover',
    avatar: AVT_MARCOS,
    affinity: 72,
    stats: { visited: 67, average: 7.8, friends: 89 },
    topRestaurants: [
      { id: '1', name: 'Sala de Despiece', neighborhood: 'Ponzano · Madrid', cuisine: 'Tapas Modernas', score: 8.5, image: P_R1 },
      { id: '2', name: 'Bar Tomate', neighborhood: 'Almagro · Madrid', cuisine: 'Mediterránea', score: 8.2, image: P_R2 },
      { id: '3', name: 'La Pepita', neighborhood: 'Centro · Madrid', cuisine: 'Cocina Española', score: 7.9, image: P_R3 },
    ],
    commonRestaurants: [
      { id: '1', name: 'Bar Tomate', image: P_R1 },
    ],
    activityPosts: [
      { id: '1', image: P_D2 }, { id: '2', image: P_D3 }, { id: '3', image: P_R1 },
      { id: '4', image: P_D1 }, { id: '5', image: P_R2 }, { id: '6', image: P_D4 },
    ],
  },
  '4': {
    name: 'Sofia Blanco',
    city: 'Valencia', country: 'España',
    title: 'BRUNCH & CAFÉ HUNTER',
    bio: 'En busca del café perfecto y el aguacate tostado que lo acompañe. Valencia, Barcelona y Madrid en rotación.',
    levelLabel: 'CafeNomad',
    avatar: AVT_SOFIA,
    affinity: 61,
    stats: { visited: 15, average: 8.0, friends: 34 },
    topRestaurants: [
      { id: '1', name: 'Masa Madre', neighborhood: 'Chueca · Madrid', cuisine: 'Brunch · Panadería', score: 8.8, image: P_R1 },
      { id: '2', name: 'Federal Café', neighborhood: 'Sant Antoni · Barcelona', cuisine: 'Brunch', score: 8.3, image: P_R2 },
      { id: '3', name: 'Umami Bar', neighborhood: 'Malasaña · Madrid', cuisine: 'Japonesa Fusión', score: 8.0, image: P_R3 },
    ],
    commonRestaurants: [],
    activityPosts: [
      { id: '1', image: P_D5 }, { id: '2', image: P_R3 }, { id: '3', image: P_D4 },
    ],
  },
};

const RANK_COLORS = ['#c7ef48', '#f7f3ec', '#f7f3ec'];
const RANK_TEXT_COLORS = ['#546b00', '#032417', '#032417'];

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<'favoritos' | 'publicaciones'>('favoritos');
  const [isFriend, setIsFriend] = useState(false);

  const currentUser = useAppStore((s) => s.currentUser);
  const isOwn = !userId || userId === 'me' || userId === currentUser?.id;
  const profileUserId = isOwn ? (currentUser?.id ?? '') : userId;

  // Always fetch real data for any user
  const { data: realProfile, isLoading: profileLoading } = useProfile(profileUserId || undefined);
  const { data: realRanking = [], isLoading: rankingLoading } = useUserRanking(profileUserId || undefined);
  const { data: userFeedData, isLoading: feedLoading } = useUserFeed(profileUserId || undefined);
  const { data: friendsList = [] } = useFriends(profileUserId || undefined);
  const { data: relationship } = useRelationship(currentUser?.id, isOwn ? undefined : profileUserId);
  const { mutateAsync: follow, isPending: following } = useFollowUser(currentUser?.id ?? '');
  const { mutateAsync: unfollow, isPending: unfollowing } = useUnfollowUser(currentUser?.id ?? '');
  const { data: followerCount = 0 } = useFollowerCount(profileUserId || undefined);
  const { data: followingCount = 0 } = useFollowingCount(profileUserId || undefined);

  const relType = (relationship as any)?.type ?? null; // null | 'following' | 'mutual'
  const isMutualFriend = relType === 'mutual';
  const isFollowing = relType !== null;

  // Build display data from real data + mock fallback
  const profileName = (realProfile as any)?.name ?? (isOwn ? MY_PROFILE.name : 'Usuario');
  const profileCity = (realProfile as any)?.city ?? (isOwn ? MY_PROFILE.city : '');
  const profileBio = (realProfile as any)?.bio ?? (isOwn ? MY_PROFILE.bio : '');
  const profileAvatar = (realProfile as any)?.avatar_url ?? (isOwn ? MY_PROFILE.avatar : null);
  const profileHandle = (realProfile as any)?.handle ?? null;

  const avgScore = realRanking.length > 0
    ? Math.round((realRanking.reduce((s: number, v: any) => s + (v.rank_score ?? 0), 0) / realRanking.length) * 10) / 10
    : 0;

  const topRestaurants = realRanking.slice(0, 3).map((v: any, i: number) => ({
    id: v.restaurant?.id ?? i,
    name: v.restaurant ? getDisplayName(v.restaurant, 'ranking') : (v.restaurant?.name ?? '—'),
    neighborhood: [v.restaurant?.neighborhood, v.restaurant?.city].filter(Boolean).join(' · '),
    cuisine: (v.restaurant?.cuisine as string | null) ?? null,
    price: (v.restaurant?.price_level as string | null) ?? null,
    score: v.rank_score ?? 0,
    image: v.restaurant?.cover_image_url ?? null,
  }));

  // Publicaciones: all visits from the user's feed, each with cover image
  const allUserPosts = (userFeedData?.pages ?? []).flatMap((p) => p);
  const publicaciones = allUserPosts.map((post: any) => {
    const userPhoto = (post.photos ?? []).find((p: any) => p?.photo_url)?.photo_url ?? null;
    // Fallback to restaurant cover image from Google Places
    const image = userPhoto ?? post.restaurant?.cover_image_url ?? null;
    return {
      id: post.id,
      image,
      restaurantName: post.restaurant?.name ?? '',
      score: post.rank_score ?? null,
    };
  });


  async function handleLogout() {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/auth');
          },
        },
      ]
    );
  }

  async function handleFollowToggle() {
    if (!currentUser?.id || !profileUserId) return;
    if (isFollowing) {
      Alert.alert(
        isMutualFriend ? 'Dejar de ser amigos' : 'Dejar de seguir',
        `¿Dejar de seguir a ${profileName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Dejar de seguir',
            style: 'destructive',
            onPress: async () => {
              try { await unfollow(profileUserId); } catch (e: any) {
                Alert.alert('Error', e.message ?? 'No se pudo completar la acción.');
              }
            },
          },
        ]
      );
    } else {
      try { await follow(profileUserId); } catch (e: any) {
        Alert.alert('Error', e.message ?? 'No se pudo completar la acción.');
      }
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwn ? 'Perfil' : profileName}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (isOwn) {
              router.push('/settings');
            } else {
              Share.share({
                title: profileName,
                message: `Mira el perfil de ${profileName} en fudi`,
              });
            }
          }}
        >
          <MaterialIcons
            name={isOwn ? 'settings' : 'ios-share'}
            size={24}
            color="#032417"
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Hero */}
        <View style={{ paddingTop: Platform.OS === 'ios' ? 120 : 100 }}>
          <View style={styles.profileHero}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialIcons name="person" size={40} color="#727973" />
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{profileName}</Text>
            {profileHandle ? (
              <Text style={styles.profileHandle}>@{profileHandle}</Text>
            ) : null}
            {profileCity ? (
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={13} color="#727973" />
                <Text style={styles.locationInfoText}>{profileCity}</Text>
              </View>
            ) : null}
            {profileBio ? (
              <Text style={styles.profileBio}>{profileBio}</Text>
            ) : null}

            {/* Action button */}
            {isOwn ? (
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/profile/edit')}
              >
                <Text style={styles.editBtnText}>Editar Perfil</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.connectBtn,
                  isMutualFriend ? styles.mutualBtn : isFollowing ? styles.followingBtn : null,
                ]}
                activeOpacity={0.8}
                onPress={handleFollowToggle}
                disabled={following || unfollowing}
              >
                {(following || unfollowing) ? (
                  <ActivityIndicator size="small" color={isFollowing ? '#546b00' : '#ffffff'} />
                ) : (
                  <>
                    <MaterialIcons
                      name={isMutualFriend ? 'people' : isFollowing ? 'check' : 'person-add'}
                      size={17}
                      color={isFollowing ? '#546b00' : '#ffffff'}
                    />
                    <Text style={[styles.connectBtnText, isFollowing && styles.friendBtnText]}>
                      {isMutualFriend ? 'Amigos' : isFollowing ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{realRanking.length}</Text>
              <Text style={styles.statLabel}>VISITADOS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgScore > 0 ? avgScore.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>MEDIA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>SEGUIDORES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>SIGUIENDO</Text>
            </View>
          </View>
        </View>

        {/* Sticky tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'favoritos' && styles.tabActive]}
              onPress={() => setActiveTab('favoritos')}
            >
              <MaterialIcons
                name="favorite"
                size={16}
                color={activeTab === 'favoritos' ? '#032417' : '#727973'}
              />
              <Text style={[styles.tabText, activeTab === 'favoritos' && styles.tabTextActive]}>
                Favoritos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'publicaciones' && styles.tabActive]}
              onPress={() => setActiveTab('publicaciones')}
            >
              <MaterialIcons
                name="grid-on"
                size={16}
                color={activeTab === 'publicaciones' ? '#032417' : '#727973'}
              />
              <Text style={[styles.tabText, activeTab === 'publicaciones' && styles.tabTextActive]}>
                Publicaciones
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab content */}
        {profileLoading || rankingLoading || feedLoading ? (
          <ActivityIndicator size="large" color="#032417" style={{ marginTop: 40 }} />
        ) : activeTab === 'favoritos' ? (
          <FavoritosTab restaurants={topRestaurants} showRankingLink={isOwn} />
        ) : (
          <PublicacionesTab posts={publicaciones} />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function FavoritosTab({
  restaurants,
  showRankingLink,
}: {
  restaurants: { id: string | number; name: string; neighborhood: string; cuisine: string | null; price?: string | null; score: number; image: string | null }[];
  showRankingLink: boolean;
}) {
  return (
    <View style={styles.favSection}>
      {restaurants.map((restaurant, idx) => (
        <TouchableOpacity
          key={restaurant.id}
          style={styles.favCard}
          activeOpacity={0.88}
          onPress={() => router.push(`/restaurant/${restaurant.id}`)}
        >
          <View style={styles.favImageWrapper}>
            {restaurant.image ? (
              <Image source={{ uri: restaurant.image }} style={styles.favImage} resizeMode="cover" />
            ) : (
              <View style={[styles.favImage, { backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="restaurant" size={36} color="#c1c8c2" />
              </View>
            )}
            <View style={styles.favOverlay} />
            <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[idx] }]}>
              <Text style={[styles.rankBadgeText, { color: RANK_TEXT_COLORS[idx] }]}>
                #{idx + 1}
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>{restaurant.score.toFixed(1)}</Text>
            </View>
            <View style={styles.favInfoOverlay}>
              <Text style={styles.favName}>{restaurant.name}</Text>
              {(restaurant.cuisine || restaurant.price) ? (
                <View style={{ flexDirection: 'row', gap: 5, marginTop: 5 }}>
                  <InfoTag value={restaurant.cuisine} />
                  <InfoTag value={restaurant.price} />
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.verTodoBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/ranking')}
      >
        <MaterialIcons name="format-list-numbered" size={18} color="#032417" />
        <Text style={styles.verTodoBtnText}>
          {showRankingLink ? 'Ver mi ranking completo' : 'Ver su ranking completo'}
        </Text>
        <MaterialIcons name="arrow-forward" size={18} color="#032417" />
      </TouchableOpacity>
    </View>
  );
}

function PublicacionesTab({ posts }: { posts: { id: string; image: string | null; restaurantName: string; score: number | null }[] }) {
  if (posts.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 }}>
        <MaterialIcons name="grid-on" size={40} color="#e6e2db" />
        <Text style={{ fontFamily: 'NotoSerif-Bold', fontSize: 16, color: '#032417', textAlign: 'center' }}>
          Sin publicaciones todavía
        </Text>
        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973', textAlign: 'center', lineHeight: 19 }}>
          Tus visitas aparecerán aquí cuando registres una.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 8, backgroundColor: '#032417', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
          onPress={() => router.push('/registrar-visita')}
        >
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#ffffff' }}>Registrar visita</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.gridWrapper}>
      {posts.map((post, idx) => (
        <TouchableOpacity
          key={post.id}
          style={[
            styles.gridCell,
            (idx + 1) % 3 !== 0 && { marginRight: 2 },
            idx < posts.length - 3 && { marginBottom: 2 },
          ]}
          activeOpacity={0.9}
          onPress={() => router.push(`/visit/${post.id}`)}
        >
          {post.image ? (
            <Image source={{ uri: post.image }} style={styles.gridImage} resizeMode="cover" />
          ) : (
            // No-photo fallback — editorial cream card
            <View style={styles.gridImagePlaceholder}>
              <MaterialIcons name="restaurant" size={16} color="#c1c8c2" />
              <Text style={styles.gridPlaceholderName} numberOfLines={3}>
                {post.restaurantName}
              </Text>
              {post.score != null && (
                <View style={styles.gridPlaceholderBadge}>
                  <Text style={styles.gridPlaceholderScore}>{post.score.toFixed(1)}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
  },

  // Hero
  profileHero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#c7ef48',
  },
  affinityRing: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fdf9f2',
  },
  affinityRingHigh: { backgroundColor: '#c7ef48' },
  affinityRingLow: { backgroundColor: '#e6e2db' },
  profileName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 24,
    color: '#032417',
  },
  profileLocation: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
  },
  profileHandle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15,
    color: '#516600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  cityPickerWrapper: {
    width: '100%',
    marginTop: 10,
    marginBottom: 4,
    zIndex: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationInfoText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: '#727973',
  },
  profileBio: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#424844',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  profileTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  // Affinity pill
  affinityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e6e2db',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  affinityPillHigh: {
    backgroundColor: '#c7ef48',
  },
  affinityPillLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  affinityPillScore: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 14,
    color: '#424844',
  },
  affinityPillScoreHigh: {
    color: '#546b00',
  },
  levelBadge: {
    backgroundColor: '#f7f3ec',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#032417',
  },

  // Buttons
  editBtn: {
    backgroundColor: '#032417',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 8,
  },
  editBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#032417',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 4,
  },
  friendBtn: {
    backgroundColor: '#c7ef48',
  },
  mutualBtn: {
    backgroundColor: '#c7ef48',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#c7ef48',
  },
  connectBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  friendBtnText: {
    color: '#546b00',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: '#032417',
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(193,200,194,0.3)',
    marginVertical: 4,
  },

  // En común
  // Tabs
  tabsWrapper: {
    backgroundColor: '#fdf9f2',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7f3ec',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#727973',
  },
  tabTextActive: { color: '#032417' },

  // Favoritos
  favSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  favCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  favImageWrapper: { height: 180, position: 'relative' },
  favImage: { width: '100%', height: '100%' },
  favOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,36,23,0.50)',
  },
  rankBadge: {
    position: 'absolute',
    top: 14, left: 14,
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 13,
  },
  scoreBadge: {
    position: 'absolute',
    top: 14, right: 14,
    backgroundColor: '#c7ef48',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scoreBadgeText: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: '#546b00',
  },
  favInfoOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 16,
    gap: 2,
  },
  favCuisine: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#c7ef48',
    letterSpacing: 2,
  },
  favName: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: '#ffffff',
    lineHeight: 28,
  },
  favNeighborhood: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  verTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  verTodoBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
  },

  // Actividad grid
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  gridCell: {
    width: GRID_CELL,
    height: GRID_CELL,
  },
  gridImage: { width: '100%', height: '100%' },

  // No-photo placeholder — editorial card style
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f7f3ec',
    borderWidth: 1,
    borderColor: 'rgba(193,200,194,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 5,
  },
  gridPlaceholderName: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 10,
    color: '#032417',
    textAlign: 'center',
    lineHeight: 14,
  },
  gridPlaceholderBadge: {
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  gridPlaceholderScore: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 10,
    color: '#546b00',
  },
});
