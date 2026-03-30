import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { showAlert } from '../../lib/utils/alerts';
import { useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { claimInvitation } from '../../lib/api/users';
import { useAppStore } from '../../store';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { email, type = 'signup' } = useLocalSearchParams<{ email: string; type?: string }>();
  const [code, setCode]   = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const pendingInviteToken   = useAppStore((s) => s.pendingInviteToken);
  const setPendingInviteToken = useAppStore((s) => s.setPendingInviteToken);

  const currentCode = code.join('');
  const isFull = currentCode.length === CODE_LENGTH && code.every(Boolean);

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '');

    // Paste handling — fill multiple boxes
    if (cleaned.length > 1) {
      const newCode = [...code];
      const chars = cleaned.slice(0, CODE_LENGTH).split('');
      for (let i = 0; i < chars.length; i++) {
        newCode[i] = chars[i];
      }
      setCode(newCode);
      const lastFilled = Math.min(chars.length - 1, CODE_LENGTH - 1);
      inputRefs.current[lastFilled]?.focus();
      if (chars.length === CODE_LENGTH) {
        doVerify(newCode.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    if (cleaned && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.filter(Boolean).length === CODE_LENGTH) {
      doVerify(newCode.join(''));
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function doVerify(codeStr: string) {
    if (codeStr.length !== CODE_LENGTH || loading) return;
    setLoading(true);

    const otpType = type === 'recovery' ? 'recovery' : type === 'email' ? 'email' : 'signup';

    const { data, error } = await supabase.auth.verifyOtp({
      email: email!,
      token: codeStr,
      type: otpType as 'signup' | 'email' | 'recovery',
    });
    setLoading(false);

    if (error) {
      const expired =
        error.message?.toLowerCase().includes('expired') ||
        error.message?.toLowerCase().includes('otp');
      showAlert(
        expired ? 'Código caducado' : 'Código incorrecto',
        expired
          ? 'El código ha caducado (válido 10 min). Solicita uno nuevo.'
          : 'El código no es válido. Compruébalo e inténtalo de nuevo.',
      );
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }

    // Supabase can return data.user = null even on success — fall back to session.user
    const resolvedUser = data.user ?? data.session?.user ?? null;

    if (resolvedUser) {
      // Claim pending invite if one exists
      if (pendingInviteToken) {
        await claimInvitation(pendingInviteToken, resolvedUser.id);
        setPendingInviteToken(null);
      }

      // Check if user has completed their profile
      const { data: profileData } = await supabase
        .from('users')
        .select('name, handle')
        .eq('id', resolvedUser.id)
        .single();

      const profile = profileData as { name: string | null; handle: string | null } | null;
      if (!profile?.name || !profile?.handle) {
        router.replace('/auth/name');
      } else {
        router.replace('/(tabs)/feed');
      }
    } else {
      // Session established but no user data available yet —
      // the onAuthStateChange listener in _layout.tsx will handle routing.
      // As a safety net, navigate to name setup which is always safe for new users.
      router.replace('/auth/name');
    }
  }

  async function handleResend() {
    const { error } = await supabase.auth.signInWithOtp({
      email: email!,
      options: { shouldCreateUser: false },
    });
    if (error) {
      showAlert('Error', error.message);
    } else {
      showAlert('Código reenviado', 'Revisa tu bandeja de entrada.');
    }
  }

  return (
    <View style={s.root}>
      <View style={s.inner}>
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#032417" />
        </TouchableOpacity>

        <View style={s.content}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.iconCircle}>
              <MaterialIcons name="mark-email-unread" size={28} color="#032417" />
            </View>
            <Text style={s.title}>Revisa tu email</Text>
            <Text style={s.subtitle}>
              Hemos enviado un código de 6 dígitos a{'\n'}
              <Text style={s.emailBold}>{email}</Text>
            </Text>
          </View>

          {/* 6-box code input */}
          <View style={s.codeRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  s.codeBox,
                  code[i] ? s.codeBoxFilled : null,
                  loading ? s.codeBoxLoading : null,
                ]}
                value={code[i]}
                onChangeText={(val) => handleChange(i, val)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH} // allow paste from any box
                textAlign="center"
                autoFocus={i === 0}
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          {loading && (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color="#727973" />
              <Text style={s.loadingText}>Verificando...</Text>
            </View>
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[s.btn, (!isFull || loading) && s.btnDisabled]}
            activeOpacity={0.85}
            onPress={() => doVerify(currentCode)}
            disabled={!isFull || loading}
          >
            <Text style={s.btnText}>Verificar</Text>
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity onPress={handleResend} style={s.resendBtn} activeOpacity={0.7}>
            <Text style={s.resendText}>¿No recibiste el código?</Text>
            <Text style={s.resendLink}>Reenviar email</Text>
          </TouchableOpacity>

          {/* Hint */}
          <Text style={s.hint}>
            El código es válido durante 10 minutos. Revisa también la carpeta de spam.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 48,
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 24,
  },

  content: { gap: 28 },

  header: { gap: 12 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'NotoSerif-Bold',
    fontSize: 30,
    color: '#032417',
    marginTop: 4,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
  },
  emailBold: {
    fontFamily: 'Manrope-Bold',
    color: '#1c1c18',
  },

  codeRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 52,
    backgroundColor: '#f7f3ec',
    borderRadius: 14,
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: '#032417',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  codeBoxFilled: {
    backgroundColor: '#fff',
    borderColor: '#c7ef48',
  },
  codeBoxLoading: {
    opacity: 0.6,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: -12,
  },
  loadingText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
  },

  btn: {
    backgroundColor: '#c7ef48',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#e6e2db' },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },

  resendBtn: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  resendText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#727973',
  },
  resendLink: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: '#032417',
    textDecorationLine: 'underline',
  },

  hint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#c1c8c2',
    textAlign: 'center',
    lineHeight: 18,
  },
});
