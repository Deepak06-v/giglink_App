import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Bell } from '@/components/icons';
import { IconButton, Text } from '@/components/ui';
import { useFontFamily } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { useNotificationStore } from '@/store/notificationStore';
import { getGreeting } from '@/utils/formatJob';

interface WorkerHeaderProps {
  name?: string;
  subtitle?: string;
  onNotificationsPress?: () => void;
}

export function WorkerHeader({ name, subtitle, onNotificationsPress }: WorkerHeaderProps) {
  const { t } = useTranslation();
  const fontFamily = useFontFamily(700);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);

  useFocusEffect(
    useCallback(() => {
      void fetchUnreadCount();
    }, [fetchUnreadCount]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text variant="headingLg" color="primary">
          {getGreeting(name)}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {subtitle ?? t('home.findNextGig')}
        </Text>
      </View>
      <View>
        <IconButton
          icon={Bell}
          accessibilityLabel={t('common.notifications')}
          onPress={onNotificationsPress}
        />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text variant="caption" color="inverse" style={[styles.badgeText, { fontFamily }]}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
