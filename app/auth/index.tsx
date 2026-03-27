import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { signInWithApple, signInWithGoogle } from '../../lib/api/auth';

type AuthMode = 'otp' | 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [appleLoading, setAppleLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailOk   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 6;
  const anyLoading = loading || appleLoading || googleLoading;

  // ── OTP (magic link) ─────────────────────────────────────────────────────
  async function handleSendOTP() {
    if (!emailOk) { Alert.alert('Email inválido', 'Introduce un email válido.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.push({ pathname: '/auth/verify', params: { email: email.trim() } });
  }

  // ── Email + password login ────────────────────────────────────────────────
  async function handleLogin() {
    if (!emailOk || !passwordOk) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert(
        'Error al iniciar sesión',
        error.message.includes('Invalid login')
          ? 'Email o contraseña incorrectos.'
          : error.message,
      );
    }
    // On success → AuthContext listener redirects to feed automatically
  }

  // ── Email + password signup ───────────────────────────────────────────────
  async function handleSignup() {
    if (!emailOk || !passwordOk) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: undefined },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error al crear cuenta', error.message);
      return;
    }
    // If user already exists Supabase returns a fake success — handle gracefully
    if (data.user && !data.session) {
      Alert.alert(
        'Confirma tu email',
        'Te hemos enviado un email de confirmación. Revisa tu bandeja de entrada.',
      );
      return;
    }
    // New user with session → go to name setup
    router.replace('/auth/name');
  }

  // ── Social ────────────────────────────────────────────────────────────────
  async function handleApple() {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) Alert.alert('Error', error);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('Error', error);
  }

  const isOTP    = mode === 'otp';
  const isLogin  = mode === 'login';
  const isSignup = mode === 'signup';

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoBlock}>
          <Text style={s.logo}>fudi</Text>
          <Text style={s.tagline}>Tu círculo gastronómico</Text>
        </View>

        {/* Mode toggle */}
        <View style={s.modeRow}>
          {(['login', 'signup', 'otp'] as AuthMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.modeBtn, mode === m && s.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                {m === 'login' ? 'Entrar' : m === 'signup' ? 'Crear cuenta' : 'Código'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={s.form}>
          {/* Email */}
          <Text style={s.label}>EMAIL</Text>
          <TextInput
            style={s.input}
            placeholder="nombre@ejemplo.com"
            placeholderTextColor="#c1c8c2"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!anyLoading}
          />

          {/* Password (not in OTP mode) */}
          {!isOTP && (
            <>
              <Text style={[s.label, { marginTop: 4 }]}>CONTRASEÑA</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={isSignup ? 'Mínimo 6 caracteres' : '••••••••'}
                  placeholderTextColor="#c1c8c2"
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  editable={!anyLoading}
                  returnKeyType="done"
                  onSubmitEditing={isLogin ? handleLogin : handleSignup}
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowPw((v) => !v)}
                >
                  <MaterialIcons
                    name={showPw ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#727973"
                  />
                </TouchableOpacity>
              </View>
              {isSignup && (
                <Text style={s.hint}>
                  Usa al menos 6 caracteres. Podrás cambiarla desde tu perfil.
                </Text>
              )}
            </>
          )}

          {isOTP && (
            <Text style={s.hint}>
              Te enviaremos un código de 8 dígitos para acceder sin contraseña.
            </Text>
          )}

          {/* CTA */}
          {isOTP ? (
            <TouchableOpacity
              style={[s.btn, (!emailOk || anyLoading) && s.btnDisabled]}
              activeOpacity={0.85}
              onPress={handleSendOTP}
              disabled={!emailOk || anyLoading}
            >
              {loading ? (
                <ActivityIndicator color="#032417" />
              ) : (
                <Text style={s.btnText}>Enviar código →</Text>
              )}
            </TouchableOpacity>
          ) : isLogin ? (
            <TouchableOpacity
              style={[s.btn, (!emailOk || !passwordOk || anyLoading) && s.btnDisabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={!emailOk || !passwordOk || anyLoading}
            >
              {loading ? (
                <ActivityIndicator color="#032417" />
              ) : (
                <Text style={s.btnText}>Iniciar sesión →</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btn, (!emailOk || !passwordOk || anyLoading) && s.btnDisabled]}
              activeOpacity={0.85}
              onPress={handleSignup}
              disabled={!emailOk || !passwordOk || anyLoading}
            >
              {loading ? (
                <ActivityIndicator color="#032417" />
              ) : (
                <Text style={s.btnText}>Crear cuenta →</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Switch hint */}
          {isLogin && (
            <TouchableOpacity onPress={() => setMode('signup')} style={s.switchRow}>
              <Text style={s.switchText}>
                ¿Nuevo en fudi?{' '}
                <Text style={s.switchLink}>Crear cuenta</Text>
              </Text>
            </TouchableOpacity>
          )}
          {isSignup && (
            <TouchableOpacity onPress={() => setMode('login')} style={s.switchRow}>
              <Text style={s.switchText}>
                ¿Ya tienes cuenta?{' '}
                <Text style={s.switchLink}>Iniciar sesión</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Social divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>o continuar con</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={s.socialRow}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={s.socialBtn}
              activeOpacity={0.8}
              onPress={handleApple}
              disabled={anyLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#1c1c18" size="small" />
              ) : (
                <>
                  <Text style={s.socialIcon}></Text>
                  <Text style={s.socialLabel}>Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.socialBtn, Platform.OS !== 'ios' && { flex: 1 }]}
            activeOpacity={0.8}
            onPress={handleGoogle}
            disabled={anyLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1c1c18" size="small" />
            ) : (
              <>
                <Text style={s.socialIcon}>G</Text>
                <Text style={s.socialLabel}>Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.legal}>
          Al continuar aceptas los Términos de Uso y la Política de Privacidad de fudi.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#fdf9f2' },
  inner: { paddingHorizontal: 28, paddingVertical: 48, gap: 28 },

  logoBlock: { alignItems: 'center', gap: 8 },
  logo: { fontFamily: 'NotoSerif-BoldItalic', fontSize: 52, color: '#032417', letterSpacing: -1 },
  tagline: { fontFamily: 'Manrope-Medium', fontSize: 15, color: '#727973' },

  // Mode toggle
  modeRow: { flexDirection: 'row', backgroundColor: '#f1ede6', borderRadius: 14, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#ffffff' },
  modeBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: '#727973' },
  modeBtnTextActive: { color: '#032417' },

  // Form
  form: { gap: 10 },
  label: {
    fontFamily: 'Manrope-Bold', fontSize: 10,
    color: '#727973', letterSpacing: 2, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f7f3ec', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    fontFamily: 'Manrope-Regular', fontSize: 17, color: '#1c1c18',
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    backgroundColor: '#f7f3ec', borderRadius: 14,
    padding: 16, justifyContent: 'center', alignItems: 'center',
  },
  hint: { fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973', lineHeight: 19 },

  btn: {
    backgroundColor: '#c7ef48', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#e6e2db' },
  btnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#032417' },

  switchRow: { alignItems: 'center', paddingVertical: 4 },
  switchText: { fontFamily: 'Manrope-Regular', fontSize: 13, color: '#727973' },
  switchLink: { fontFamily: 'Manrope-Bold', color: '#032417' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e6e2db' },
  dividerText: { fontFamily: 'Manrope-Medium', fontSize: 13, color: '#727973' },

  // Social
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#f7f3ec', borderRadius: 14, paddingVertical: 15,
  },
  socialIcon: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#1c1c18' },
  socialLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 15, color: '#1c1c18' },

  legal: {
    fontFamily: 'Manrope-Regular', fontSize: 11,
    color: '#c1c8c2', textAlign: 'center', lineHeight: 17,
  },
});
