import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

export default function ForgotScreen() {
  const setSuppressAuthRedirect = useAppStore((s) => s.setSuppressAuthRedirect);

  // Clear suppress flag when leaving this screen
  useEffect(() => {
    return () => { setSuppressAuthRedirect(false); };
  }, []);

  const [email, setEmail]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [step, setStep]               = useState<'email' | 'code' | 'newpass'>('email');
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [status, setStatus]           = useState<{ type: 'error' | 'success' | 'info'; msg: string } | null>(null);

  const codeRef = useRef<TextInput>(null);
  const newPwRef = useRef<TextInput>(null);
  const confirmPwRef = useRef<TextInput>(null);

  const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeOk     = code.length === 6;
  const passwordOk = newPassword.length >= 8;
  const matchOk    = newPassword === confirmPw && confirmPw.length > 0;

  // Step 1: Send OTP code to email
  async function handleSendCode() {
    if (!emailOk || loading) return;
    setStatus(null);
    setSuppressAuthRedirect(true);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      setLoading(false);
      if (error) {
        setStatus({ type: 'error', msg: error.message });
      } else {
        setStatus({ type: 'success', msg: 'Código enviado. Revisa tu email.' });
        setStep('code');
      }
    } catch (e: any) {
      setLoading(false);
      setStatus({ type: 'error', msg: e?.message ?? 'Error de conexión. Inténtalo de nuevo.' });
    }
  }

  // Step 2: Verify OTP code
  async function handleVerifyCode() {
    if (!codeOk || loading) return;
    setStatus(null);
    setSuppressAuthRedirect(true);
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'email',
      });
      setLoading(false);
      if (error) {
        setStatus({ type: 'error', msg: 'Código incorrecto. Revisa el código e inténtalo de nuevo.' });
      } else {
        setStatus(null);
        setStep('newpass');
      }
    } catch (e: any) {
      setLoading(false);
      setStatus({ type: 'error', msg: e?.message ?? 'Error de conexión. Inténtalo de nuevo.' });
    }
  }

  // Step 3: Set new password
  async function handleSetPassword() {
    if (!passwordOk || !matchOk || loading) return;
    setStatus(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      if (error) {
        setStatus({ type: 'error', msg: error.message });
      } else {
        setSuppressAuthRedirect(false);
        setStatus({ type: 'success', msg: 'Contraseña actualizada. Redirigiendo...' });
        setTimeout(() => router.replace('/(tabs)/feed'), 1500);
      }
    } catch (e: any) {
      setLoading(false);
      setStatus({ type: 'error', msg: e?.message ?? 'Error de conexión. Inténtalo de nuevo.' });
    }
  }

  return (
    <View style={s.root}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color="#032417" />
          </TouchableOpacity>

          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <View style={s.content}>
              <View style={s.header}>
                <View style={s.iconCircle}>
                  <MaterialIcons name="lock-reset" size={28} color="#032417" />
                </View>
                <Text style={s.title}>Recuperar{'\n'}contraseña</Text>
                <Text style={s.subtitle}>
                  Introduce tu email y te enviaremos un código de verificación.
                </Text>
              </View>

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
                  returnKeyType="go"
                  onSubmitEditing={handleSendCode}
                />
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
                style={[s.btn, (!emailOk || loading) && s.btnDisabled]}
                activeOpacity={0.85}
                onPress={handleSendCode}
                disabled={!emailOk || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#032417" />
                ) : (
                  <Text style={s.btnText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: OTP Code ── */}
          {step === 'code' && (
            <View style={s.content}>
              <View style={s.header}>
                <View style={s.iconCircle}>
                  <MaterialIcons name="pin" size={28} color="#032417" />
                </View>
                <Text style={s.title}>Introduce{'\n'}el código</Text>
                <Text style={s.subtitle}>
                  Hemos enviado un código de 6 dígitos a{'\n'}
                  <Text style={s.emailBold}>{email}</Text>
                </Text>
              </View>

              <View>
                <Text style={s.label}>CÓDIGO</Text>
                <TextInput
                  ref={codeRef}
                  style={s.input}
                  placeholder="000000"
                  placeholderTextColor="#c1c8c2"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleVerifyCode}
                />
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
                style={[s.btn, (!codeOk || loading) && s.btnDisabled]}
                activeOpacity={0.85}
                onPress={handleVerifyCode}
                disabled={!codeOk || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#032417" />
                ) : (
                  <Text style={s.btnText}>Verificar código</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.resendBtn}
                onPress={handleSendCode}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={s.resendText}>¿No recibiste el código? Reenviar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 'newpass' && (
            <View style={s.content}>
              <View style={s.header}>
                <View style={s.iconCircle}>
                  <MaterialIcons name="vpn-key" size={28} color="#516600" />
                </View>
                <Text style={s.title}>Nueva{'\n'}contraseña</Text>
                <Text style={s.subtitle}>
                  Elige una contraseña nueva. Mínimo 8 caracteres.
                </Text>
              </View>

              <View>
                <Text style={s.label}>NUEVA CONTRASEÑA</Text>
                <View style={s.passwordRow}>
                  <TextInput
                    ref={newPwRef}
                    style={s.passwordInput}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#c1c8c2"
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPwRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)} activeOpacity={0.7}>
                    <MaterialIcons name={showPw ? 'visibility-off' : 'visibility'} size={20} color="#727973" />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={s.label}>REPITE LA CONTRASEÑA</Text>
                <View style={[s.passwordRow, confirmPw.length > 0 && !matchOk && s.rowError]}>
                  <TextInput
                    ref={confirmPwRef}
                    style={s.passwordInput}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#c1c8c2"
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={handleSetPassword}
                  />
                </View>
                {confirmPw.length > 0 && !matchOk && (
                  <Text style={s.errorText}>Las contraseñas no coinciden</Text>
                )}
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
                style={[s.btn, (!passwordOk || !matchOk || loading) && s.btnDisabled]}
                activeOpacity={0.85}
                onPress={handleSetPassword}
                disabled={!passwordOk || !matchOk || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#032417" />
                ) : (
                  <Text style={s.btnText}>Guardar contraseña</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf9f2' },
  scrollContent: {
    flexGrow: 1,
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
    fontSize: 32,
    color: '#032417',
    lineHeight: 40,
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
  rowError: { backgroundColor: '#fff0f0' },
  eyeBtn: { padding: 10 },
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
  },
  btnDisabled: { backgroundColor: '#e6e2db' },
  btnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#032417',
  },

  resendBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resendText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#727973',
    textDecorationLine: 'underline',
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
});
