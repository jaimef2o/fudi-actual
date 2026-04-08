import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { pickImage, compressAndUpload } from '../../lib/storage';
import { CityPicker } from '../../components/CityPicker';

export default function ProfileSetupScreen() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  async function handlePickAvatar() {
    const uri = await pickImage({ aspect: [1, 1], allowsEditing: true });
    if (uri) setAvatarUri(uri);
  }

  async function handleContinue() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    try {
      const updates: Record<string, string> = {};

      if (bio.trim()) updates.bio = bio.trim();
      if (city.trim()) updates.city = city.trim();

      if (avatarUri) {
        const url = await compressAndUpload(
          avatarUri,
          `avatars/${user.id}/avatar_${Date.now()}.jpg`,
        );
        if (url) updates.avatar_url = url;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', user.id);
      }
    } catch {
      // Non-critical — continue anyway
    }

    setSaving(false);
    router.replace('/auth/preferences');
  }

  function handleSkip() {
    router.replace('/auth/preferences');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>savry</Text>
          <Text style={styles.title}>Personaliza tu perfil</Text>
          <Text style={styles.subtitle}>
            Añade una foto y cuéntanos un poco sobre ti. Todo es opcional — puedes hacerlo después.
          </Text>

          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="add-a-photo" size={32} color="#727973" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <MaterialIcons name="edit" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para añadir foto</Text>

          {/* City */}
          <Text style={styles.label}>CIUDAD</Text>
          <CityPicker value={city} onChange={setCity} />

          {/* Bio */}
          <Text style={[styles.label, { marginTop: 8 }]}>BIO</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Ej: Amante de la cocina japonesa y los vinos naturales"
            placeholderTextColor="#c1c8c2"
            value={bio}
            onChangeText={setBio}
            maxLength={150}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/150</Text>

          {/* Continue */}
          <TouchableOpacity
            style={styles.btn}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnText}>Continuar →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Saltar por ahora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  content: { gap: 12 },
  logo: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 36,
    color: '#032417',
    marginBottom: 8,
    letterSpacing: -1,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 28,
    color: '#032417',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
    marginBottom: 8,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 0,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f7f3ec',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e6e2db',
    borderStyle: 'dashed',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#032417',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fdf9f2',
  },
  avatarHint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#c1c8c2',
    textAlign: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bioInput: {
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: '#1c1c18',
    minHeight: 90,
  },
  charCount: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#c1c8c2',
    textAlign: 'right',
    marginTop: -6,
  },
  btn: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#727973',
  },
});
