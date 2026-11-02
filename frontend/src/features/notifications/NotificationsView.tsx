import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw, Briefcase, FileText, CheckCircle2, Star } from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/api/notifications';
import type { Notification } from '@/types/jobs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useNotificationStore } from '@/stores/notificationStore';
import { useToast } from '@/components/ui/Toast';

export const NotificationsView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const decrementUnread = useNotificationStore((s) => s.decrementUnread);
  const resetUnread = useNotificationStore((s) => s.resetUnread);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await getNotifications(1, 50, unreadOnly ? true : undefined);
      setNotifications(res.notifications || []);
    } catch (err: any) {
      setError(err.message || 'Could not load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      resetUnread();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast({
        title: 'All Caught Up',
        description: 'All notifications marked as read',
        type: 'info',
      });
    } catch {
      // Ignored
    }
  };

  const handleClickNotification = async (item: Notification) => {
    const isUnread = !item.isRead && !item.read;
    if (isUnread) {
      try {
        await markNotificationAsRead(item._id);
        decrementUnread();
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true, read: true } : n))
        );
      } catch {
        // Continue navigation
      }
    }

    // Navigate to related target if available
    const data = item.data || {
      jobId: item.relatedJob,
      applicationId: item.relatedApplication,
      assignmentId: item.relatedAssignment,
    };
    if (data?.jobId) {
      navigate(`/jobs/${data.jobId}`);
    } else if (data?.applicationId) {
      navigate(`/worker/applications/${data.applicationId}`);
    } else if (data?.assignmentId) {
      navigate(`/worker/assignments/${data.assignmentId}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPLICATION_RECEIVED':
      case 'APPLICATION_ACCEPTED':
      case 'APPLICATION_REJECTED':
        return <FileText className="w-4 h-4 text-primary" />;
      case 'ASSIGNMENT_CREATED':
      case 'ASSIGNMENT_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'REVIEW_RECEIVED':
        return <Star className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Notifications</h1>
          <p className="text-xs text-text-secondary mt-0.5">Alerts, updates, and gig activity</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifs(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-2xl bg-white border border-border text-text-secondary hover:text-primary transition-all active:scale-95 shadow-xs"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            !unreadOnly
              ? 'bg-primary text-white shadow-xs shadow-primary/25'
              : 'bg-white border border-border text-text-secondary'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            unreadOnly
              ? 'bg-primary text-white shadow-xs shadow-primary/25'
              : 'bg-white border border-border text-text-secondary'
          }`}
        >
          Unread
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load notifications"
          message={error}
          onRetry={() => fetchNotifs()}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={
            unreadOnly
              ? 'You have no unread notifications.'
              : 'When gig updates, applications, or reviews arrive, you will see them here.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <Card
              key={n._id}
              interactive
              onClick={() => handleClickNotification(n)}
              className={`p-4 transition-all ${
                !n.isRead && !n.read ? 'border-primary/40 bg-primary/2' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-text-primary truncate">
                      {n.title}
                    </h4>
                    {!n.isRead && !n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-text-muted mt-1.5 block">
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
