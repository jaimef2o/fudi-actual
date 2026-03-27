import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  NotoSerif_400Regular,
  NotoSerif_700Bold,
  NotoSerif_400Regular_Italic,
  NotoSerif_700Bold_Italic,
} from '@expo-google-fonts/noto-serif';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import type { UserRow } from '../lib/database.types';
import { initMonitoring, setMonitoringUser, getSentryErrorBoundary } from '../lib/monitoring';
import { Toast } from '../components/Toast';

// Native fallback error boundary when Sentry is not available
class NativeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      return <Fallback />;
    }
    return this.props.children;
  }
}

// Init Sentry as early as possible
initMonitoring();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Sentry ErrorBoundary — null when Sentry isn't installed
const SentryErrorBoundary = getSentryErrorBoundary();

function ErrorFallback() {
  async function handleRestart() {
    try {
      await Updates.reloadAsync();
    } catch {
      // expo-updates not available in dev — no-op
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fdf9f2',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 32,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#f1ede6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 32 }}>🍽️</Text>
      </View>
      <Text
        style={{
          fontFamily: 'NotoSerif-Bold',
          fontSize: 22,
          color: '#032417',
          textAlign: 'center',
        }}
      >
        Algo ha ido mal
      </Text>
      <Text
        style={{
          fontFamily: 'Manrope-Regular',
          fontSize: 14,
          color: '#727973',
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        El equipo ya está al tanto. Reinicia la app para continuar.
      </Text>
      <TouchableOpacity
        onPress={handleRestart}
        activeOpacity={0.85}
        style={{
          backgroundColor: '#032417',
          paddingVertical: 14,
          paddingHorizontal: 28,
          borderRadius: 999,
          marginTop: 8,
        }}
      >
        <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: '#ffffff' }}>
          Reiniciar app
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const bootstrapped = useRef(false);

  const [fontsLoaded] = useFonts({
    'NotoSerif-Regular': NotoSerif_400Regular,
    'NotoSerif-Bold': NotoSerif_700Bold,
    'NotoSerif-Italic': NotoSerif_400Regular_Italic,
    'NotoSerif-BoldItalic': NotoSerif_700Bold_Italic,
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Auth session listener — runs once fonts are ready
  useEffect(() => {
    if (!fontsLoaded) return;

    async function bootstrap() {
      // Check existing session on app start
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id);
        if (!bootstrapped.current) {
          bootstrapped.current = true;
          router.replace('/(tabs)/feed');
        }
      } else {
        if (!bootstrapped.current) {
          bootstrapped.current = true;
          router.replace('/auth');
        }
      }
    }

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url, handle')
        .eq('id', userId)
        .single();

      const profile = data as Pick<UserRow, 'id' | 'name' | 'avatar_url'> & { handle?: string | null } | null;
      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar_url ?? '',
        });
        // Identify user in Sentry for crash reports
        setMonitoringUser({ id: profile.id, name: profile.name });

        // Redirect existing users who never set a handle
        if (!profile.handle || !profile.name) {
          router.replace('/auth/name');
        }
      }
    }

    bootstrap();

    // Listen to future auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadProfile(session.user.id);
        }
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setMonitoringUser(null);
          queryClient.clear();
          router.replace('/auth');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fontsLoaded]);

  // On web, useFonts can hang indefinitely — don't block rendering
  if (!fontsLoaded && Platform.OS !== 'web') return null;

  const stackContent = (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="visit/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="ranking" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="profile/[userId]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="journey-b/[restaurantId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="registrar-visita" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="comparison/[restaurantId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="select-restaurant" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="auth/preferences" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="invite/[token]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="saved-posts" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="refine-ranking" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </QueryClientProvider>
  );

  if (SentryErrorBoundary) {
    return (
      <SentryErrorBoundary fallback={ErrorFallback}>
        {stackContent}
        <Toast />
      </SentryErrorBoundary>
    );
  }

  return (
    <NativeErrorBoundary fallback={ErrorFallback}>
      {stackContent}
      <Toast />
    </NativeErrorBoundary>
  );
}
