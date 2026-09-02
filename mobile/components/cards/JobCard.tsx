import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Clock, MapPin } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
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

function EmployerAvatar({ employment }: { employment: JobListItem['employer'] }) {
  const isObj = typeof employment === 'object' && employment !== null;
  const name = isObj ? employment.companyName || employment.name || '' : '';
  const logo = isObj ? employment.logo : undefined;

  const initials = name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.avatar}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.avatarImage} />
      ) : (
        <Text variant="label" color="brand" style={styles.avatarInitials}>
          {initials}
        </Text>
      )}
    </View>
  );
}

export function JobCard({ job, onPress }: JobCardProps) {
  const { t } = useTranslation();
  const scheduleLine = formatScheduleRange(job.schedule);
  const timeLine = formatTimeRange(job.schedule);
  const durationLine = formatDuration(job.duration);
  const isOpen = job.status === 'OPEN';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.categoryChip}>
            <Text variant="caption" color="brand" style={styles.categoryText}>
              {getCategoryLabel(job.category)}
            </Text>
          </View>
          {!isOpen ? (
            <Badge label={getStatusLabel(job.status)} variant="default" />
          ) : null}
        </View>

        <Text variant="headingMd" color="primary" numberOfLines={2}>
          {job.title}
        </Text>

        <View style={styles.employerRow}>
          <EmployerAvatar employment={job.employer} />
          <Text variant="bodyMd" color="secondary" numberOfLines={1} style={styles.employerName}>
            {getEmployerName(job.employer)}
          </Text>
        </View>

        <View style={styles.metaBlock}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.text.muted} />
            <Text variant="bodySm" color="secondary">
              {job.location.city}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.text.muted} />
            <Text variant="bodySm" color="secondary">
              {scheduleLine}
              {timeLine ? ` · ${timeLine}` : ''}
            </Text>
          </View>
          {durationLine ? (
            <Text variant="caption" color="muted">
              {durationLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          <Text variant="headingLg" color="primary" style={styles.pay}>
            {formatCompensation(job.compensation)}
          </Text>
          <Text variant="label" color="brand">
            {t('job.viewDetails')}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.soft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
  },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 24,
    height: 24,
  },
  avatarInitials: {
    fontSize: 10,
    lineHeight: 14,
  },
  employerName: {
    flex: 1,
  },
  metaBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pay: {
    color: colors.text.primary,
  },
});
