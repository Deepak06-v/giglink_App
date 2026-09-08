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
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthBootstrap } from '@/components/auth/AuthGuards';
import { colors } from '@/constants/theme';
import { useNotificationLifecycle } from '@/lib/notifications/useNotificationLifecycle';

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

  useNotificationLifecycle();

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

  if (!fontsLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <AuthBootstrap>
      <StatusBar style="dark" />
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
