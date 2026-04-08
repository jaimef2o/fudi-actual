import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getInvitation, claimInvitation, type InvitationRow } from '../../lib/api/users';
import { useAppStore } from '../../store';
import { showAlert } from '../../lib/utils/alerts';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const setPendingInviteToken = useAppStore((s) => s.setPendingInviteToken);

  const [invitation, setInvitation] = useState<InvitationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    getInvitation(token)
      .then((inv) => {
        if (!inv) setNotFound(true);
        else setInvitation(inv);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!invitation?.token) return;
    setClaiming(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Already logged in — claim directly
      const result = await claimInvitation(invitation.token, user.id);
      setClaiming(false);
      if (result === 'ok') {
        router.replace('/(tabs)/feed');
      } else if (result === 'already_claimed') {
        showAlert(
          'Invitación ya usada',
          'Esta invitación ya fue reclamada por otra persona.',
          [{ text: 'Ir a savry', onPress: () => router.replace('/(tabs)/feed') }]
        );
      } else {
        showAlert('Error', 'No se pudo procesar la invitación. Inténtalo de nuevo.');
      }
    } else {
      // Not logged in — save token and go to auth
      // The token will be claimed in verify.tsx after successful login
      setPendingInviteToken(invitation.token);
      setClaiming(false);
      router.replace('/auth');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#032417" />
      </View>
    );
  }

  if (notFound || !invitation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Invitación no válida</Text>
        <Text style={styles.subtitle}>Este enlace ya ha sido usado o ha expirado.</Text>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace('/auth')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Ir a savry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inviterName = invitation.inviter?.name ?? 'Alguien';
  const inviterAvatar = invitation.inviter?.avatar_url;
  const alreadyClaimed = !!invitation.claimed_by_user_id;

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.logoText}>savry</Text>
      </View>

      <View style={styles.card}>
        {inviterAvatar ? (
          <Image source={{ uri: inviterAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {inviterName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.headline}>
          <Text style={styles.inviterName}>{inviterName}</Text>
          {' '}te invita a savry
        </Text>
        <Text style={styles.description}>
          El círculo gastronómico privado donde descubres dónde comen tus amigos y construyes tu propio ranking de restaurantes.
        </Text>

        {alreadyClaimed ? (
          <>
            <View style={styles.claimedBadge}>
              <Text style={styles.claimedText}>Esta invitación ya fue usada</Text>
            </View>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.replace('/auth')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Ir a savry →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleAccept}
            activeOpacity={0.85}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnPrimaryText}>Unirme a savry →</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => {
            // If they already have an account, still store the token
            // so it gets claimed on next login
            if (!alreadyClaimed && invitation.token) {
              setPendingInviteToken(invitation.token);
            }
            router.replace('/auth');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.btnSecondaryText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#032417' },
  centered: {
    flex: 1,
    backgroundColor: '#fdf9f2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 32,
  },
  logoText: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 52,
    color: '#c7ef48',
    letterSpacing: -1,
  },
  card: {
    backgroundColor: '#fdf9f2',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    gap: 16,
    alignItems: 'center',
    paddingBottom: 48,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#c7ef48',
    marginTop: -52,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#1a3a2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 28,
    color: '#c7ef48',
  },
  headline: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 22,
    color: '#032417',
    textAlign: 'center',
    lineHeight: 30,
  },
  inviterName: { fontFamily: 'NotoSerif-Bold' },
  description: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  btnPrimary: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  btnPrimaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  btnSecondary: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnSecondaryText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#727973',
    textDecorationLine: 'underline',
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 24,
    color: '#032417',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    textAlign: 'center',
  },
  claimedBadge: {
    backgroundColor: '#f7f3ec',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  claimedText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#727973',
  },
});
