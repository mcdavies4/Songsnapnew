import { Alert, Platform } from 'react-native';

// react-native-web's Alert is a no-op, so fall back to browser dialogs on web.

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirm(title: string, message: string, confirmText = 'OK', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
