// Sentry error monitoring
// Install: npx expo install @sentry/react-native
// Then run: npx sentry-wizard -i reactNative --skip-connect

let Sentry: typeof import('@sentry/react-native') | null = null;

try {
  // Dynamic require so the app doesn't crash if Sentry isn't installed yet
  Sentry = require('@sentry/react-native');
} catch {
  // Sentry not installed — monitoring disabled
}

export function initMonitoring() {
  if (!Sentry) return;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    environment: __DEV__ ? 'development' : 'production',
    // Capture 20% of transactions for performance monitoring
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    // Don't send events in development
    enabled: !__DEV__,
    integrations: [
      Sentry.mobileReplayIntegration({ maskAllText: false, maskAllImages: false }),
    ],
  });
}

/**
 * Capture an exception with optional context.
 * Safe to call even if Sentry isn't installed.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!Sentry) {
    console.error('[fudi error]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

/**
 * Log a breadcrumb (user action) for debugging context.
 */
export function addBreadcrumb(message: string, category = 'user', data?: Record<string, unknown>) {
  if (!Sentry) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}

/**
 * Identify the logged-in user for error reports.
 */
export function setMonitoringUser(user: { id: string; name?: string } | null) {
  if (!Sentry) return;
  if (user) {
    Sentry.setUser({ id: user.id, username: user.name });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Wrap a React component with Sentry ErrorBoundary.
 * Falls back to the provided fallback component if Sentry isn't installed.
 */
export function getSentryErrorBoundary() {
  if (!Sentry) return null;
  return Sentry.ErrorBoundary;
}
