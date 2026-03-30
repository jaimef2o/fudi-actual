import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert that works on both native and web.
 * On web, uses window.confirm for destructive/cancel patterns,
 * and window.alert for simple informational alerts.
 */
export function showAlert(
  title: string,
  message: string,
  buttons?: AlertButton[],
) {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length <= 1) {
      // Simple informational alert
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
    } else {
      // Confirm dialog: last non-cancel button is the action
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      const actionBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
      const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
      if (confirmed) {
        actionBtn?.onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}
