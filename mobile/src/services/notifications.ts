import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission, grabs an Expo push token, and registers it with the
 * server. Returns null (instead of throwing) whenever push isn't actually
 * available — no physical device/emulator with Google Play services, no
 * EAS projectId configured, or the web preview, where none of this exists —
 * so callers can show "push unavailable here" instead of crashing the app.
 */
export async function setupPushNotifications(token: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const pushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await registerPushToken(token, pushToken.data, Platform.OS);
    return pushToken.data;
  } catch (error) {
    console.warn('[notifications] push setup unavailable:', error);
    return null;
  }
}
