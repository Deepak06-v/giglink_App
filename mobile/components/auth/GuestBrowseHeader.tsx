import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useTranslation } from '@/lib/i18n';
import { getGreeting } from '@/utils/formatJob';
import { employerCreateJobRoute } from '@/utils/routing';

export function GuestBrowseHeader() {
  const { t } = useTranslation();
  const handlePostJob = useProtectedAction(
    { action: 'createJob' },
    { requiredRole: 'employer', onAuthorized: () => router.push(employerCreateJobRoute()) },
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.textBlock}>
          <Text variant="label" color="brand">
            {t('auth.browsingAsGuest')}
          </Text>
          <Text variant="headingLg" color="primary">
            {getGreeting()}
          </Text>
          <Text variant="bodyMd" color="secondary">
            {t('guest.findNextGig')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/login')}
          style={({ pressed }) => [styles.signIn, pressed && styles.signInPressed]}
        >
          <Text variant="bodyMd" color="brand">
            {t('home.signIn')}
          </Text>
        </Pressable>
      </View>
      <Button
        label={t('auth.postJob')}
        variant="secondary"
        fullWidth
        onPress={handlePostJob}
        accessibilityHint={t('auth.postJobHint')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  signIn: {
    paddingVertical: spacing.xs,
  },
  signInPressed: {
    opacity: 0.7,
  },
});