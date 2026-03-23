import { Platform } from 'react-native';
import { supabase } from '../supabase';

// ─── Apple Sign-In ────────────────────────────────────────────────────────────

let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  // expo-apple-authentication not installed
}

export async function signInWithApple(): Promise<{ error: string | null }> {
  if (!AppleAuthentication) {
    return { error: 'expo-apple-authentication no está instalado.' };
  }
  if (Platform.OS !== 'ios') {
    return { error: 'Apple Sign-In solo está disponible en iOS.' };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const idToken = credential.identityToken;
    if (!idToken) return { error: 'No se recibió token de Apple.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e: any) {
    // ERR_CANCELED = user dismissed the sheet
    if (e?.code === 'ERR_CANCELED') return { error: null };
    return { error: e?.message ?? 'Error al iniciar sesión con Apple.' };
  }
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────

let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
} catch {
  // @react-native-google-signin not installed
}

/**
 * Call once at app startup (e.g. in _layout.tsx) when Google Sign-In is available.
 * webClientId is from your google-services.json / GoogleService-Info.plist.
 */
export function configureGoogleSignIn(webClientId: string) {
  if (!GoogleSignin) return;
  GoogleSignin.configure({ webClientId, offlineAccess: true });
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!GoogleSignin) {
    return { error: '@react-native-google-signin no está instalado.' };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;
    if (!idToken) return { error: 'No se recibió token de Google.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (e: any) {
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED) return { error: null };
    if (e?.code === statusCodes?.IN_PROGRESS) return { error: null };
    return { error: e?.message ?? 'Error al iniciar sesión con Google.' };
  }
}
