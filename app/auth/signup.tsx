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

export default function SignupScreen() {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);

  const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 8;
  const matchOk    = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit  = emailOk && passwordOk && matchOk && !loading;

  async function handleSignup() {
    if (!canSubmit) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      const exists =
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('user already');
      Alert.alert(
        exists ? 'Email ya registrado' : 'Error',
        exists
          ? 'Este email ya tiene cuenta. Inicia sesión o recupera tu contraseña.'
          : error.message,
      );
      return;
    }

    if (data.session) {
      // Email confirmation disabled — user is immediately signed in
      // The auth listener in _layout.tsx will handle routing
    } else {
      // Email confirmation required.
      // signUp sends a confirmation link, NOT a 6-digit code.
      // Trigger signInWithOtp so the user receives the OTP code the verify screen expects.
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      router.push({ pathname: '/auth/verify', params: { email: email.trim(), type: 'email' } });
    }
  }

  const passwordStrength =
    password.length === 0 ? null
    : password.length < 8 ? 'weak'
    : password.length < 12 ? 'medium'
    : 'strong';

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
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#032417" />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Crea{'\n'}tu cuenta</Text>
          <Text style={s.subtitle}>Únete a la comunidad gastronómica de tus amigos.</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          {/* Email */}
          <View>
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={[s.input, !emailOk && email.length > 3 && s.inputError]}
              placeholder="nombre@ejemplo.com"
              placeholderTextColor="#c1c8c2"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View>
            <Text style={s.label}>CONTRASEÑA</Text>
            <View style={s.passwordRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#c1c8c2"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                returnKeyType="next"
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
            {/* Strength bar */}
            {passwordStrength && (
              <View style={s.strengthRow}>
                {(['weak', 'medium', 'strong'] as const).map((level, i) => (
                  <View
                    key={level}
                    style={[
                      s.strengthBar,
                      {
                        backgroundColor:
                          (passwordStrength === 'weak' && i === 0) ? '#ba1a1a' :
                          (passwordStrength === 'medium' && i <= 1) ? '#f59e0b' :
                          (passwordStrength === 'strong') ? '#516600' :
                          '#e6e2db',
                      },
                    ]}
                  />
                ))}
                <Text style={[
                  s.strengthText,
                  passwordStrength === 'weak' && { color: '#ba1a1a' },
                  passwordStrength === 'medium' && { color: '#f59e0b' },
                  passwordStrength === 'strong' && { color: '#516600' },
                ]}>
                  {passwordStrength === 'weak' ? 'Débil' : passwordStrength === 'medium' ? 'Aceptable' : 'Fuerte'}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View>
            <Text style={s.label}>REPITE LA CONTRASEÑA</Text>
            <View style={[s.passwordRow, confirmPassword.length > 0 && !matchOk && s.rowError]}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#c1c8c2"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showConfirm ? 'visibility-off' : 'visibility'}
                  size={20}
                  color="#727973"
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && !matchOk && (
              <Text style={s.errorText}>Las contraseñas no coinciden</Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.btn, !canSubmit && s.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleSignup}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={s.btnText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Switch to login */}
        <View style={s.switchRow}>
          <Text style={s.switchText}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity
            onPress={() => router.replace('/auth/login')}
            activeOpacity={0.7}
          >
            <Text style={s.switchLink}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    overflow: 'hidden',
  },
  rowError: { backgroundColor: '#fff0f0' },
  eyeBtn: { padding: 10 },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    color: '#c1c8c2',
    minWidth: 56,
    textAlign: 'right',
  },
  errorText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: '#ba1a1a',
    marginTop: 6,
    paddingHorizontal: 4,
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
