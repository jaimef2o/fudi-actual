import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { signInWithApple, signInWithGoogle } from '../../lib/api/auth';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { showAlert } from '../../lib/utils/alerts';

export default function AuthLandingScreen() {
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleApple() {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) showAlert('Error', error);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) showAlert('Error', error);
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      {/* Logo block */}
      <View style={s.hero}>
        <View style={s.logoContainer}>
          <Text style={s.logo}>fudi</Text>
        </View>
        <Text style={s.tagline}>Tu círculo gastronómico</Text>
        <Text style={s.description}>
          Descubre dónde comen tus amigos y comparte las mejores experiencias de mesa.
        </Text>
      </View>

      {/* CTAs */}
      <View style={s.actions}>
        <TouchableOpacity
          style={s.btnPrimary}
          activeOpacity={0.85}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={s.btnPrimaryText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.btnSecondary}
          activeOpacity={0.85}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={s.btnSecondaryText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>o continuar con</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Social */}
      <View style={s.socialRow}>
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={s.socialBtn}
            activeOpacity={0.8}
            onPress={handleApple}
            disabled={appleLoading || googleLoading}
          >
            {appleLoading ? (
              <ActivityIndicator size="small" color="#1c1c18" />
            ) : (
              <>
                <MaterialIcons name="apple" size={20} color="#1c1c18" />
                <Text style={s.socialLabel}>Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.socialBtn, Platform.OS !== 'ios' && { flex: 1 }]}
          activeOpacity={0.8}
          onPress={handleGoogle}
          disabled={appleLoading || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#1c1c18" />
          ) : (
            <>
              <Text style={s.googleG}>G</Text>
              <Text style={s.socialLabel}>Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Legal */}
      <Text style={s.legal}>
        Al continuar aceptas los{' '}
        <Text style={s.legalLink}>Términos de Uso</Text>
        {' '}y la{' '}
        <Text style={s.legalLink}>Política de Privacidad</Text>
        {' '}de fudi.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fdf9f2',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 100 : 72,
    paddingBottom: 48,
    justifyContent: 'flex-end',
  },

  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logo: {
    fontFamily: 'NotoSerif-BoldItalic',
    fontSize: 64,
    color: '#032417',
    letterSpacing: -2,
  },
  tagline: {
    fontFamily: 'NotoSerif-Italic',
    fontSize: 20,
    color: '#424844',
  },
  description: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#727973',
    lineHeight: 22,
    maxWidth: 300,
    marginTop: 4,
  },

  actions: {
    gap: 12,
    marginBottom: 28,
  },
  btnPrimary: {
    backgroundColor: '#c7ef48',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: '#032417',
  },
  btnSecondary: {
    backgroundColor: '#032417',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: '#ffffff',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e6e2db',
  },
  dividerText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: '#c1c8c2',
  },

  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
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
  googleG: {
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
    fontSize: 12,
    color: '#c1c8c2',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#727973',
  },
});
