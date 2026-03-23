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
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { signInWithApple, signInWithGoogle } from '../../lib/api/auth';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const anyLoading = loading || appleLoading || googleLoading;

  async function handleSendOTP() {
    if (!isValid) {
      Alert.alert('Email inválido', 'Introduce un email válido.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    router.push({ pathname: '/auth/verify', params: { email: email.trim() } });
  }

  async function handleApple() {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) Alert.alert('Error', error);
    // On success, _layout.tsx auth listener redirects automatically
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('Error', error);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>fudi</Text>
          <Text style={styles.tagline}>Tu círculo gastronómico</Text>
        </View>

        {/* Email form */}
        <View style={styles.form}>
          <Text style={styles.label}>TU EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="nombre@ejemplo.com"
            placeholderTextColor="#c1c8c2"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
            editable={!anyLoading}
          />
          <Text style={styles.hint}>
            Te enviaremos un código de 6 dígitos para acceder.
          </Text>

          <TouchableOpacity
            style={[styles.btn, (!isValid || anyLoading) && styles.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleSendOTP}
            disabled={!isValid || anyLoading}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnText}>Continuar →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Social sign-in divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o continuar con</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
          {/* Apple — only on iOS */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.8}
              onPress={handleApple}
              disabled={anyLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#1c1c18" size="small" />
              ) : (
                <>
                  <Text style={styles.socialIcon}></Text>
                  <Text style={styles.socialLabel}>Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialBtn, Platform.OS !== 'ios' && { flex: 1 }]}
            activeOpacity={0.8}
            onPress={handleGoogle}
            disabled={anyLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1c1c18" size="small" />
            ) : (
              <>
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialLabel}>Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          Al continuar aceptas los Términos de Uso y la Política de Privacidad de fudi.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fdf9f2',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 32,
  },
  logoBlock: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 52,
    color: '#032417',
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: 'Manrope-Medium',
    fontSize: 15,
    color: '#727973',
  },
  form: {
    gap: 12,
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
    fontSize: 17,
    color: '#1c1c18',
  },
  hint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    lineHeight: 19,
  },
  btn: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: '#e6e2db',
  },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e6e2db',
  },
  dividerText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: '#727973',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    paddingVertical: 15,
  },
  socialIcon: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#1c1c18',
  },
  socialLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 15,
    color: '#1c1c18',
  },
  legal: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#c1c8c2',
    textAlign: 'center',
    lineHeight: 17,
  },
});
