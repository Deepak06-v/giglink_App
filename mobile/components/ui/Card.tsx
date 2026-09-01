import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/constants/theme';

export type CardVariant = 'default' | 'elevated';

export interface CardProps {
  children?: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.base, variant === 'elevated' ? styles.elevated : styles.default, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  default: {
    backgroundColor: colors.surface.card,
  },
  elevated: {
    backgroundColor: colors.surface.elevated,
    ...shadows.elevated,
  },
});
