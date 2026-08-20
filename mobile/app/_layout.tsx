import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
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
import { NotificationLifecycle } from '@/components/notifications/NotificationLifecycle';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansKannada_400Regular,
    NotoSansKannada_500Medium,
    NotoSansKannada_600SemiBold,
    NotoSansKannada_700Bold,
  });

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
      <StatusBar style="light" />
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
