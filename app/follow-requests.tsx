import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { useFollowRequests, useFollowUser, useRejectFollowRequest } from '../lib/hooks/useProfile';
import { respondToFollowRequest, type FollowRequest } from '../lib/api/users';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function FollowRequestsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: requests = [], isLoading } = useFollowRequests(currentUser?.id);
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: (requesterId: string) =>
      respondToFollowRequest(currentUser!.id, requesterId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['followerCount'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const { mutateAsync: reject } = useRejectFollowRequest(currentUser?.id ?? '');

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#032417" style={{ marginTop: 60 }} />
        ) : requests.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="person-add" size={48} color="#e6e2db" />
            <Text style={styles.emptyTitle}>Sin solicitudes</Text>
            <Text style={styles.emptyText}>
              Cuando alguien quiera seguirte, aparecerá aquí.
            </Text>
          </View>
        ) : (
          requests.map((req: FollowRequest) => {
            const user = req.requester;
            const isAccepting = acceptMutation.isPending && acceptMutation.variables === req.user_id;
            return (
              <View key={req.user_id} style={styles.card}>
                <TouchableOpacity
                  style={styles.userRow}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/profile/${req.user_id}`)}
                >
                  {user?.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <MaterialIcons name="person" size={20} color="#727973" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{user?.name ?? 'Usuario'}</Text>
                    {user?.handle ? (
                      <Text style={styles.userHandle}>@{user.handle}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => acceptMutation.mutate(req.user_id)}
                    disabled={isAccepting}
                    activeOpacity={0.8}
                  >
                    {isAccepting ? (
                      <ActivityIndicator size="small" color="#546b00" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Aceptar</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => reject(req.user_id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

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
    backgroundColor: 'rgba(253,249,242,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 124 : 104,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Request card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  userHandle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#c7ef48',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#546b00',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#f1ede6',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#727973',
  },
});
