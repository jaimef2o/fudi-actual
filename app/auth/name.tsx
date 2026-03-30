import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { showAlert } from '../../lib/utils/alerts';
import { useState, useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import {
  nameToHandle,
  validateHandleFormat,
  isHandleAvailable,
} from '../../lib/api/users';

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function NameScreen() {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-suggest handle from name (only while user hasn't typed their own)
  const userEditedHandle = useRef(false);
  useEffect(() => {
    if (!userEditedHandle.current && name.trim().length >= 2) {
      setHandle(nameToHandle(name.trim()));
    }
  }, [name]);

  // Validate + check availability whenever handle changes
  useEffect(() => {
    if (!handle) { setHandleStatus('idle'); setHandleError(null); return; }

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
  }, [handle]);

  const canSubmit =
    name.trim().length >= 2 &&
    handle.length >= 3 &&
    handleStatus === 'available' &&
    !loading;

  async function handleSave() {
    if (!canSubmit) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // upsert so new users (no row yet) get their row created,
    // and existing users get their name/handle updated.
    const { error } = await (supabase.from('users') as any)
      .upsert({ id: user.id, name: name.trim(), handle: handle.trim() })
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      if (error.code === '23505') {
        // Race condition — handle taken just now
        setHandleStatus('taken');
        setHandleError('Este handle ya está en uso.');
      } else {
        showAlert('Error', error.message);
      }
      return;
    }
    router.replace('/auth/preferences');
  }

  // Status indicator next to handle input
  function HandleIndicator() {
    if (handleStatus === 'checking') {
      return <ActivityIndicator size="small" color="#727973" style={styles.indicator} />;
    }
    if (handleStatus === 'available') {
      return <MaterialIcons name="check-circle" size={20} color="#516600" style={styles.indicator} />;
    }
    if (handleStatus === 'taken' || handleStatus === 'invalid') {
      return <MaterialIcons name="cancel" size={20} color="#ba1a1a" style={styles.indicator} />;
    }
    return null;
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
          <Text style={styles.logo}>fudi</Text>
          <Text style={styles.title}>¿Cómo te llamamos?</Text>
          <Text style={styles.subtitle}>
            Elige tu nombre visible y un handle único para que tus amigos puedan encontrarte.
          </Text>

          {/* Name */}
          <Text style={styles.label}>TU NOMBRE</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Carlos G."
            placeholderTextColor="#c1c8c2"
            value={name}
            onChangeText={setName}
            maxLength={40}
            returnKeyType="next"
            autoFocus
          />

          {/* Handle */}
          <Text style={[styles.label, { marginTop: 8 }]}>TU HANDLE</Text>
          <View style={styles.handleRow}>
            <View style={styles.atPrefix}>
              <Text style={styles.atText}>@</Text>
            </View>
            <TextInput
              style={styles.handleInput}
              placeholder="carlos_g"
              placeholderTextColor="#c1c8c2"
              value={handle}
              onChangeText={(v) => {
                userEditedHandle.current = true;
                // Enforce format on the fly: lowercase, no spaces
                setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <HandleIndicator />
          </View>

          {handleError ? (
            <Text style={styles.errorText}>{handleError}</Text>
          ) : handleStatus === 'available' ? (
            <Text style={styles.okText}>@{handle} está disponible</Text>
          ) : (
            <Text style={styles.hintText}>
              Solo letras minúsculas, números y _ · 3–20 caracteres
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnText}>Continuar →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              showAlert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar sesión', style: 'destructive', onPress: () => supabase.auth.signOut() },
              ]);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>Cerrar sesión</Text>
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
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 36,
    color: '#032417',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: '#032417',
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
    marginBottom: 8,
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
    paddingVertical: 18,
    fontFamily: 'Manrope-Regular',
    fontSize: 20,
    color: '#1c1c18',
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
    fontSize: 20,
    color: '#727973',
  },
  handleInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 18,
    fontFamily: 'Manrope-Regular',
    fontSize: 20,
    color: '#1c1c18',
  },
  indicator: {
    paddingHorizontal: 12,
  },
  hintText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#c1c8c2',
    lineHeight: 18,
  },
  okText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#516600',
  },
  errorText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: '#ba1a1a',
  },
  btn: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { backgroundColor: '#e6e2db' },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  signOutText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    textDecorationLine: 'underline',
  },
});
