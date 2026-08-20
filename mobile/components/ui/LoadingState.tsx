import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  const { t } = useTranslation();
  const resolvedMessage = message ?? t('common.loading');
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={resolvedMessage}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text variant="bodyMd" color="secondary" style={styles.message}>
        {resolvedMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  message: {
    textAlign: 'center',
  },
});
