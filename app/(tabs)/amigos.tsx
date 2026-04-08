import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  Share,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../../lib/utils/alerts';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { COLORS } from '../../lib/theme/colors';
import {
  useFriends,
  useFollowing,
  useFollowRequests,
  useNewFollowers,
  useSearchUsers,
  useFollowUser,
  useUnfollowUser,
  useRelationship,
  useSuggestedUsers,
  useRejectFollowRequest,
} from '../../lib/hooks/useProfile';
import { supabase } from '../../lib/supabase';
import { createInvitation } from '../../lib/api/users';
import { StaggerItem } from '../../components/Animations';
import Avatar from '../../components/Avatar';
import UserCard from '../../components/cards/UserCard';

const SORT_OPTIONS = ['Mayor afinidad', 'Más activos', 'Recientes'] as const;
type SortOption = typeof SORT_OPTIONS[number];

// ─── Search result wrapper (hooks live here, UserCard renders) ───────────────

function SearchResultCardWrapper({ user, currentUserId }: { user: { id: string; name: string; handle?: string | null; avatar_url?: string | null; city?: string | null }; currentUserId: string }) {
  const { data: rel, isLoading: loadingRel } = useRelationship(currentUserId, user.id);
  const { mutateAsync: follow, isPending: following } = useFollowUser(currentUserId);
  const { mutateAsync: unfollow, isPending: unfollowing } = useUnfollowUser(currentUserId);

  const relStatus = (rel as string) ?? 'none';
  const relStyle = relStatus === 'mutual' ? 'mutual' as const
    : relStatus === 'pending' ? 'pending' as const
    : relStatus === 'following' ? 'following' as const
    : 'follow' as const;
  const isConnected = relStatus !== 'none';

  async function handlePress() {
    try {
      if (isConnected) {
        const isPending = relStatus === 'pending';
        showAlert(
          isPending ? 'Cancelar solicitud' : 'Dejar de seguir',
          isPending
            ? `¿Cancelar la solicitud a ${user.name}?`
            : `¿Dejar de seguir a ${user.name}?`,
          [
            { text: 'Volver', style: 'cancel' },
            {
              text: isPending ? 'Cancelar solicitud' : 'Dejar de seguir',
              style: 'destructive',
              onPress: async () => {
                try { await unfollow(user.id); } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'No se pudo completar la acción.';
                  showAlert('Error', msg);
                }
              },
            },
          ]
        );
      } else {
        await follow(user.id);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo completar la acción.';
      showAlert('Error', msg);
    }
  }

  return (
    <UserCard
      user={user}
      variant="search"
      relationshipStyle={relStyle}
      primaryLoading={following || unfollowing || loadingRel}
      onPrimaryAction={handlePress}
    />
  );
}

// ─── Follow request wrapper ──────────────────────────────────────────────────

function FollowRequestCardWrapper({ requester, currentUserId }: { requester: { id: string; name: string; handle?: string | null; avatar_url?: string | null; city?: string | null }; currentUserId: string }) {
  const { mutateAsync: follow, isPending: accepting } = useFollowUser(currentUserId);
  const { mutateAsync: reject, isPending: rejecting } = useRejectFollowRequest(currentUserId);

  return (
    <UserCard
      user={requester}
      variant="follow-request"
      primaryLoading={accepting}
      secondaryLoading={rejecting}
      onPrimaryAction={async () => {
        try { await follow(requester.id); } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'No se pudo aceptar la solicitud.';
          showAlert('Error', msg);
        }
      }}
      onSecondaryAction={async () => {
        try { await reject(requester.id); } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'No se pudo rechazar la solicitud.';
          showAlert('Error', msg);
        }
      }}
    />
  );
}

// ─── New follower wrapper ────────────────────────────────────────────────────

function NewFollowerCardWrapper({ follower, currentUserId }: { follower: { id: string; name: string; handle?: string | null; avatar_url?: string | null; city?: string | null }; currentUserId: string }) {
  const { mutateAsync: follow, isPending } = useFollowUser(currentUserId);

  return (
    <UserCard
      user={follower}
      variant="new-follower"
      primaryLoading={isPending}
      onPrimaryAction={async () => {
        try { await follow(follower.id); } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'No se pudo seguir al usuario.';
          showAlert('Error', msg);
        }
      }}
    />
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
        {isMutual && friend.affinity > 0 && (
          <View style={[styles.affinityBadge, friend.isHighAffinity ? styles.affinityBadgeHigh : styles.affinityBadgeLow]}>
            <Text style={[styles.affinityBadgeText, !friend.isHighAffinity && { color: COLORS.outline }]}>{friend.affinity}%</Text>
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
                <MaterialIcons name="location-on" size={11} color={COLORS.outline} />
                <Text style={styles.friendCityText}>{friend.home_city}</Text>
              </View>
            ) : null}
          </View>
          <MaterialIcons name="chevron-right" size={20} color="rgba(114,121,115,0.4)" />
        </View>

        {/* Stats */}
        {friend.visits === 0 ? (
          <View style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 12, color: COLORS.outline, fontStyle: 'italic' }}>
              {friend.name} aún no ha compartido visitas
            </Text>
          </View>
        ) : (
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
        )}
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
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const currentUser = useAppStore((s) => s.currentUser);

  const { data: realFriends, isLoading: loadingFriends, refetch: refetchFriends } = useFriends(currentUser?.id);
  const { data: followingList, isLoading: loadingFollowing, refetch: refetchFollowing } = useFollowing(currentUser?.id);
  const { data: followRequests, isLoading: loadingRequests, refetch: refetchRequests } = useFollowRequests(currentUser?.id);
  const { data: newFollowersData, refetch: refetchNewFollowers } = useNewFollowers(currentUser?.id);
  const { data: suggestedUsers, refetch: refetchSuggested } = useSuggestedUsers(currentUser?.id);
  const { data: searchResults, isFetching: searching } = useSearchUsers(searchQuery);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchFriends(),
        refetchFollowing(),
        refetchRequests(),
        refetchNewFollowers(),
        refetchSuggested(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const isSearching = searchQuery.trim().length >= 2;

  // Map mutual friends
  const displayFriends: any[] = (realFriends ?? []).map((r: any) => ({
    id: r.friend?.id ?? r.target_id,
    name: r.friend?.name ?? 'Amigo',
    handle: r.friend?.handle ?? null,
    home_city: r.friend?.city ?? '',
    affinity: Math.round(r.affinity_score ?? 0),
    visits: r.visit_count ?? 0,
    average: r.avg_score ? Number(r.avg_score.toFixed(1)) : 0,
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
  const newFollowersList: any[] = (newFollowersData ?? []).map((r: any) => r.requester).filter(Boolean);

  const isLoading = loadingFriends || loadingFollowing || loadingRequests;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 48 }} />
        <Text style={styles.headerTitle}>Amigos</Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => router.push(`/profile/${currentUser?.id}`)}
          onLongPress={() => {
            showAlert('Cuenta', '', [
              { text: 'Ver perfil', onPress: () => router.push(`/profile/${currentUser?.id}`) },
              { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
              { text: 'Cancelar', style: 'cancel' },
            ]);
          }}
          activeOpacity={0.8}
        >
          <Avatar uri={currentUser?.avatar} size={32} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={COLORS.outline} />
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
              <MaterialIcons name="close" size={18} color={COLORS.outline} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── SEARCH MODE ─────────────────────────────────────────────────── */}
        {isSearching && (
          <View style={{ marginBottom: 24 }}>
            <SectionLabel text="RESULTADOS" />
            {searching ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />
            ) : searchResults && (searchResults as any[]).filter((u: any) => u.id !== currentUser?.id).length > 0 ? (
              <View style={{ gap: 10 }}>
                {(searchResults as any[])
                  .filter((u: any) => u.id !== currentUser?.id)
                  .map((user: any) => (
                    <SearchResultCardWrapper key={user.id} user={user} currentUserId={currentUser?.id ?? ''} />
                  ))}
              </View>
            ) : (
              <View style={styles.emptySearch}>
                <MaterialIcons name="person-search" size={36} color={COLORS.outlineVariant} />
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
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 32 }} />
            )}

            {/* Solicitudes pendientes */}
            {!isLoading && pendingRequests.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text="SOLICITUDES" count={pendingRequests.length} />
                <View style={{ gap: 10 }}>
                  {pendingRequests.map((req: any) => (
                    <FollowRequestCardWrapper key={req.id} requester={req} currentUserId={currentUser?.id ?? ''} />
                  ))}
                </View>
              </View>
            )}

            {/* Nuevos seguidores (public users who followed you) */}
            {!isLoading && newFollowersList.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text="NUEVOS SEGUIDORES" count={newFollowersList.length} />
                <View style={{ gap: 10 }}>
                  {newFollowersList.map((follower: any) => (
                    <NewFollowerCardWrapper key={follower.id} follower={follower} currentUserId={currentUser?.id ?? ''} />
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
                      <MaterialIcons name="expand-more" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {sortedFriends.length === 0 ? (
                  <View style={styles.emptySection}>
                    <MaterialIcons name="group-add" size={40} color={COLORS.outlineVariant} />
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
                      <MaterialIcons name="search" size={15} color={COLORS.onPrimary} />
                      <Text style={styles.emptyCtaBtnText}>Buscar personas</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 20 }}>
                    {sortedFriends.map((friend, idx) => (
                      <StaggerItem key={friend.id} index={idx} staggerMs={60}>
                        <FriendCard friend={friend} isMutual />
                      </StaggerItem>
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
                      const link = `https://savry.app/invite/${inv.token}`;
                      await Share.share({
                        message: `${u.name ?? 'Alguien'} te invita a savry — el círculo gastronómico privado. Únete aquí: ${link}`,
                        url: link,
                      });
                    } catch {
                      await Share.share({
                        message: 'Únete a savry — el círculo gastronómico privado de tus amigos.',
                      });
                    } finally {
                      setInviting(false);
                    }
                  }}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color={COLORS.onSecondaryContainer} />
                  ) : (
                    <MaterialIcons name="person-add" size={16} color={COLORS.onSecondaryContainer} />
                  )}
                  <Text style={styles.inviteBtnText}>{inviting ? 'Generando...' : 'Invitar Amigos'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactsBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push('/contacts-import')}
                >
                  <MaterialIcons name="import-contacts" size={16} color={COLORS.primary} />
                  <Text style={styles.contactsBtnText}>Importar Contactos</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Descubre usuarios (sugeridos) */}
            {!isLoading && suggestedUsers && suggestedUsers.length > 0 && (
              <View style={[styles.section, { marginTop: 8 }]}>
                <SectionLabel text="DESCUBRE USUARIOS" />
                <View style={{ gap: 10 }}>
                  {(suggestedUsers as any[]).slice(0, 6).map((user: any) => (
                    <SearchResultCardWrapper key={user.id} user={user} currentUserId={currentUser?.id ?? ''} />
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
                {active && <MaterialIcons name="check" size={20} color={COLORS.onSecondaryContainer} />}
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
    color: COLORS.primary,
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
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.onSurface,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionBadge: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
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
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  emptySearchHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: COLORS.outline,
    textAlign: 'center',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 20,
  },
  emptySectionTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: COLORS.primary,
    textAlign: 'center',
  },
  emptySectionText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    marginTop: 4,
  },
  emptyCtaBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.onPrimary,
  },
  // Sort
  sortTriggerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortTriggerSmallText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: COLORS.primary,
  },
  sortBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,36,23,0.3)',
  },
  sortSheet: {
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sortSheetTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: COLORS.primary,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: 8,
  },
  sortOptionActive: { backgroundColor: COLORS.secondaryContainer },
  sortOptionText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
  },
  sortOptionTextActive: { color: COLORS.onSecondaryContainer },
  // Friend card
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
    shadowColor: COLORS.onSurface,
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
    borderColor: COLORS.surfaceContainerLowest,
  },
  affinityBadgeHigh: { backgroundColor: COLORS.secondaryContainer },
  affinityBadgeLow: { backgroundColor: COLORS.surfaceContainerHighest },
  affinityBadgeText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
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
    color: COLORS.primary,
  },
  friendSpecialty: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: COLORS.outline,
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
    color: COLORS.outline,
  },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCell: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statCellHighlight: { backgroundColor: COLORS.surfaceContainerLow },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 16,
    color: COLORS.primary,
  },
  // Invite banner
  inviteBanner: {
    backgroundColor: COLORS.primaryContainer,
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
    color: COLORS.onPrimary,
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
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 12,
    paddingVertical: 13,
  },
  inviteBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.onSecondaryContainer,
  },
  contactsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    paddingVertical: 13,
  },
  contactsBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.primary,
  },
  importBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    paddingVertical: 13,
  },
  importBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: COLORS.primary,
  },
});
