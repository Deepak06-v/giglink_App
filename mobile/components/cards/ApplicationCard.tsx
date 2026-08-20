import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { Application, ApplicationStatus } from '@/types';
import {
  formatAppliedDate,
  formatCompensation,
  formatScheduleRange,
  getEmployerName,
  getStatusLabel,
} from '@/utils/formatJob';

function statusVariant(status: ApplicationStatus): 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

interface ApplicationCardProps {
  application: Application;
  onPress: () => void;
}

export function ApplicationCard({ application, onPress }: ApplicationCardProps) {
  const { t } = useTranslation();
  const job = typeof application.job === 'string' ? null : application.job;

  if (!job) {
    return null;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text variant="headingMd" color="primary">
            {job.title}
          </Text>
          <Badge label={getStatusLabel(application.status)} variant={statusVariant(application.status)} />
        </View>
        <Text variant="bodyMd" color="secondary">
          {getEmployerName(job.employer)}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {formatScheduleRange(job.schedule)}
        </Text>
        <Text variant="caption" color="muted">
          {t('application.appliedOn', { date: formatAppliedDate(application.appliedAt) })}
        </Text>
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
  pay: {
    marginTop: spacing.sm,
  },
});
