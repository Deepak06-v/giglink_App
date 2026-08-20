import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

export function ListCardSkeleton() {
  return (
    <Card style={styles.card}>
      <View style={[styles.line, styles.title]} />
      <View style={[styles.line, styles.medium]} />
      <View style={[styles.line, styles.long]} />
      <View style={[styles.line, styles.short]} />
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
  title: {
    width: '70%',
    height: 18,
  },
  medium: {
    width: '50%',
  },
  long: {
    width: '85%',
  },
  short: {
    width: '35%',
    marginTop: spacing.sm,
  },
});
