import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import type { Assignment, AssignmentStatus } from '@/types';
import {
  formatCompensation,
  formatScheduleRange,
  formatTimeRange,
  getEmployerName,
  getStatusLabel,
  isAssignmentUpcoming,
} from '@/utils/formatJob';

function statusLabel(assignment: Assignment): string {
  if (assignment.status === 'COMPLETED') {
    return 'COMPLETED';
  }
  if (assignment.status === 'CANCELLED') {
    return 'CANCELLED';
  }
  return isAssignmentUpcoming(assignment.job) ? 'UPCOMING' : 'ACTIVE';
}

function statusVariant(status: string): 'brand' | 'success' | 'warning' | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'brand';
    case 'UPCOMING':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    default:
      return 'default';
  }
}

interface AssignmentCardProps {
  assignment: Assignment;
  onPress: () => void;
}

export function AssignmentCard({ assignment, onPress }: AssignmentCardProps) {
  const label = statusLabel(assignment);
  const job = assignment.job;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card} variant={label === 'COMPLETED' ? 'default' : 'elevated'}>
        <View style={styles.headerRow}>
          <Text variant="headingMd" color="primary">
            {job.title}
          </Text>
          <Badge label={getStatusLabel(label)} variant={statusVariant(label)} />
        </View>
        <Text variant="bodyMd" color="secondary">
          {getEmployerName(job.employer)}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {formatScheduleRange(job.schedule)}
          {formatTimeRange(job.schedule) ? ` · ${formatTimeRange(job.schedule)}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <MapPin size={14} color={colors.text.muted} />
          <Text variant="bodyMd" color="secondary">
            {job.location.city}
          </Text>
        </View>
        <Text variant="headingMd" color="primary" style={styles.pay}>
          {formatCompensation(job.compensation)}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pay: {
    marginTop: spacing.sm,
  },
});
