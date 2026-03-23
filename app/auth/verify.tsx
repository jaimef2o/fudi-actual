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
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { claimInvitation } from '../../lib/api/users';
import { useAppStore } from '../../store';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const pendingInviteToken = useAppStore((s) => s.pendingInviteToken);
  const setPendingInviteToken = useAppStore((s) => s.setPendingInviteToken);

  async function handleVerify(overrideCode?: string) {
    const code = overrideCode ?? otp;
    if (code.length < 6) return;
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email!,
      token: code,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Código incorrecto', 'El código introducido no es válido. Inténtalo de nuevo.');
      setOtp('');
      return;
    }

    if (data.user) {
      // Claim pending invite token if one exists (user came via invite link)
      if (pendingInviteToken) {
        await claimInvitation(pendingInviteToken, data.user.id);
        setPendingInviteToken(null);
      }

      // Check if user has a name + handle set
      const { data: profileData } = await supabase
        .from('users')
        .select('name, handle')
        .eq('id', data.user.id)
        .single();

      const profile = profileData as { name: string | null; handle: string | null } | null;
      if (!profile?.name || !profile?.handle) {
        router.replace('/auth/name');
      } else {
        router.replace('/(tabs)/feed');
      }
    }
  }

  async function handleResend() {
    const { error } = await supabase.auth.signInWithOtp({
      email: email!,
      options: { shouldCreateUser: true },
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Código reenviado', 'Hemos enviado un nuevo código a tu email.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Verifica tu email</Text>
          <Text style={styles.subtitle}>
            Hemos enviado un código de verificación a{'\n'}
            <Text style={styles.phoneHighlight}>{email}</Text>
          </Text>

          <Text style={styles.label}>CÓDIGO DE VERIFICACIÓN</Text>
          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            placeholder="• • • • • •"
            placeholderTextColor="#c1c8c2"
            keyboardType="number-pad"
            maxLength={8}
            value={otp}
            onChangeText={(v) => {
              setOtp(v);
              // Auto-submit at 6 chars (Supabase email OTP) or 8 chars
              // Pass v directly to avoid stale closure
              if (v.length === 6 || v.length === 8) handleVerify(v);
            }}
            autoFocus
            returnKeyType="done"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />

          <TouchableOpacity
            style={[styles.btn, (otp.length < 6 || loading) && styles.btnDisabled]}
            activeOpacity={0.85}
            onPress={() => handleVerify()}
            disabled={otp.length < 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={styles.btnText}>Verificar →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} style={styles.resendBtn}>
            <Text style={styles.resendText}>¿No recibiste el código? Reenviar email</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backBtn: { marginBottom: 40 },
  backText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 15,
    color: '#727973',
  },
  content: { gap: 16 },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 32,
    color: '#032417',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
    marginBottom: 8,
  },
  phoneHighlight: {
    fontFamily: 'Manrope-Bold',
    color: '#032417',
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#727973',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  otpInput: {
    backgroundColor: '#f7f3ec',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontFamily: 'Manrope-Regular',
    fontSize: 28,
    color: '#1c1c18',
    letterSpacing: 12,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#e6e2db' },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
    textDecorationLine: 'underline',
  },
});
