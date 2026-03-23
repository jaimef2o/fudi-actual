import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { pickImage, compressAndUpload } from '../../lib/storage';
import {
  validateHandleFormat,
  isHandleAvailable,
} from '../../lib/api/users';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged';

export default function EditProfileScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [originalHandle, setOriginalHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null); // local URI before upload

  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load current profile data
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('users')
      .select('name, handle, bio, avatar_url')
      .eq('id', currentUser.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName((data as any).name ?? '');
          setHandle((data as any).handle ?? '');
          setOriginalHandle((data as any).handle ?? '');
          setBio((data as any).bio ?? '');
          setAvatarUri((data as any).avatar_url ?? null);
        }
        setLoadingProfile(false);
      });
  }, [currentUser?.id]);

  // Validate + check availability on handle change
  useEffect(() => {
    if (!handle) { setHandleStatus('idle'); setHandleError(null); return; }

    // Same as original → no need to check
    if (handle === originalHandle) {
      setHandleStatus('unchanged');
      setHandleError(null);
      return;
    }

    const formatError = validateHandleFormat(handle);
    if (formatError) {
      setHandleStatus('invalid');
      setHandleError(formatError);
      return;
    }

    setHandleStatus('checking');
    setHandleError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await isHandleAvailable(handle);
      setHandleStatus(available ? 'available' : 'taken');
      setHandleError(available ? null : 'Este handle ya está en uso.');
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [handle, originalHandle]);

  const handleOk = handleStatus === 'available' || handleStatus === 'unchanged';
  const canSave =
    name.trim().length >= 2 &&
    handle.length >= 3 &&
    handleOk &&
    !saving;

  async function pickAvatar() {
    const uri = await pickImage({ aspect: [1, 1], allowsEditing: true });
    if (uri) setNewAvatarUri(uri);
  }

  async function handleSave() {
    if (!canSave || !currentUser?.id) return;
    setSaving(true);

    try {
      let avatarUrl: string | undefined;

      // Upload new avatar if changed
      if (newAvatarUri) {
        avatarUrl = await compressAndUpload(
          newAvatarUri,
          `avatars/${currentUser.id}/avatar_${Date.now()}.jpg`,
        );
      }

      const updates: Record<string, string> = {
        name: name.trim(),
        handle: handle.trim(),
        bio: bio.trim(),
      };
      if (avatarUrl) updates.avatar_url = avatarUrl;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('users') as any)
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update global store
      setCurrentUser({
        id: currentUser.id,
        name: name.trim(),
        avatar: avatarUrl ?? currentUser.avatar,
      });

      // Invalidate TanStack Query cache so profile screen shows updated data immediately
      queryClient.invalidateQueries({ queryKey: ['profile', currentUser.id] });

      Alert.alert('¡Perfil actualizado!', 'Tus cambios se han guardado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      if (e?.code === '23505') {
        setHandleStatus('taken');
        setHandleError('Este handle ya está en uso.');
      } else {
        Alert.alert('Error al guardar', e?.message ?? 'Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fdf9f2', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#032417" />
      </View>
    );
  }

  const displayAvatar = newAvatarUri ?? avatarUri;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="close" size={24} color="#032417" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#032417" />
          ) : (
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>
              Guardar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarWrapper}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={36} color="#727973" />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <MaterialIcons name="photo-camera" size={20} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar la foto</Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>NOMBRE</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre visible"
            placeholderTextColor="#c1c8c2"
            maxLength={40}
          />
        </View>

        {/* Handle */}
        <View style={styles.field}>
          <Text style={styles.label}>HANDLE</Text>
          <View style={styles.handleRow}>
            <View style={styles.atPrefix}>
              <Text style={styles.atText}>@</Text>
            </View>
            <TextInput
              style={styles.handleInput}
              value={handle}
              onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
              placeholder="tu_handle"
              placeholderTextColor="#c1c8c2"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {handleStatus === 'checking' && (
              <ActivityIndicator size="small" color="#727973" style={{ paddingHorizontal: 14 }} />
            )}
            {(handleStatus === 'available' || handleStatus === 'unchanged') && (
              <Text style={[styles.indicator, styles.indicatorOk]}>✓</Text>
            )}
            {(handleStatus === 'taken' || handleStatus === 'invalid') && (
              <Text style={[styles.indicator, styles.indicatorError]}>✗</Text>
            )}
          </View>
          {handleError ? (
            <Text style={styles.fieldError}>{handleError}</Text>
          ) : handleStatus === 'available' ? (
            <Text style={styles.fieldOk}>@{handle} está disponible</Text>
          ) : (
            <Text style={styles.fieldHint}>Solo letras minúsculas, números y _ · 3–20 caracteres</Text>
          )}
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <Text style={styles.label}>BIO</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Cuéntanos algo sobre tus gustos gastronómicos..."
            placeholderTextColor="#c1c8c2"
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, bio.length >= 180 && styles.charCountWarn, bio.length >= 200 && styles.charCountMax]}>
            {bio.length}/200
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
    backgroundColor: '#fdf9f2',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,194,0.2)',
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: '#032417',
  },
  saveBtn: {
    backgroundColor: '#c7ef48',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  saveBtnDisabled: {
    backgroundColor: '#e6e2db',
  },
  saveBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
  },
  saveBtnTextDisabled: {
    color: '#c1c8c2',
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#c7ef48',
  },
  avatarPlaceholder: {
    backgroundColor: '#e6e2db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#032417',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fdf9f2',
  },
  avatarHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#727973',
  },
  field: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: '#1c1c18',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 16,
  },
  charCount: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#c1c8c2',
    textAlign: 'right',
  },
  charCountWarn: {
    color: '#f59e0b',
  },
  charCountMax: {
    color: '#ba1a1a',
    fontFamily: 'Manrope-Bold',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    overflow: 'hidden',
  },
  atPrefix: {
    paddingLeft: 18,
    paddingRight: 4,
    justifyContent: 'center',
  },
  atText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#727973',
  },
  handleInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 16,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: '#1c1c18',
  },
  indicator: {
    paddingHorizontal: 14,
    fontSize: 18,
  },
  indicatorOk: {
    color: '#516600',
    fontWeight: 'bold',
  },
  indicatorError: {
    color: '#ba1a1a',
    fontWeight: 'bold',
  },
  fieldHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#c1c8c2',
  },
  fieldOk: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#516600',
  },
  fieldError: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#ba1a1a',
  },
});
