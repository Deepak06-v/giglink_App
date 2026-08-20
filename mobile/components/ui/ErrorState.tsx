import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}

export function ErrorState({
  title,
  message,
  onRetry,
  action,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const heading = title ?? t('common.somethingWentWrong');
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.card}>
        <Text variant="headingMd" color="primary" align="center">
          {heading}
        </Text>
        <Text variant="bodyMd" color="secondary" align="center" style={styles.message}>
          {message}
        </Text>
        {onRetry ? (
          <Button label={t('common.tryAgain')} variant="secondary" onPress={onRetry} fullWidth />
        ) : null}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  card: {
    width: '100%',
    gap: spacing.lg,
    backgroundColor: colors.semanticTint.error,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
  },
  message: {
    marginBottom: spacing.sm,
  },
});
