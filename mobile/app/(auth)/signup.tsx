import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { Button, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/lib/i18n';
import type { UserRole } from '@/types';
import { getRoleHomeRoute, resolvePendingIntentRoute } from '@/utils/routing';
import { resolvePostAuthRoute } from '@/utils/onboarding';

export default function SignupScreen() {
  const { t } = useTranslation();
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');

  const handleSignup = async () => {
    clearError();

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      const { user, pendingIntent } = useAuthStore.getState();
      if (pendingIntent && user) {
        const intentRoute = resolvePendingIntentRoute(pendingIntent, user.role);
        if (intentRoute) {
          router.replace(intentRoute);
          return;
        }
      }
      if (user) {
        router.replace(await resolvePostAuthRoute(user));
      }
    } catch {
      // Error state is handled in the store.
    }
  };

  return (
    <AuthShell title={t('auth.createAccount')} subtitle={t('auth.joinSubtitle')}>
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
        editable={!isLoading}
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
        editable={!isLoading}
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
        editable={!isLoading}
      />

      <RoleSelector value={role} onChange={setRole} disabled={isLoading} />

      {error ? (
        <Text variant="bodyMd" color="error">
          {error}
        </Text>
      ) : null}

      <Button
        label={isLoading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
        onPress={() => void handleSignup()}
        loading={isLoading}
        fullWidth
      />

      <View style={styles.footer}>
        <Text variant="bodyMd" color="secondary">
          {t('auth.alreadyHaveAccount')}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="link" disabled={isLoading}>
            <Text variant="bodyMd" color="brand">
              {t('auth.signIn')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
