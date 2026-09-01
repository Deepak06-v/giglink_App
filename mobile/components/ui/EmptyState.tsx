import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { StateIllustration, type StateVariant } from '@/components/ui/StateIllustration';
import { spacing } from '@/constants/theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
  state?: StateVariant;
  illustration?: ReactNode;
}

export function EmptyState({ title, message, action, state, illustration }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="text">
      {illustration ?? (state ? <StateIllustration state={state} /> : null)}
      <View style={styles.textBlock}>
        <Text variant="headingMd" color="primary" align="center">
          {title}
        </Text>
        {message ? (
          <Text variant="bodyMd" color="secondary" align="center" style={styles.message}>
            {message}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
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
  textBlock: {
    gap: spacing.xs,
  },
  message: {
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
