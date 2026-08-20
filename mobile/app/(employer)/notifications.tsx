import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, FileText, Briefcase } from '@/components/icons';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, Card, EmptyState, ErrorState, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/api/notifications';
import type { Notification } from '@/types';
import {
  employerApplicationDetailsRoute,
  employerJobDetailsRoute,
} from '@/utils/routing';

const PAGE_SIZE = 20;

function relativeTime(value: string): string {
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 0) {
    return '';
  }
  if (seconds < 60) {
    return 'Just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString('en-IN');
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadNotifications = useCallback(
    async (pageNum: number, mode: 'initial' | 'refresh' | 'more') => {
      const requestId = ++requestIdRef.current;

      if (mode === 'initial') {
        setLoading(true);
        setError(null);
      } else if (mode === 'refresh') {
        setRefreshing(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await getNotifications(pageNum, PAGE_SIZE);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setNotifications((current) => (pageNum === 1 ? result.notifications : [...current, ...result.notifications]));
        setPage(result.pagination.page);
        setTotalPages(result.pagination.pages);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (pageNum === 1) {
          setNotifications([]);
          setError(getApiErrorMessage(err, 'Unable to load notifications'));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadNotifications(1, 'initial');
  }, [loadNotifications]);

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || page >= totalPages) {
      return;
    }
    void loadNotifications(page + 1, 'more');
  };

  const handleMarkAll = () => {
    void (async () => {
      setMarkingAll(true);
      try {
        await markAllNotificationsAsRead();
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      } catch {
        // Best-effort — silently ignore.
      } finally {
        setMarkingAll(false);
      }
    })();
  };

  const handlePress = (notification: Notification) => {
    void (async () => {
      if (!notification.isRead) {
        try {
          await markNotificationAsRead(notification._id);
        } catch {
          // Best-effort; navigation still proceeds.
        }
        setNotifications((current) =>
          current.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item)),
        );
      }

      if (notification.relatedApplication) {
        router.push(employerApplicationDetailsRoute(notification.relatedApplication));
      } else if (notification.relatedJob) {
        router.push(employerJobDetailsRoute(notification.relatedJob));
      }
    })();
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const Icon = item.relatedApplication ? FileText : Briefcase;
    return (
      <Pressable onPress={() => handlePress(item)} accessibilityRole="button">
        <Card style={[styles.card, !item.isRead && styles.cardUnread]}>
          <View style={[styles.icon, !item.isRead && styles.iconUnread]}>
            <Icon size={18} color={colors.brand.primary} />
          </View>
          <View style={styles.textBlock}>
            <Text variant="label" color="primary" numberOfLines={1}>
              {item.title}
            </Text>
            <Text variant="bodyMd" color="secondary">
              {item.message}
            </Text>
            <Text variant="caption" color="muted">
              {relativeTime(item.createdAt)}
            </Text>
          </View>
          {!item.isRead ? <View style={styles.unreadDot} /> : null}
        </Card>
      </Pressable>
    );
  };

  const header = (
    <View style={styles.headerRow}>
      <View>
        <Text variant="headingLg" color="primary">
          Notifications
        </Text>
        <Text variant="bodyMd" color="secondary">
          Updates from your jobs
        </Text>
      </View>
      <Button
        label="Mark all read"
        variant="ghost"
        onPress={handleMarkAll}
        loading={markingAll}
        disabled={notifications.length === 0}
      />
    </View>
  );

  if (error && !loading && notifications.length === 0) {
    return (
      <Screen>
        <DetailHeader title="Notifications" />
        {header}
        <ErrorState message={error} onRetry={() => void loadNotifications(1, 'initial')} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} padded={false}>
      <View style={styles.paddedHeader}>
        <DetailHeader title="Notifications" />
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.skeleton} />
              ))}
            </View>
          ) : (
            <EmptyState title="You're all caught up" message="Notifications about your jobs will appear here." />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.brand.primary} style={styles.footerLoader} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNotifications(1, 'refresh')}
            tintColor={colors.brand.primary}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  paddedHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardUnread: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.surface.elevated,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: {
    backgroundColor: colors.semanticTint.brand,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
    marginTop: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
  skeletonList: {
    gap: spacing.md,
  },
  skeleton: {
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
});