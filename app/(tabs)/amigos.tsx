import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import {
  useFriends,
  useFollowing,
  useFollowRequests,
  useSearchUsers,
  useFollowUser,
  useUnfollowUser,
  useRelationship,
  useSuggestedUsers,
  useRejectFollowRequest,
} from '../../lib/hooks/useProfile';
import { supabase } from '../../lib/supabase';
import { createInvitation } from '../../lib/api/users';

const SORT_OPTIONS = ['Mayor afinidad', 'Más activos', 'Recientes'] as const;
type SortOption = typeof SORT_OPTIONS[number];

// ─── Avatar helper ───────────────────────────────────────────────────────────

function Avatar({ uri, size = 48, radius }: { uri?: string | null; size?: number; radius?: number }) {
  const r = radius ?? size / 2;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#e6e2db', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name="person" size={size * 0.5} color="#727973" />
    </View>
  );
}

// ─── Search result card (uses real relationship from DB) ──────────────────────

function SearchResultCard({ user, currentUserId }: { user: any; currentUserId: string }) {
  const { data: rel, isLoading: loadingRel } = useRelationship(currentUserId, user.id);
  const { mutateAsync: follow, isPending: following } = useFollowUser(currentUserId);
  const { mutateAsync: unfollow, isPending: unfollowing } = useUnfollowUser(currentUserId);

  const relType = rel?.type ?? null; // 'following' | 'mutual' | null

  const label = relType === 'mutual' ? 'Amigos' : relType === 'following' ? 'Siguiendo' : 'Seguir';
  const isConnected = relType !== null;
  const busy = following || unfollowing || loadingRel;

  async function handlePress() {
    try {
      if (isConnected) {
        // Confirm unfollow
        Alert.alert(
          'Dejar de seguir',
          `¿Dejar de seguir a ${user.name}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Dejar de seguir',
              style: 'destructive',
              onPress: async () => {
                try { await unfollow(user.id); } catch (e: any) {
                  Alert.alert('Error', e.message ?? 'No se pudo completar la acción.');
                }
              },
            },
          ]
        );
      } else {
        await follow(user.id);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo completar la acción.');
    }
  }

  return (
    <TouchableOpacity
      style={styles.searchCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/profile/${user.id}`)}
    >
      <Avatar uri={user.avatar_url} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={styles.searchName} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.searchHandle} numberOfLines={1}>
          {user.handle ? `@${user.handle}` : user.city ?? ''}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.followBtn, isConnected && styles.followBtnConnected, relType === 'mutual' && styles.followBtnMutual]}
        onPress={handlePress}
        disabled={busy}
        activeOpacity={0.8}
      >
        {busy ? (
          <ActivityIndicator size="small" color={isConnected ? '#546b00' : '#ffffff'} />
        ) : (
          <>
            {relType === 'mutual' && <MaterialIcons name="check" size={13} color="#546b00" style={{ marginRight: 2 }} />}
            <Text style={[styles.followBtnText, isConnected && styles.followBtnTextConnected]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Pending follower card (someone follows you, you haven't followed back) ───

function FollowRequestCard({ requester, currentUserId }: { requester: any; currentUserId: string }) {
  const { mutateAsync: follow, isPending: accepting } = useFollowUser(currentUserId);
  const { mutateAsync: reject, isPending: rejecting } = useRejectFollowRequest(currentUserId);

  async function handleAccept() {
    try {
      await follow(requester.id);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo aceptar la solicitud.');
    }
  }

  async function handleReject() {
    try {
      await reject(requester.id);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo rechazar la solicitud.');
    }
  }

  return (
    <View style={styles.requestCard}>
      <TouchableOpacity onPress={() => router.push(`/profile/${requester.id}`)} activeOpacity={0.8}>
        <Avatar uri={requester.avatar_url} size={44} />
      </TouchableOpacity>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/profile/${requester.id}`)} activeOpacity={0.8}>
        <Text style={styles.searchName} numberOfLines={1}>{requester.name}</Text>
        <Text style={styles.searchHandle}>
          {requester.handle ? `@${requester.handle}` : requester.city ?? 'Quiere seguirte'}
        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Reject */}
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={handleReject}
          disabled={accepting || rejecting}
          activeOpacity={0.8}
        >
          {rejecting ? (
            <ActivityIndicator size="small" color="#727973" />
          ) : (
            <MaterialIcons name="close" size={16} color="#727973" />
          )}
        </TouchableOpacity>
        {/* Accept */}
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={handleAccept}
          disabled={accepting || rejecting}
          activeOpacity={0.8}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#546b00" />
          ) : (
            <Text style={styles.acceptBtnText}>Seguir</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Full friend card ─────────────────────────────────────────────────────────

function FriendCard({ friend, isMutual = true }: { friend: any; isMutual?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.card, !isMutual && { opacity: 0.85 }]}
      activeOpacity={0.85}
      onPress={() => router.push(`/profile/${friend.id}`)}
    >
      {/* Avatar + affinity badge */}
      <View style={{ position: 'relative' }}>
        <View style={styles.avatarContainer}>
          <Avatar uri={friend.avatar ?? null} size={56} radius={10} />
        </View>
        {isMutual && (
          <View style={[styles.affinityBadge, friend.isHighAffinity ? styles.affinityBadgeHigh : styles.affinityBadgeLow]}>
            <Text style={styles.affinityBadgeText}>{friend.affinity}%</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendName} numberOfLines={1}>{friend.name}</Text>
            {friend.handle ? (
              <Text style={styles.friendSpecialty}>@{friend.handle}</Text>
            ) : null}
            {friend.home_city ? (
              <View style={styles.friendCityRow}>
                <MaterialIcons name="location-on" size={11} color="#727973" />
                <Text style={styles.friendCityText}>{friend.home_city}</Text>
              </View>
            ) : null}
          </View>
          <MaterialIcons name="chevron-right" size={20} color="rgba(114,121,115,0.4)" />
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Visitas</Text>
            <Text style={styles.statValue}>{friend.visits}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Media</Text>
            <Text style={styles.statValue}>{friend.average > 0 ? friend.average.toFixed(1) : '—'}</Text>
          </View>
          <View style={[styles.statCell, friend.isHighAffinity && isMutual && styles.statCellHighlight]}>
            <Text style={styles.statLabel}>{isMutual ? 'Afinidad' : 'Estado'}</Text>
            <Text style={[styles.statValue, { fontStyle: 'italic', fontSize: 13 }]}>
              {isMutual ? (friend.affinity > 0 ? `${friend.affinity}%` : '—') : 'Siguiendo'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ text, count }: { text: string; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Text style={styles.sectionLabel}>{text}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AmigosScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort, setActiveSort] = useState<SortOption>('Mayor afinidad');
  const [sortOpen, setSortOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const currentUser = useAppStore((s) => s.currentUser);

  const { data: realFriends, isLoading: loadingFriends } = useFriends(currentUser?.id);
  const { data: followingList, isLoading: loadingFollowing } = useFollowing(currentUser?.id);
  const { data: followRequests, isLoading: loadingRequests } = useFollowRequests(currentUser?.id);
  const { data: suggestedUsers } = useSuggestedUsers(currentUser?.id);
  const { data: searchResults, isFetching: searching } = useSearchUsers(searchQuery);

  const isSearching = searchQuery.trim().length >= 2;

  // Map mutual friends
  const displayFriends: any[] = (realFriends ?? []).map((r: any) => ({
    id: r.friend?.id ?? r.target_id,
    name: r.friend?.name ?? 'Amigo',
    handle: r.friend?.handle ?? null,
    home_city: r.friend?.city ?? '',
    affinity: Math.round(r.affinity_score ?? 0),
    visits: 0,
    average: 0,
    avatar: r.friend?.avatar_url ?? null,
    isHighAffinity: (r.affinity_score ?? 0) >= 70,
  }));

  // Map following (one-way outgoing)
  const displayFollowing: any[] = (followingList ?? []).map((r: any) => ({
    id: r.friend?.id ?? r.target_id,
    name: r.friend?.name ?? 'Usuario',
    handle: r.friend?.handle ?? null,
    home_city: r.friend?.city ?? '',
    affinity: 0,
    visits: 0,
    average: 0,
    avatar: r.friend?.avatar_url ?? null,
    isHighAffinity: false,
  }));

  const sortedFriends = [...displayFriends].sort((a, b) => {
    if (activeSort === 'Mayor afinidad') return b.affinity - a.affinity;
    if (activeSort === 'Más activos') return b.visits - a.visits;
    return 0;
  });

  const pendingRequests: any[] = (followRequests ?? []).map((r: any) => r.requester).filter(Boolean);

  const isLoading = loadingFriends || loadingFollowing || loadingRequests;

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        {/* Saved posts icon */}
        <TouchableOpacity
          style={{ width: 48, alignItems: 'flex-start' }}
          onPress={() => router.push('/saved-posts')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="bookmark-border" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Amigos</Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => router.push(`/profile/${currentUser?.id}`)}
          onLongPress={() =>
            Alert.alert('Cuenta', '', [
              { text: 'Ver perfil', onPress: () => router.push(`/profile/${currentUser?.id}`) },
              { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
              { text: 'Cancelar', style: 'cancel' },
            ])
          }
          activeOpacity={0.8}
        >
          <Avatar uri={currentUser?.avatar} size={32} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#727973" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Buscar personas por nombre o @handle..."
            placeholderTextColor="rgba(114,121,115,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={18} color="#727973" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── SEARCH MODE ─────────────────────────────────────────────────── */}
        {isSearching && (
          <View style={{ marginBottom: 24 }}>
            <SectionLabel text="RESULTADOS" />
            {searching ? (
              <ActivityIndicator size="small" color="#032417" style={{ marginTop: 16 }} />
            ) : searchResults && (searchResults as any[]).filter((u: any) => u.id !== currentUser?.id).length > 0 ? (
              <View style={{ gap: 10 }}>
                {(searchResults as any[])
                  .filter((u: any) => u.id !== currentUser?.id)
                  .map((user: any) => (
                    <SearchResultCard key={user.id} user={user} currentUserId={currentUser?.id ?? ''} />
                  ))}
              </View>
            ) : (
              <View style={styles.emptySearch}>
                <MaterialIcons name="person-search" size={36} color="#c1c8c2" />
                <Text style={styles.emptySearchText}>Sin resultados para "{searchQuery}"</Text>
                <Text style={styles.emptySearchHint}>Prueba con el nombre completo o el handle</Text>
              </View>
            )}
          </View>
        )}

        {/* ── FRIENDS MODE ────────────────────────────────────────────────── */}
        {!isSearching && (
          <>
            {isLoading && (
              <ActivityIndicator size="large" color="#032417" style={{ marginVertical: 32 }} />
            )}

            {/* Solicitudes pendientes */}
            {!isLoading && pendingRequests.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text="SOLICITUDES" count={pendingRequests.length} />
                <View style={{ gap: 10 }}>
                  {pendingRequests.map((req: any) => (
                    <FollowRequestCard key={req.id} requester={req} currentUserId={currentUser?.id ?? ''} />
                  ))}
                </View>
              </View>
            )}

            {/* Amigos mutuos */}
            {!isLoading && (
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <SectionLabel text="AMIGOS" count={sortedFriends.length > 0 ? sortedFriends.length : undefined} />
                  {sortedFriends.length > 0 && (
                    <TouchableOpacity style={styles.sortTriggerSmall} onPress={() => setSortOpen(true)} activeOpacity={0.75}>
                      <Text style={styles.sortTriggerSmallText}>{activeSort}</Text>
                      <MaterialIcons name="expand-more" size={16} color="#032417" />
                    </TouchableOpacity>
                  )}
                </View>

                {sortedFriends.length === 0 ? (
                  <View style={styles.emptySection}>
                    <MaterialIcons name="group-add" size={40} color="#c1c8c2" />
                    <Text style={styles.emptySectionTitle}>Aún no tienes amigos</Text>
                    <Text style={styles.emptySectionText}>
                      Búscalos por nombre o @handle en el buscador de arriba, o invítalos con un enlace personal.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyCtaBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSearchQuery('');
                        setTimeout(() => searchInputRef.current?.focus(), 100);
                      }}
                    >
                      <MaterialIcons name="search" size={15} color="#ffffff" />
                      <Text style={styles.emptyCtaBtnText}>Buscar personas</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 20 }}>
                    {sortedFriends.map((friend) => (
                      <FriendCard key={friend.id} friend={friend} isMutual />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Invite banner */}
            <View style={styles.inviteBanner}>
              <View style={styles.bannerGlow} />
              <Text style={styles.bannerTitle}>¿Buscas más compañía?</Text>
              <Text style={styles.bannerSubtitle}>
                Amplía tu círculo gourmet y descubre nuevas experiencias gastronómicas con tus conocidos.
              </Text>
              <View style={styles.bannerButtons}>
                <TouchableOpacity
                  style={[styles.inviteBtn, inviting && { opacity: 0.7 }]}
                  activeOpacity={0.8}
                  disabled={inviting}
                  onPress={async () => {
                    try {
                      const u = useAppStore.getState().currentUser;
                      if (!u?.id) return;
                      setInviting(true);
                      const inv = await createInvitation(u.id);
                      const link = `https://fudi.app/invite/${inv.token}`;
                      await Share.share({
                        message: `${u.name ?? 'Alguien'} te invita a fudi — el círculo gastronómico privado. Únete aquí: ${link}`,
                        url: link,
                      });
                    } catch {
                      await Share.share({
                        message: '¡Únete a fudi y comparte tus experiencias gastronómicas conmigo! 🍽️',
                      });
                    } finally {
                      setInviting(false);
                    }
                  }}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#546b00" />
                  ) : (
                    <MaterialIcons name="person-add" size={16} color="#546b00" />
                  )}
                  <Text style={styles.inviteBtnText}>{inviting ? 'Generando...' : 'Invitar Amigos'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Descubre usuarios (sugeridos) */}
            {!isLoading && suggestedUsers && suggestedUsers.length > 0 && (
              <View style={[styles.section, { marginTop: 8 }]}>
                <SectionLabel text="DESCUBRE USUARIOS" />
                <View style={{ gap: 10 }}>
                  {(suggestedUsers as any[]).slice(0, 6).map((user: any) => (
                    <SearchResultCard key={user.id} user={user} currentUserId={currentUser?.id ?? ''} />
                  ))}
                </View>
              </View>
            )}

            {/* Siguiendo (one-way) */}
            {!isLoading && displayFollowing.length > 0 && (
              <View style={[styles.section, { marginTop: 8 }]}>
                <SectionLabel text="SIGUIENDO" count={displayFollowing.length} />
                <View style={{ gap: 20 }}>
                  {displayFollowing.map((friend) => (
                    <FriendCard key={friend.id} friend={friend} isMutual={false} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Sort modal */}
      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity style={styles.sortBackdrop} activeOpacity={1} onPress={() => setSortOpen(false)} />
        <View style={styles.sortSheet}>
          <View style={styles.sortHandle} />
          <Text style={styles.sortSheetTitle}>Ordenar por</Text>
          {SORT_OPTIONS.map((opt) => {
            const active = activeSort === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.sortOption, active && styles.sortOptionActive]}
                onPress={() => { setActiveSort(opt); setSortOpen(false); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{opt}</Text>
                {active && <MaterialIcons name="check" size={20} color="#546b00" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
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
    backgroundColor: 'rgba(253,249,242,0.92)',
    height: Platform.OS === 'ios' ? 108 : 88,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
  },
  headerRight: { width: 48, alignItems: 'flex-end' },
  container: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingBottom: 110,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#e6e2db',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#1c1c18',
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionBadge: {
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#546b00',
  },
  // Empty states
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptySearchText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#424844',
    textAlign: 'center',
  },
  emptySearchHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    textAlign: 'center',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: '#f7f3ec',
    borderRadius: 20,
  },
  emptySectionTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
    textAlign: 'center',
  },
  emptySectionText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#032417',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    marginTop: 4,
  },
  emptyCtaBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  // Search result card
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  searchName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  searchHandle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
    marginTop: 2,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#032417',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    justifyContent: 'center',
  },
  followBtnConnected: {
    backgroundColor: '#c7ef48',
  },
  followBtnMutual: {
    backgroundColor: '#c7ef48',
  },
  followBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  followBtnTextConnected: {
    color: '#546b00',
  },
  // Follow request card
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#c7ef48',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#c7ef48',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  acceptBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#546b00',
  },
  // Sort
  sortTriggerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f7f3ec',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortTriggerSmallText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#032417',
  },
  sortBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,36,23,0.3)',
  },
  sortSheet: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 12,
  },
  sortHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c1c8c2',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sortSheetTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#f7f3ec',
    marginBottom: 8,
  },
  sortOptionActive: { backgroundColor: '#c7ef48' },
  sortOptionText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#424844',
  },
  sortOptionTextActive: { color: '#546b00' },
  // Friend card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  affinityBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  affinityBadgeHigh: { backgroundColor: '#c7ef48' },
  affinityBadgeLow: { backgroundColor: '#e6e2db' },
  affinityBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#546b00',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  friendName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#032417',
  },
  friendSpecialty: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: '#727973',
    marginTop: 2,
  },
  friendCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  friendCityText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#727973',
  },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCell: {
    flex: 1,
    backgroundColor: '#f7f3ec',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statCellHighlight: { backgroundColor: '#f0fad8' },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: '#032417',
  },
  // Invite banner
  inviteBanner: {
    backgroundColor: '#1a3a2b',
    borderRadius: 24,
    padding: 24,
    marginTop: 32,
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(199,239,72,0.08)',
  },
  bannerTitle: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 22,
    color: '#ffffff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: 20,
  },
  bannerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#c7ef48',
    borderRadius: 12,
    paddingVertical: 13,
  },
  inviteBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#546b00',
  },
  importBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 13,
  },
  importBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#032417',
  },
});
