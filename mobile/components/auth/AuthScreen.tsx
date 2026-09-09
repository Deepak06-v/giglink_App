import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { AuthModeTabs, type AuthMode } from '@/components/auth/AuthModeTabs';
import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { Button, Divider, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getGoogleIdToken } from '@/lib/googleSignIn';
import { translate, useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import type { User } from '@/types/auth';
import { resolvePendingIntentRoute } from '@/utils/routing';
import { resolvePostAuthRoute } from '@/utils/onboarding';

interface AuthScreenProps {
  mode: AuthMode;
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const { t } = useTranslation();
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const googleAuthenticate = useAuthStore((state) => state.googleAuthenticate);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [tab, setTab] = useState<AuthMode>(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSignIn = tab === 'signin';

  const switchTab = (next: AuthMode) => {
    if (next === tab) {
      return;
    }
    clearError();
    setTab(next);
  };

  const routeAfterAuth = async (user: User) => {
    const { pendingIntent } = useAuthStore.getState();
    if (pendingIntent) {
      const intentRoute = resolvePendingIntentRoute(pendingIntent, user.role);
      if (intentRoute) {
        router.replace(intentRoute);
        return;
      }
    }
    router.replace(await resolvePostAuthRoute(user));
  };

  const handleSubmit = async () => {
    clearError();

    try {
      if (isSignIn) {
        await login({ email: email.trim(), password, role });
      } else {
        await signup({ name: name.trim(), email: email.trim(), password, role });
      }
      const { user } = useAuthStore.getState();
      if (user) {
        await routeAfterAuth(user);
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
      await routeAfterAuth(user);
    } catch (err) {
      let message = translate('auth.unableGoogle');
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          message = translate('auth.googlePlayUnavailable');
        } else if (
          err.code === statusCodes.SIGN_IN_REQUIRED ||
          err.code === statusCodes.SIGN_IN_CANCELLED
        ) {
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

  const handleContinueWithPhone = () => {
    clearError();
    router.push({
      pathname: '/(auth)/phone',
      params: { mode: tab },
    } as unknown as Href);
  };

  return (
    <AuthShell
      title={isSignIn ? t('auth.welcomeBack') : t('auth.createAccount')}
      subtitle={isSignIn ? t('auth.loginSubtitle') : t('auth.joinSubtitle')}
    >
      <AuthModeTabs
        value={tab}
        onChange={switchTab}
        disabled={isLoading || googleLoading}
      />

      {isSignIn ? (
        <>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={(value) => {
              clearError();
              setEmail(value);
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t('auth.emailPlaceholder')}
            editable={!isLoading && !googleLoading}
          />
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={(value) => {
              clearError();
              setPassword(value);
            }}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            placeholder={t('auth.passwordPlaceholder')}
            editable={!isLoading && !googleLoading}
          />
        </>
      ) : (
        <>
          <Input
            label={t('auth.fullName')}
            value={name}
            onChangeText={(value) => {
              clearError();
              setName(value);
            }}
            autoComplete="name"
            textContentType="name"
            placeholder={t('auth.namePlaceholder')}
            editable={!isLoading && !googleLoading}
          />
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={(value) => {
              clearError();
              setEmail(value);
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t('auth.emailPlaceholder')}
            editable={!isLoading && !googleLoading}
          />
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={(value) => {
              clearError();
              setPassword(value);
            }}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={t('auth.passwordHint')}
            editable={!isLoading && !googleLoading}
          />
        </>
      )}

      <RoleSelector value={role} onChange={setRole} disabled={isLoading || googleLoading} />

      {error ? (
        <Text variant="bodyMd" color="error">
          {error}
        </Text>
      ) : null}

      <Button
        label={
          isLoading
            ? isSignIn
              ? t('auth.signingIn')
              : t('auth.creatingAccount')
            : isSignIn
              ? t('auth.signIn')
              : t('auth.createAccountButton')
        }
        onPress={() => void handleSubmit()}
        loading={isLoading}
        fullWidth
      />

      <Divider />

      <View style={styles.buttonStack}>
        <Button
          variant="secondary"
          label={googleLoading ? t('auth.connectingGoogle') : t('auth.continueWithGoogle')}
          onPress={() => void handleGoogle()}
          loading={googleLoading}
          disabled
          fullWidth
        />
        <Button
          variant="secondary"
          label={t('auth.continueWithPhone')}
          onPress={handleContinueWithPhone}
          disabled={isLoading || googleLoading}
          fullWidth
        />
        <Button
          variant="ghost"
          label={t('auth.continueAsGuest')}
          onPress={() => void handleContinueAsGuest()}
          disabled={isLoading || googleLoading}
          fullWidth
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  buttonStack: {
    gap: spacing.md,
  },
});