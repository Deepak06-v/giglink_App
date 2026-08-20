import type { LucideIcon } from '@/components/icons';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileText,
  Inbox,
  Star,
  XCircle,
} from '@/components/icons';

/**
 * Type-based icon mapping for notification list items.
 */
export function getNotificationIcon(type?: string): LucideIcon {
  switch (type) {
    case 'APPLICATION_RECEIVED':
      return FileText;
    case 'APPLICATION_ACCEPTED':
      return CheckCircle2;
    case 'APPLICATION_REJECTED':
      return XCircle;
    case 'APPLICATION_WITHDRAWN':
      return Inbox;
    case 'JOB_FILLED':
      return Briefcase;
    case 'WORKER_COMPLETION_CONFIRMED':
      return ClipboardList;
    case 'EMPLOYER_COMPLETION_CONFIRMED':
      return CheckCircle2;
    case 'JOB_COMPLETED':
      return CheckCircle2;
    case 'REVIEW_RECEIVED':
      return Star;
    default:
      return Bell;
  }
}