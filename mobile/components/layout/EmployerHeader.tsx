import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Bell } from '@/components/icons';
import { IconButton, Text } from '@/components/ui';
import { useFontFamily } from '@/constants/fonts';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { useNotificationStore } from '@/store/notificationStore';
import { getGreeting } from '@/utils/formatJob';

interface EmployerHeaderProps {
  name?: string;
  subtitle?: string;
  onNotificationsPress?: () => void;
}

export function EmployerHeader({ name, subtitle, onNotificationsPress }: EmployerHeaderProps) {
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
        <Text variant="headingXl" color="primary">
          {getGreeting(name)}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {subtitle ?? t('home.manageGigs')}
        </Text>
      </View>
      <View>
        <IconButton
          icon={Bell}
          accessibilityLabel={t('common.notifications')}
          onPress={onNotificationsPress}
          style={styles.bellButton}
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
  bellButton: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
});