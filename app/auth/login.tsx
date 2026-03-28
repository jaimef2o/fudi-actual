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

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = password.length >= 6;

  async function handleLogin() {
    if (!emailOk || !passwordOk || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      const isBadCredentials =
        error.message.toLowerCase().includes('invalid') ||
        error.message.toLowerCase().includes('credentials') ||
        error.message.toLowerCase().includes('not found');
      Alert.alert(
        isBadCredentials ? 'Credenciales incorrectas' : 'Error',
        isBadCredentials
          ? 'Email o contraseña incorrectos. Compruébalos o crea una cuenta nueva.'
          : error.message,
      );
    }
    // On success, the auth state listener in _layout.tsx handles navigation
  }

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
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <View>
            <Text style={s.label}>CONTRASEÑA</Text>
            <View style={s.passwordRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Tu contraseña"
                placeholderTextColor="#c1c8c2"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
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
