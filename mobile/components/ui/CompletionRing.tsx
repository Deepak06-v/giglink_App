import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

export interface CompletionRingProps {
  percentage: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Progress ring that displays the REAL profile completion percentage supplied
 * by the existing profile API. It does NOT calculate completion and does NOT
 * imply any verification or trust score — it simply shows progress.
 */
export function CompletionRing({
  percentage,
  label,
  size = 88,
  strokeWidth = 6,
}: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const progress = (clamped / 100) * circumference;
  const offset = circumference - progress;

  const accessibilityLabel = label
    ? `${label} ${clamped}%`
    : `${clamped}% complete`;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface.sunken}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.brand.primary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text variant="headingLg" color="primary" style={styles.value}>
          {Math.round(clamped)}%
        </Text>
        {label ? (
          <Text variant="caption" color="muted" align="center" numberOfLines={2}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  value: {
    fontSize: 20,
    lineHeight: 24,
  },
});
