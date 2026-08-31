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
import { useTranslation, translate } from '@/lib/i18n';

const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpScreen() {
  const { t } = useTranslation();
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

  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (verifying) {
      return;
    }
    setVerifying(true);
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
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    clearError();
    setResendMessage(null);

    try {
      await authApi.sendPhoneOtp({ phone, country });
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setResendMessage(t('auth.codeSent'));
    } catch (err) {
      setResendMessage(getApiErrorMessage(err, t('auth.unableResendCode')));
    }
  };

  return (
    <AuthShell title={t('auth.enterCode')} subtitle={t('auth.otpSubtitle')}>
      <View style={styles.backRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => router.back()}
        >
          <Text variant="bodyMd" color="brand">
            {t('common.back')}
          </Text>
        </Pressable>
      </View>

      <Input
        label={t('auth.code')}
        value={code}
        onChangeText={(value) => {
          clearError();
          setCode(value.replace(/[^\d]/g, '').slice(0, 6));
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t('auth.codePlaceholder')}
        editable={!isLoading}
      />

      <View style={styles.resendRow}>
        {countdown > 0 ? (
          <Text variant="bodyMd" color="secondary">
            {t('auth.resendIn', { countdown })}
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => void handleResend()}
          >
            <Text variant="bodyMd" color="brand">
              {t('auth.resendCode')}
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
          {t('auth.newToGigLink')}
        </Text>
        <Text variant="caption" color="muted">
          {t('auth.newAccountNote')}
        </Text>
      </View>

      <Input
        label={t('auth.fullName')}
        value={name}
        onChangeText={(value) => {
          clearError();
          setName(value);
        }}
        autoCapitalize="words"
        textContentType="name"
        placeholder={t('auth.namePlaceholder')}
        editable={!isLoading && !verifying}
      />

      <RoleSelector value={role} onChange={setRole} disabled={isLoading || verifying} />

      <Button
        label={(isLoading || verifying) ? t('auth.verifying') : t('auth.verifyContinue')}
        onPress={() => void handleVerify()}
        loading={isLoading || verifying}
        disabled={!phone || code.length !== 6 || verifying || isLoading}
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
