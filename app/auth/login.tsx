import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [status, setStatus]             = useState<{ type: 'error' | 'success' | 'info'; msg: string } | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 6;

  async function handleLogin() {
    if (!emailOk || !passwordOk || loading) return;
    setStatus(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        const isUnconfirmed = msg.includes('email not confirmed');
        if (isUnconfirmed) {
          await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { shouldCreateUser: false },
          });
          setStatus({ type: 'info', msg: 'Email no confirmado. Te hemos enviado un código de verificación.' });
          router.push({ pathname: '/auth/verify', params: { email: email.trim(), type: 'email' } });
          return;
        }
        const isBadCredentials =
          msg.includes('invalid') ||
          msg.includes('credentials') ||
          msg.includes('not found');
        setStatus({
          type: 'error',
          msg: isBadCredentials
            ? 'Email o contraseña incorrectos. Compruébalos o crea una cuenta nueva.'
            : error.message,
        });
      }
      // Success: onAuthStateChange handles navigation
    } catch (e: any) {
      setStatus({ type: 'error', msg: e?.message ?? 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#032417" />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Bienvenido{'\n'}de nuevo</Text>
          <Text style={s.subtitle}>Inicia sesión con tu email y contraseña.</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <View>
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={[s.input, !emailOk && email.length > 3 && s.inputError]}
              placeholder="nombre@ejemplo.com"
              placeholderTextColor="#c1c8c2"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View>
            <Text style={s.label}>CONTRASEÑA</Text>
            <View style={s.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={s.passwordInput}
                placeholder="Tu contraseña"
                placeholderTextColor="#c1c8c2"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color="#727973"
                />
              </TouchableOpacity>
            </View>
          </View>

          {status && (
            <View style={[s.statusBanner, status.type === 'error' && s.statusError, status.type === 'success' && s.statusSuccess, status.type === 'info' && s.statusInfo]}>
              <MaterialIcons
                name={status.type === 'error' ? 'error-outline' : status.type === 'success' ? 'check-circle-outline' : 'info-outline'}
                size={18}
                color={status.type === 'error' ? '#ba1a1a' : status.type === 'success' ? '#516600' : '#032417'}
              />
              <Text style={[s.statusText, status.type === 'error' && { color: '#ba1a1a' }, status.type === 'success' && { color: '#516600' }]}>{status.msg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, (!emailOk || !passwordOk || loading) && s.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={!emailOk || !passwordOk || loading}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={s.btnText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.forgotBtn}
            onPress={() => router.push('/auth/forgot')}
            activeOpacity={0.7}
          >
            <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        {/* Switch to signup */}
        <View style={s.switchRow}>
          <Text style={s.switchText}>¿No tienes cuenta?</Text>
          <TouchableOpacity
            onPress={() => router.replace('/auth/signup')}
            activeOpacity={0.7}
          >
            <Text style={s.switchLink}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 48,
    gap: 32,
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },

  header: { gap: 8 },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 34,
    color: '#032417',
    lineHeight: 42,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
  },

  form: { gap: 16 },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: '#1c1c18',
  },
  inputError: { backgroundColor: '#fff0f0' },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: '#1c1c18',
  },
  eyeBtn: {
    padding: 10,
  },

  btn: {
    backgroundColor: '#c7ef48',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#e6e2db' },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f7f3ec',
  },
  statusError: { backgroundColor: '#fff0f0' },
  statusSuccess: { backgroundColor: '#f0f8e0' },
  statusInfo: { backgroundColor: '#eef3ff' },
  statusText: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: '#1c1c18',
    lineHeight: 18,
  },

  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#727973',
    textDecorationLine: 'underline',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 16,
  },
  switchText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#727973',
  },
  switchLink: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#032417',
    textDecorationLine: 'underline',
  },
});
