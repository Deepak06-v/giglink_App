import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFontFamily } from '@/constants/fonts';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/constants/theme';

export type SkillTagVariant = 'default' | 'accent' | 'brand';

export interface SkillTagProps {
  label: string;
  variant?: SkillTagVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<SkillTagVariant, { background: string; text: 'secondary' | 'accent' | 'brand' }> = {
  default: { background: colors.surface.elevated, text: 'secondary' },
  accent: { background: colors.accent.tint, text: 'accent' },
  brand: { background: colors.brand.tint, text: 'brand' },
};

/**
 * Compact chip for skills, requirements, categories, and languages.
 * Non-interactive by default; pass onPress for a selectable/actionable chip.
 */
export function SkillTag({ label, variant = 'default', onPress, accessibilityLabel, style }: SkillTagProps) {
  const palette = VARIANT_STYLES[variant];
  const fontFamily = useFontFamily(500);

  const content = (
    <Text variant="caption" color={palette.text} style={{ fontFamily }}>
      {label}
    </Text>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: palette.background },
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.base, { backgroundColor: palette.background }, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: 220,
  },
  pressed: {
    opacity: 0.8,
  },
});
