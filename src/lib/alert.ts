import { Alert, Platform } from 'react-native';

/**
 * React Native's Alert.alert is a no-op on web, so use the browser's
 * native alert there. Keeps popups working on every platform.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Onay dugmesini kirmizi goster: geri alinamayan islemler icin. */
  destructive?: boolean;
}

/** Cross-platform confirm dialog. Resolves true if the user confirms. */
export function confirmAsync(
  title: string,
  message: string,
  { confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false }: ConfirmOptions = {},
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
