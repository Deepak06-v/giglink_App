import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

export function JobCardSkeleton() {
  return (
    <Card style={styles.card}>
      <View style={[styles.line, styles.short]} />
      <View style={[styles.line, styles.title]} />
      <View style={[styles.line, styles.medium]} />
      <View style={[styles.line, styles.long]} />
      <View style={[styles.line, styles.pay]} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.elevated,
  },
  short: {
    width: '30%',
  },
  title: {
    width: '75%',
    height: 18,
  },
  medium: {
    width: '55%',
  },
  long: {
    width: '90%',
  },
  pay: {
    width: '40%',
    height: 16,
    marginTop: spacing.sm,
  },
});
