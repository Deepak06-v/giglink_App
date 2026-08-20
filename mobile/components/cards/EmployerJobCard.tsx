import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Clock, MapPin, Users } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { JobStatus } from '@/types';
import type { Job } from '@/types';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getStatusLabel,
} from '@/utils/formatJob';

export function employerJobStatusVariant(status: JobStatus): BadgeVariant {
  switch (status) {
    case 'OPEN':
      return 'brand';
    case 'FILLED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

export function employerJobStatusLabel(status: JobStatus): string {
  return getStatusLabel(status);
}

interface EmployerJobCardProps {
  job: Job;
  onPress: () => void;
}

export function EmployerJobCard({ job, onPress }: EmployerJobCardProps) {
  const { t } = useTranslation();
  const scheduleLine = formatScheduleRange(job.schedule);
  const timeLine = formatTimeRange(job.schedule);
  const durationLine = formatDuration(job.duration);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text variant="headingMd" color="primary" style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <Badge label={employerJobStatusLabel(job.status)} variant={employerJobStatusVariant(job.status)} />
        </View>

        <View style={styles.metaRow}>
          <MapPin size={14} color={colors.text.muted} />
          <Text variant="bodyMd" color="secondary">
            {job.location.city}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Clock size={14} color={colors.text.muted} />
          <Text variant="bodyMd" color="secondary">
            {scheduleLine}
            {timeLine ? ` · ${timeLine}` : ''}
          </Text>
        </View>

        {durationLine ? (
          <Text variant="caption" color="muted">
            {durationLine}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text variant="headingMd" color="primary">
            {formatCompensation(job.compensation)}
          </Text>
          <View style={styles.ctaRow}>
            <View style={styles.workersRow}>
              <Users size={14} color={colors.text.muted} />
              <Text variant="caption" color="muted">
                {t('job.workersNeeded', { count: job.workersRequired })}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.brand.primary} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});