import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, User } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { spacing, colors } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { Application, ApplicationStatus, ApplicationWorker } from '@/types';
import { formatAppliedDate, getStatusLabel } from '@/utils/formatJob';
import { translate } from '@/lib/i18n';
import { availabilityMatchBadge } from '@/utils/availabilityMatch';

function statusVariant(status: ApplicationStatus): BadgeVariant {
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

function getWorkerName(worker: string | ApplicationWorker): string {
  if (typeof worker === 'string') {
    return translate('role.worker');
  }
  return worker.name || translate('role.worker');
}

function getWorkerEmail(worker: string | ApplicationWorker): string | null {
  if (typeof worker === 'string') {
    return null;
  }
  return worker.email ?? null;
}

function getWorkerId(worker: string | ApplicationWorker): string | null {
  if (typeof worker === 'string') {
    return null;
  }
  return worker._id ?? null;
}

interface EmployerApplicationCardProps {
  application: Application;
  onPress: () => void;
  onViewProfile?: () => void;
}

export function EmployerApplicationCard({ application, onPress, onViewProfile }: EmployerApplicationCardProps) {
  const { t } = useTranslation();
  const job = typeof application.job === 'string' ? null : application.job;
  const email = getWorkerEmail(application.worker);
  const workerId = getWorkerId(application.worker);
  const matchBadge = availabilityMatchBadge(application.availabilityMatch);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <User size={16} color={colors.text.secondary} />
          </View>
          <View style={styles.textBlock}>
            <Text variant="headingMd" color="primary" numberOfLines={1}>
              {getWorkerName(application.worker)}
            </Text>
            {email ? (
              <Text variant="bodyMd" color="secondary" numberOfLines={1}>
                {email}
              </Text>
            ) : null}
            {job ? (
              <Text variant="caption" color="brand" numberOfLines={1}>
                {job.title}
              </Text>
            ) : null}
          </View>
          <View style={styles.badgesCol}>
            {matchBadge ? <Badge label={t(matchBadge.labelKey)} variant={matchBadge.variant} /> : null}
            <Badge label={getStatusLabel(application.status)} variant={statusVariant(application.status)} />
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text variant="caption" color="muted">
            {t('application.appliedOn', { date: formatAppliedDate(application.appliedAt) })}
          </Text>
          {onViewProfile && workerId ? (
            <Pressable onPress={onViewProfile} accessibilityRole="button" accessibilityLabel="View worker profile">
              <View style={styles.viewProfileRow}>
                <Text variant="label" color="brand">
                  View Profile
                </Text>
                <ChevronRight size={16} color={colors.brand.primary} />
              </View>
            </Pressable>
          ) : (
            <ChevronRight size={16} color={colors.brand.primary} />
          )}
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
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});