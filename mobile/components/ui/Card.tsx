import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/constants/theme';

export type CardVariant = 'default' | 'elevated' | 'tonal';

export interface CardProps {
  children?: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  /** Remove the default horizontal/vertical padding (for custom inner layouts). */
  unpadded?: boolean;
}

export function Card({ children, variant = 'default', unpadded = false, style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' ? styles.elevated : variant === 'tonal' ? styles.tonal : styles.default,
        unpadded && styles.unpadded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
  default: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.surface.elevated,
    ...shadows.elevated,
    padding: spacing.lg,
  },
  tonal: {
    backgroundColor: colors.surface.sunken,
    padding: spacing.lg,
  },
  unpadded: {
    padding: 0,
  },
});
