import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAppStore } from '../store';
import { importContacts, ContactMatch } from '../lib/contacts';
import { useFollowUser } from '../lib/hooks/useProfile';

export default function ContactsImportScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const { mutateAsync: follow } = useFollowUser(currentUser?.id ?? '');

  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ContactMatch[] | null>(null);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const results = await importContacts();
      // Filter out self
      const filtered = results.filter((m) => m.user.id !== currentUser?.id);
      setMatches(filtered);
    } catch (e: any) {
      if (e?.message === 'PERMISSION_DENIED') {
        setError('Necesitamos acceso a tus contactos para encontrar amigos en savry.');
      } else {
        setError('Error al importar contactos. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow(userId: string) {
    try {
      await follow(userId);
      setFollowedIds((prev) => new Set(prev).add(userId));
    } catch {}
  }

  async function handleFollowAll() {
    if (!matches) return;
    const toFollow = matches.filter((m) => !followedIds.has(m.user.id));
    for (const m of toFollow) {
      try {
        await follow(m.user.id);
        setFollowedIds((prev) => new Set(prev).add(m.user.id));
      } catch {}
    }
    showToast(`¡Siguiendo a ${toFollow.length} amigos!`);
  }

  function handleDone() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/amigos');
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDone} style={styles.headerBtn}>
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Importar Contactos</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pre-import state */}
        {matches === null && !loading && (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="contacts" size={40} color="#032417" />
            </View>
            <Text style={styles.emptyTitle}>Encuentra amigos en savry</Text>
            <Text style={styles.emptySubtitle}>
              Veremos quién de tus contactos ya usa savry para que puedas seguirles al instante.
              {'\n\n'}Tus contactos se procesan de forma segura — solo comparamos hashes, nunca enviamos números reales.
            </Text>
            <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
              <MaterialIcons name="import-contacts" size={20} color="#ffffff" />
              <Text style={styles.importBtnText}>Buscar amigos en mis contactos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#032417" />
            <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Buscando amigos...</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="error-outline" size={48} color="#ba1a1a" />
            <Text style={[styles.emptySubtitle, { color: '#ba1a1a', marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
              <Text style={styles.importBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results: no matches */}
        {matches !== null && matches.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="person-search" size={40} color="#032417" />
            </View>
            <Text style={styles.emptyTitle}>Aún no hay amigos en savry</Text>
            <Text style={styles.emptySubtitle}>
              Ninguno de tus contactos tiene cuenta todavía. ¡Invítalos!
            </Text>
            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: '#c7ef48' }]}
              onPress={handleDone}
            >
              <Text style={[styles.importBtnText, { color: '#032417' }]}>Volver e invitar amigos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results: matches found */}
        {matches !== null && matches.length > 0 && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {matches.length} {matches.length === 1 ? 'amigo encontrado' : 'amigos encontrados'}
              </Text>
              {matches.length > 1 && (
                <TouchableOpacity style={styles.followAllBtn} onPress={handleFollowAll}>
                  <Text style={styles.followAllText}>Seguir a todos</Text>
                </TouchableOpacity>
              )}
            </View>

            {matches.map((match) => {
              const isFollowed = followedIds.has(match.user.id);
              return (
                <View key={match.user.id} style={styles.matchCard}>
                  <Image
                    source={
                      match.user.avatar_url
                        ? { uri: match.user.avatar_url }
                        : require('../assets/icon.png')
                    }
                    style={styles.avatar}
                  />
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchName}>{match.user.name}</Text>
                    {match.user.handle && (
                      <Text style={styles.matchHandle}>@{match.user.handle}</Text>
                    )}
                    <Text style={styles.contactLabel}>
                      {match.contactName !== match.user.name
                        ? `En tus contactos como "${match.contactName}"`
                        : 'En tus contactos'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={isFollowed ? styles.followedBtn : styles.followBtn}
                    onPress={() => !isFollowed && handleFollow(match.user.id)}
                    disabled={isFollowed}
                  >
                    <Text style={isFollowed ? styles.followedBtnText : styles.followBtnText}>
                      {isFollowed ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf9f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    backgroundColor: 'rgba(253,249,242,0.9)',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: '#032417',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 22,
    color: '#032417',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#032417',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    marginTop: 16,
  },
  importBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultsTitle: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 18,
    color: '#032417',
  },
  followAllBtn: {
    backgroundColor: '#c7ef48',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  followAllText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#546b00',
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6e2db',
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#032417',
  },
  matchHandle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
  },
  contactLabel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#aeb5af',
  },
  followBtn: {
    backgroundColor: '#032417',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  followBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  followedBtn: {
    backgroundColor: '#f7f3ec',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  followedBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#727973',
  },
  doneBtn: {
    backgroundColor: '#032417',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 20,
  },
  doneBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
});
