import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  NotoSansKannada_400Regular,
  NotoSansKannada_500Medium,
  NotoSansKannada_600SemiBold,
  NotoSansKannada_700Bold,
} from '@expo-google-fonts/noto-sans-kannada';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import 'react-native-reanimated';
import { getMessaging, getToken, onTokenRefresh, requestPermission } from '@react-native-firebase/messaging';

import { AuthBootstrap } from '@/components/auth/AuthGuards';
import { NotificationLifecycle } from '@/components/notifications/NotificationLifecycle';
import { colors } from '@/constants/theme';
import { registerFcmToken, registerStoredFcmToken } from '@/lib/notifications/registration';
import { useAuthStore } from '@/store/authStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    NotoSansKannada_400Regular,
    NotoSansKannada_500Medium,
    NotoSansKannada_600SemiBold,
    NotoSansKannada_700Bold,
  });

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let unsubscribe: (() => void) | undefined;
    
    try {
      const messagingInstance = getMessaging();

      requestPermission(messagingInstance)
        .then((authStatus: any) => {
          const enabled =
            authStatus === 1 || // AUTHORIZED
            authStatus === 2;   // PROVISIONAL
          if (enabled) {
            console.log('[FCM] Notification permission granted');
            getToken(messagingInstance)
              .then((token: string) => {
                console.log(`[FCM] Registration token obtained: SUCCESS (length: ${token ? token.length : 0})`);
                // Persist + register only when an authenticated session is active.
                void registerFcmToken(token, useAuthStore.getState().isAuthenticated);
              })
              .catch((err: any) => {
                console.error('[FCM] Failed to get registration token:', err);
              });

            // Listen to token refresh
            unsubscribe = onTokenRefresh(messagingInstance, (token: string) => {
              console.log(`[FCM] Token refreshed: SUCCESS (length: ${token ? token.length : 0})`);
              void registerFcmToken(token, useAuthStore.getState().isAuthenticated);
            });
          } else {
            console.log('[FCM] Notification permission denied');
          }
        })
        .catch((err: any) => {
          console.error('[FCM] Permission request failed:', err);
        });
    } catch (e: any) {
      console.error('[FCM] Failed to initialize Messaging instance:', e.message);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Once an authenticated session is available, register any FCM token that
  // was obtained earlier (cold start, guest mode, token pending auth).
  useEffect(() => {
    if (isAuthenticated) {
      void registerStoredFcmToken();
    }
  }, [isAuthenticated]);

  if (!fontsLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <AuthBootstrap>
      <StatusBar style="dark" />
      <NotificationLifecycle />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          animation: 'fade',
        }}
      />
    </AuthBootstrap>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
