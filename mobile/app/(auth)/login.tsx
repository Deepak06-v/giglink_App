import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { Button, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getGoogleIdToken } from '@/lib/googleSignIn';
import { translate, useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import { getRoleHomeRoute, resolvePendingIntentRoute } from '@/utils/routing';

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuthStore((state) => state.login);
  const googleAuthenticate = useAuthStore((state) => state.googleAuthenticate);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    clearError();

    try {
      await login({ email: email.trim(), password, role });
      const { user, pendingIntent } = useAuthStore.getState();
      if (pendingIntent && user) {
        const intentRoute = resolvePendingIntentRoute(pendingIntent, user.role);
        if (intentRoute) {
          router.replace(intentRoute);
          return;
        }
      }
      if (user) {
        router.replace(getRoleHomeRoute(user.role));
      }
    } catch {
      // Error state is handled in the store.
    }
  };

  const handleGoogle = async () => {
    clearError();
    setGoogleLoading(true);

    try {
      const result = await getGoogleIdToken();
      if (!result) {
        return;
      }
      const user = await googleAuthenticate({ idToken: result.idToken, role });
      const { pendingIntent } = useAuthStore.getState();
      if (pendingIntent) {
        const intentRoute = resolvePendingIntentRoute(pendingIntent, user.role);
        if (intentRoute) {
          router.replace(intentRoute);
          return;
        }
      }
      router.replace(getRoleHomeRoute(user.role));
    } catch (err) {
      let message = translate('auth.unableGoogle');
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          message = translate('auth.googlePlayUnavailable');
        } else if (err.code === statusCodes.SIGN_IN_REQUIRED || err.code === statusCodes.SIGN_IN_CANCELLED) {
          message = translate('auth.googleCancelled');
        }
      } else {
        message = getApiErrorMessage(err, translate('auth.unableGoogle'));
      }
      useAuthStore.setState({ error: message });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    clearError();
    useAuthStore.getState().clearPendingIntent();
    await useAuthStore.getState().setGuestMode(true);
    router.replace('/(public)');
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to GigLink">
      <Input
        label="Email"
        value={email}
        onChangeText={(value) => {
          clearError();
          setEmail(value);
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
        editable={!isLoading}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={(value) => {
          clearError();
          setPassword(value);
        }}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        placeholder="Your password"
        editable={!isLoading}
      />

      <RoleSelector value={role} onChange={setRole} disabled={isLoading} />

      {error ? (
        <Text variant="bodyMd" color="error">
          {error}
        </Text>
      ) : null}

      <Button
        label={isLoading ? 'Signing in...' : 'Sign In'}
        onPress={() => void handleLogin()}
        loading={isLoading}
        fullWidth
      />

      <View style={styles.googleRow}>
        <Button
          disabled={true}
          variant="ghost"
          label="Continue with Google"
        />
      </View>

      <View style={styles.phoneRow}>
        <Link href={'/(auth)/phone' as Href} asChild>
          <Pressable accessibilityRole="link" disabled={isLoading}>
            <Text variant="bodyMd" color="brand">
              Continue with phone
            </Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.guestRow}>
        <Button
          disabled={isLoading}
          variant="secondary"
          label="Continue as guest"
          onPress={handleContinueAsGuest}
        />
      </View>

      <View style={styles.footer}>
        <Text variant="bodyMd" color="secondary">
          New to GigLink?
        </Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable accessibilityRole="link" disabled={isLoading}>
            <Text variant="bodyMd" color="brand">
              Create account
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  googleRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  phoneRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  guestRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
