import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { useFollowRequests, useFollowUser, useRejectFollowRequest } from '../lib/hooks/useProfile';
import type { FollowRequest } from '../lib/api/users';
import { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';

export default function NotificationsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const { data: followRequests = [] } = useFollowRequests(currentUser?.id);
  const { mutateAsync: follow } = useFollowUser(currentUser?.id ?? '');
  const { mutateAsync: reject } = useRejectFollowRequest(currentUser?.id ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAccept(requesterId: string) {
    setBusyId(requesterId);
    try { await follow(requesterId); } catch {}
    finally { setBusyId(null); }
  }

  async function handleReject(requesterId: string) {
    setBusyId(requesterId);
    try { await reject(requesterId); } catch {}
    finally { setBusyId(null); }
  }

  const requests = followRequests.map((r: FollowRequest) => r.requester).filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf9f2' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notificaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Follow requests */}
        {requests.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Solicitudes de amistad</Text>
            {requests.map((user) => (
              <View key={user.id} style={s.requestCard}>
                {user.avatar_url ? (
                  <ExpoImage source={{ uri: user.avatar_url }} style={s.avatar} contentFit="cover" />
                ) : (
                  <View style={[s.avatar, s.avatarPlaceholder]}>
                    <MaterialIcons name="person" size={20} color="#727973" />
                  </View>
                )}
                <View style={s.requestInfo}>
                  <Text style={s.requestName}>{user.name ?? 'Usuario'}</Text>
                  {user.handle && <Text style={s.requestHandle}>@{user.handle}</Text>}
                </View>
                <View style={s.requestActions}>
                  <TouchableOpacity
                    style={s.acceptBtn}
                    onPress={() => handleAccept(user.id)}
                    disabled={busyId === user.id}
                  >
                    <Text style={s.acceptBtnText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleReject(user.id)}
                    disabled={busyId === user.id}
                  >
                    <MaterialIcons name="close" size={18} color="#727973" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {requests.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <MaterialIcons name="notifications-none" size={48} color="#c1c8c2" />
            </View>
            <Text style={s.emptyTitle}>Sin notificaciones</Text>
            <Text style={s.emptyText}>
              Cuando tus amigos registren visitas o te envíen solicitudes, aparecerán aquí.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(253,249,242,0.90)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.15)',
  },
  headerBtn: { padding: 8, borderRadius: 999 },
  headerTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#727973',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#1c1c18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: { flex: 1, minWidth: 0 },
  requestName: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#032417' },
  requestHandle: { fontFamily: 'Manrope-Regular', fontSize: 12, color: '#727973', marginTop: 1 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acceptBtn: {
    backgroundColor: '#c7ef48',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  acceptBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13, color: '#032417' },
  rejectBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#f7f3ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f7f3ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 20,
    color: '#032417',
  },
  emptyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 22,
  },
});
