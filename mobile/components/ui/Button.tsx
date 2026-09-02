import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { useFontFamily } from '@/constants/fonts';
import { Text } from '@/components/ui/Text';
import { colors, radius, sizes, spacing } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const fontFamily = useFontFamily(700);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.text.onBrand : colors.brand.primary}
          size="small"
        />
      ) : (
        <Text
          variant={size === 'sm' ? 'label' : 'bodyLg'}
          color={labelColorMap[variant]}
          style={[styles.label, { fontFamily }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const labelColorMap: Record<ButtonVariant, 'onBrand' | 'primary' | 'brand' | 'error'> = {
  primary: 'onBrand',
  secondary: 'primary',
  destructive: 'error',
  ghost: 'brand',
};

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.buttonHeight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    letterSpacing: 0.2,
  },
});

const sizeStyles = StyleSheet.create({
  md: {
    minHeight: sizes.buttonHeight,
  },
  sm: {
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.lg,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.brand.primary,
  },
  secondary: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  destructive: {
    backgroundColor: colors.semanticTint.error,
    borderWidth: 1,
    borderColor: colors.semantic.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});
