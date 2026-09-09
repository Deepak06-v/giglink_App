import { Pressable, StyleSheet, View } from 'react-native';

import { Star } from '@/components/icons';
import { colors, sizes, spacing } from '@/constants/theme';

interface RatingStarsProps {
  value: number;
  /** Star glyph size in display mode; touch targets stay >= touchTarget. */
  size?: number;
  readonly?: boolean;
  onChange?: (value: number) => void;
}

const STAR_COUNT = 5;

/**
 * Five-star rating control. Read-only by default; pass onChange for an
 * interactive selector with 44pt touch targets.
 */
export function RatingStars({ value, size = 18, readonly = false, onChange }: RatingStarsProps) {
  const interactive = !readonly && typeof onChange === 'function';

  return (
    <View
      style={styles.row}
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={`${value} out of ${STAR_COUNT} stars`}
    >
      {Array.from({ length: STAR_COUNT }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        const star = (
          <Star
            size={interactive ? 36 : size}
            color={filled ? colors.semantic.warning : colors.border.default}
            fill={filled ? colors.semantic.warning : 'transparent'}
            strokeWidth={1.5}
          />
        );

        if (!interactive) {
          return (
            <View key={starValue} style={styles.staticStar}>
              {star}
            </View>
          );
        }

        return (
          <Pressable
            key={starValue}
            onPress={() => onChange?.(starValue)}
            accessibilityRole="button"
            accessibilityLabel={`${starValue} stars`}
            accessibilityState={{ selected: filled }}
            hitSlop={2}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  staticStar: {
    paddingVertical: 2,
  },
  pressable: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
});