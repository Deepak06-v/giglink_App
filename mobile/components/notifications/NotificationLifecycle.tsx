import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/store/authStore';

// Set up how incoming notifications present when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <--- Add this
    shouldShowList: true,   // <--- Add this
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Ensure Android channel is created
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Get project ID safely
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.error('Project ID not found in app config / app.json!');
    return;
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications!');
    return;
  }

  try {
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    console.log(' Success! Real Expo Push Token:', token);
  } catch (e) {
    console.error('Failed to get push token:', e);
  }

  return token;
}

export function NotificationLifecycle() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        // TODO: Pass this token to your API or store (e.g. sync with current logged-in user)
      }
    });
  }, [isAuthenticated]);

  return null; // Silent lifecycle listener component
}