import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { Button, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import * as authApi from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import { getRoleHomeRoute, resolvePendingIntentRoute } from '@/utils/routing';

const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string; country?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const country = typeof params.country === 'string' ? params.country : 'IN';

  const phoneAuthenticate = useAuthStore((state) => state.phoneAuthenticate);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const id = setInterval(() => setCountdown((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleVerify = async () => {
    clearError();
    setResendMessage(null);

    try {
      const user = await phoneAuthenticate({ phone, country, code, role, name });
      const pendingIntent = useAuthStore.getState().pendingIntent;
      if (pendingIntent) {
        const intentRoute = resolvePendingIntentRoute(pendingIntent, user.role);
        if (intentRoute) {
          router.replace(intentRoute);
          return;
        }
      }
      router.replace(getRoleHomeRoute(user.role));
    } catch {
      // Error state is handled in the store.
    }
  };

  const handleResend = async () => {
    clearError();
    setResendMessage(null);

    try {
      await authApi.sendPhoneOtp({ phone, country });
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setResendMessage('A new code has been sent.');
    } catch (err) {
      setResendMessage(getApiErrorMessage(err, 'Unable to resend code'));
    }
  };

  return (
    <AuthShell title="Enter code" subtitle="Enter the 6-digit code we texted you">
      <View style={styles.backRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => router.back()}
        >
          <Text variant="bodyMd" color="brand">
            Back
          </Text>
        </Pressable>
      </View>

      <Input
        label="Code"
        value={code}
        onChangeText={(value) => {
          clearError();
          setCode(value.replace(/[^\d]/g, '').slice(0, 6));
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        editable={!isLoading}
      />

      <View style={styles.resendRow}>
        {countdown > 0 ? (
          <Text variant="bodyMd" color="secondary">
            Resend code in {countdown}s
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => void handleResend()}
          >
            <Text variant="bodyMd" color="brand">
              Resend code
            </Text>
          </Pressable>
        )}
      </View>

      {resendMessage ? (
        <Text variant="bodyMd" color="secondary">
          {resendMessage}
        </Text>
      ) : null}

      {error ? (
        <Text variant="bodyMd" color="error">
          {error}
        </Text>
      ) : null}

      <View style={styles.newAccountBlock}>
        <Text variant="label" color="secondary">
          New to GigLink?
        </Text>
        <Text variant="caption" color="muted">
          Only used when this phone number creates a new account.
        </Text>
      </View>

      <Input
        label="Full name"
        value={name}
        onChangeText={(value) => {
          clearError();
          setName(value);
        }}
        autoCapitalize="words"
        textContentType="name"
        placeholder="Your name"
        editable={!isLoading}
      />

      <RoleSelector value={role} onChange={setRole} disabled={isLoading} />

      <Button
        label={isLoading ? 'Verifying...' : 'Verify & Continue'}
        onPress={() => void handleVerify()}
        loading={isLoading}
        disabled={!phone || code.length !== 6}
        fullWidth
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  backRow: {
    alignItems: 'flex-start',
  },
  resendRow: {
    alignItems: 'center',
  },
  newAccountBlock: {
    gap: spacing.xs,
  },
});
