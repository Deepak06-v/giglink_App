import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { ChevronRight } from '@/components/icons';
import { Text } from '@/components/ui/Text';
import { colors, radius, sizes, spacing } from '@/constants/theme';

export interface StatRowProps extends Omit<PressableProps, 'children'> {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
  showChevron?: boolean;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mobile-native list row that replaces dashboard-style KPI cards.
 * Icon + title (+ subtitle) on the left, value/right slot and optional
 * chevron on the right. Fully tappable when onPress is provided.
 */
export function StatRow({
  title,
  subtitle,
  value,
  icon: Icon,
  iconColor = colors.text.secondary,
  iconBackground = colors.surface.sunken,
  showChevron = false,
  right,
  disabled,
  style,
  accessibilityLabel,
  ...props
}: StatRowProps) {
  const isButton = typeof props.onPress === 'function';

  const row = (
    <View style={[styles.wrapper, style]}>
      <View style={styles.content}>
        {Icon ? (
          <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
            <Icon size={sizes.iconMd} color={iconColor} strokeWidth={2} />
          </View>
        ) : null}
        <View style={styles.textBlock}>
          <Text variant="bodyLg" color="primary" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.trailing}>
        {right ?? (value !== undefined && value !== null ? (
          <Text variant="bodyLg" color="secondary">
            {value}
          </Text>
        ) : null)}
        {showChevron || isButton ? <ChevronRight size={sizes.iconMd} color={colors.text.muted} /> : null}
      </View>
    </View>
  );

  if (isButton) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        style={({ pressed }) => [pressed && styles.pressed, style]}
        {...props}
      >
        {row}
      </Pressable>
    );
  }

  return row;
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  iconCircle: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
