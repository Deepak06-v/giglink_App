import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radiusValue?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable skeleton block for predictable loading surfaces (cards, list rows,
 * profile, detail). Preserves the approximate layout dimensions of the content
 * it represents to avoid layout jump.
 */
export function Skeleton({ width = '100%', height = 16, radiusValue, style }: SkeletonProps) {
  return (
    <View
      accessibilityLabel="Loading"
      style={[
        styles.base,
        { width, height, borderRadius: radiusValue ?? radius.sm },
        style,
      ]}
    />
  );
}

export interface SkeletonCardProps {
  style?: StyleProp<ViewStyle>;
}

/** A card-shaped skeleton used for list/detail placeholders. */
export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="35%" height={12} />
      <Skeleton width="80%" height={16} style={styles.mt} />
      <Skeleton width="60%" height={12} style={styles.mt} />
      <Skeleton width="90%" height={12} style={styles.mt} />
    </View>
  );
}

export interface SkeletonRowProps {
  style?: StyleProp<ViewStyle>;
}

/** A compact row skeleton (icon circle + two lines). */
export function SkeletonRow({ style }: SkeletonRowProps) {
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={44} height={44} radiusValue={radius.md} />
      <View style={styles.rowText}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="45%" height={12} style={styles.mtSm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.skeleton.base,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
  mt: {
    marginTop: 12,
  },
  mtSm: {
    marginTop: 8,
  },
});
