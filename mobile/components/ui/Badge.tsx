import { StyleSheet, View } from 'react-native';

import { useFontFamily } from '@/constants/fonts';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/constants/theme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'brand';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<
  BadgeVariant,
  { background: string; text: 'secondary' | 'success' | 'warning' | 'error' | 'brand' }
> = {
  default: { background: colors.surface.sunken, text: 'secondary' },
  success: { background: colors.semanticTint.success, text: 'success' },
  warning: { background: colors.semanticTint.warning, text: 'warning' },
  error: { background: colors.semanticTint.error, text: 'error' },
  brand: { background: colors.brand.soft, text: 'brand' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const palette = variantStyles[variant];
  const fontFamily = useFontFamily(600);

  return (
    <View style={[styles.base, { backgroundColor: palette.background }]}>
      <Text variant="caption" color={palette.text} style={[styles.label, { fontFamily }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    letterSpacing: 0.1,
  },
});
