import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, radius, sizes } from '@/constants/theme';

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: LucideIcon;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  size = sizes.iconMd,
  color = colors.text.secondary,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <Icon size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    backgroundColor: colors.surface.sunken,
  },
  disabled: {
    opacity: 0.4,
  },
});
