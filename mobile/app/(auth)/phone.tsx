import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import * as authApi from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useTranslation } from '@/lib/i18n';

interface CountryOption {
  iso: string;
  dialCode: string;
  label: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { iso: 'IN', dialCode: '+91', label: 'India' },
  { iso: 'US', dialCode: '+1', label: 'United States' },
  { iso: 'GB', dialCode: '+44', label: 'United Kingdom' },
  { iso: 'AU', dialCode: '+61', label: 'Australia' },
  { iso: 'AE', dialCode: '+971', label: 'UAE' },
  { iso: 'SG', dialCode: '+65', label: 'Singapore' },
];

export default function PhoneAuthScreen() {
  const { t } = useTranslation();
  const [country, setCountry] = useState<string>('IN');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setError(null);

    if (phone.trim().length < 6) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.sendPhoneOtp({ phone: phone.trim(), country });
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: phone.trim(), country },
      } as unknown as Href);
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.unableSendCode')));
    } finally {
      setIsLoading(false);
    }
  };

  const getCountryLabel = (iso: string, fallback: string) => {
    switch (iso) {
      case 'IN': return t('auth.countryIndia');
      case 'US': return t('auth.countryUS');
      case 'GB': return t('auth.countryUK');
      case 'AU': return t('auth.countryAustralia');
      case 'AE': return t('auth.countryUAE');
      case 'SG': return t('auth.countrySingapore');
      default: return fallback;
    }
  };

  return (
    <AuthShell title={t('auth.continueWithPhone')} subtitle={t('auth.phoneSubtitle')}>
      <View style={styles.backRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => router.back()}
        >
          <Text variant="bodyMd" color="brand">
            {t('auth.backToSignIn')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.countryBlock}>
        <Text variant="label" color="secondary">
          {t('auth.country')}
        </Text>
        <View style={styles.countryRow}>
          {COUNTRY_OPTIONS.map((option) => {
            const selected = option.iso === country;
            return (
              <Pressable
                key={option.iso}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: isLoading }}
                disabled={isLoading}
                onPress={() => {
                  setError(null);
                  setCountry(option.iso);
                }}
                style={({ pressed }) => [
                  styles.countryChip,
                  selected && styles.countryChipSelected,
                  pressed && !isLoading && styles.pressed,
                ]}
              >
                <Text
                  variant="label"
                  color={selected ? 'brand' : 'secondary'}
                >
                  {option.dialCode}
                </Text>
                <Text
                  variant="caption"
                  color={selected ? 'brand' : 'muted'}
                >
                  {getCountryLabel(option.iso, option.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label={t('auth.phoneNumber')}
        value={phone}
        onChangeText={(value) => {
          setError(null);
          setPhone(value.replace(/[^\d\s()-]/g, ''));
        }}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        placeholder={t('auth.phonePlaceholder')}
        editable={!isLoading}
      />

      {error ? (
        <Text variant="bodyMd" color="error">
          {error}
        </Text>
      ) : null}

      <Button
        label={isLoading ? t('auth.sendingCode') : t('auth.sendCode')}
        onPress={() => void handleContinue()}
        loading={isLoading}
        fullWidth
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  backRow: {
    alignItems: 'flex-start',
  },
  countryBlock: {
    gap: spacing.sm,
  },
  countryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  countryChip: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    minWidth: 92,
  },
  countryChipSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.semanticTint.brand,
  },
  pressed: {
    opacity: 0.92,
  },
});
