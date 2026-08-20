import type { TranslationKey } from '@/lib/i18n';
import type { JobCategory, JobSortOption, CompensationType } from '@/types/jobs';

export const JOB_CATEGORIES: Array<{ value: JobCategory; labelKey: TranslationKey }> = [
  { value: 'EVENT_STAFF', labelKey: 'category.eventStaff' },
  { value: 'CATERING', labelKey: 'category.catering' },
  { value: 'WAREHOUSE', labelKey: 'category.warehouse' },
  { value: 'MOVING', labelKey: 'category.moving' },
  { value: 'DELIVERY_ASSISTANCE', labelKey: 'category.deliveryAssistance' },
  { value: 'CLEANING', labelKey: 'category.cleaning' },
  { value: 'PROMOTIONAL', labelKey: 'category.promotional' },
  { value: 'GENERAL_LABOR', labelKey: 'category.generalLabor' },
  { value: 'OTHER', labelKey: 'category.other' },
];

export const JOB_SORT_OPTIONS: Array<{ value: JobSortOption; labelKey: TranslationKey }> = [
  { value: 'newest', labelKey: 'sort.newest' },
  { value: 'oldest', labelKey: 'sort.oldest' },
  { value: 'pay_high', labelKey: 'sort.payHigh' },
  { value: 'pay_low', labelKey: 'sort.payLow' },
  { value: 'date_soon', labelKey: 'sort.dateSoon' },
  { value: 'date_late', labelKey: 'sort.dateLate' },
];

export const COMPENSATION_TYPES: Array<{ value: CompensationType; labelKey: TranslationKey }> = [
  { value: 'hourly', labelKey: 'compensationType.hourly' },
  { value: 'fixed', labelKey: 'compensationType.fixed' },
];

export const APPLICATION_STATUS_FILTERS: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: 'ALL', labelKey: 'status.all' },
  { value: 'PENDING', labelKey: 'status.pending' },
  { value: 'ACCEPTED', labelKey: 'status.accepted' },
  { value: 'REJECTED', labelKey: 'status.rejected' },
];

export const EMPLOYER_JOB_STATUS_FILTERS: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: 'ALL', labelKey: 'status.all' },
  { value: 'DRAFT', labelKey: 'status.draft' },
  { value: 'OPEN', labelKey: 'status.open' },
  { value: 'FILLED', labelKey: 'status.filled' },
  { value: 'IN_PROGRESS', labelKey: 'status.inProgress' },
  { value: 'COMPLETED', labelKey: 'status.completed' },
  { value: 'CANCELLED', labelKey: 'status.cancelled' },
];

export const ASSIGNMENT_STATUS_FILTERS: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: 'UPCOMING', labelKey: 'status.upcoming' },
  { value: 'ACTIVE', labelKey: 'status.active' },
  { value: 'COMPLETED', labelKey: 'status.completed' },
];

export const DEFAULT_PAGE_SIZE = 20;