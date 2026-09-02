import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Clock, MapPin } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { JobListItem } from '@/types';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
  getEmployerName,
  getStatusLabel,
} from '@/utils/formatJob';

interface JobCardProps {
  job: JobListItem;
  onPress: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const { t } = useTranslation();
  const scheduleLine = formatScheduleRange(job.schedule);
  const timeLine = formatTimeRange(job.schedule);
  const durationLine = formatDuration(job.duration);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text variant="caption" color="brand">
            {getCategoryLabel(job.category)}
          </Text>
          <View style={styles.badgesRow}>
            <Badge label={getStatusLabel(job.status)} variant={job.status === 'OPEN' ? 'brand' : 'default'} />
          </View>
        </View>

        <Text variant="headingMd" color="primary">
          {job.title}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {getEmployerName(job.employer)}
        </Text>

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
            <Text variant="label" color="brand">
              {t('job.viewDetails')}
            </Text>
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
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    gap: spacing.xs,
  },
});
