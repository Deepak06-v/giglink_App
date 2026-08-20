import type { TextProps as RNTextProps, TextStyle } from 'react-native';
import { Text as RNText, StyleSheet } from 'react-native';

import { useTypography } from '@/constants/fonts';
import { colors } from '@/constants/theme';

export type TextVariant = 'headingXl' | 'headingLg' | 'headingMd' | 'bodyLg' | 'bodyMd' | 'label' | 'caption';

export type TextColor = 'primary' | 'secondary' | 'muted' | 'brand' | 'success' | 'warning' | 'error' | 'inverse';

const colorMap: Record<TextColor, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
  brand: colors.brand.primary,
  success: colors.semantic.success,
  warning: colors.semantic.warning,
  error: colors.semantic.error,
  inverse: colors.text.inverse,
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: TextStyle['textAlign'];
}

export function Text({
  variant = 'bodyMd',
  color = 'primary',
  align,
  style,
  ...props
}: TextProps) {
  const typography = useTypography();
  return (
    <RNText
      style={[
        typography[variant],
        { color: colorMap[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...props}
    />
  );
}

export const textStyles = StyleSheet.create({
  center: { textAlign: 'center' },
});
