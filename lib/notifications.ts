/**
 * Push notification helpers for savry.
 *
 * Install required packages:
 *   npx expo install expo-notifications expo-device
 *
 * In Supabase, add column: ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
 *
 * In app.json plugins, ensure expo-notifications is configured (see app.json).
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch (err) {
  if (__DEV__) console.warn('[savry] expo-notifications/expo-device not available:', err);
}

/**
 * Request permission and register the device's Expo Push Token.
 * Saves the token to the `users` table for server-side notification delivery.
 *
 * Call this AFTER the user has seen their first feed (not at app launch).
 */
export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Notifications || !Device) return;

  // Simulators/emulators cannot receive push notifications
  if (!Device.isDevice) return;

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'savry',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c7ef48',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });
    const token = tokenData.data;

    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (e) {
    // Token fetch failed — non-fatal
    if (__DEV__) console.warn('[savry] Failed to get push token:', e);
  }
}

/**
 * Configure how notifications are presented while the app is in the foreground.
 * Call once at app startup.
 */
export function configureForegroundNotifications(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
