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
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function ForgotScreen() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSend() {
    if (!emailOk || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={s.root}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/auth/login')} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#032417" />
        </TouchableOpacity>
        <View style={s.sentContent}>
          <View style={s.iconCircle}>
            <MaterialIcons name="mark-email-read" size={28} color="#516600" />
          </View>
          <Text style={s.title}>Revisa tu email</Text>
          <Text style={s.subtitle}>
            Hemos enviado instrucciones para restablecer tu contraseña a{'\n'}
            <Text style={s.emailBold}>{email}</Text>
          </Text>
          <Text style={s.hint}>
            Si no ves el email en unos minutos, revisa la carpeta de spam.
          </Text>
          <TouchableOpacity
            style={s.btn}
            activeOpacity={0.85}
            onPress={() => router.replace('/auth/login')}
          >
            <Text style={s.btnText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#032417" />
        </TouchableOpacity>

        <View style={s.content}>
          <View style={s.header}>
            <View style={s.iconCircle}>
              <MaterialIcons name="lock-reset" size={28} color="#032417" />
            </View>
            <Text style={s.title}>Recuperar{'\n'}contraseña</Text>
            <Text style={s.subtitle}>
              Introduce tu email y te enviaremos instrucciones para crear una contraseña nueva.
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
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={handleSend}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[s.btn, (!emailOk || loading) && s.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleSend}
            disabled={!emailOk || loading}
          >
            {loading ? (
              <ActivityIndicator color="#032417" />
            ) : (
              <Text style={s.btnText}>Enviar instrucciones</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  sentContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 20,
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
  hint: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#c1c8c2',
    lineHeight: 19,
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
});
