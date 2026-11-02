import type { Compensation, Job, JobDuration, JobEmployer, JobSchedule } from '@/types/jobs';
import { JOB_CATEGORIES } from '@/constants/jobs';
import { translate } from '@/lib/i18n';
import { useLanguageStore, type AppLanguage } from '@/stores/languageStore';

function localeFor(language: AppLanguage): string {
  return language === 'kn' ? 'kn-IN' : 'en-IN';
}

const STATUS_KEYS: Record<string, string> = {
  OPEN: 'status.open',
  DRAFT: 'status.draft',
  FILLED: 'status.filled',
  IN_PROGRESS: 'status.inProgress',
  COMPLETED: 'status.completed',
  CANCELLED: 'status.cancelled',
  PENDING: 'status.pending',
  ACCEPTED: 'status.accepted',
  REJECTED: 'status.rejected',
  UPCOMING: 'status.upcoming',
  ACTIVE: 'status.active',
};

export function getStatusLabel(status: string): string {
  const key = STATUS_KEYS[status];
  return key ? translate(key) : status;
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatJobDate(dateStr?: string): string {
  if (!dateStr) return '';
  return formatDateLabel(dateStr);
}

export function formatJobTime(timeStr?: string): string {
  if (!timeStr) return '';
  return formatTime12h(timeStr);
}

export function formatAppliedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const language = useLanguageStore.getState().language;
  return date.toLocaleDateString(localeFor(language));
}

export function formatTime12h(time24: string): string {
  const [hourPart, minutePart] = time24.split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time24;
  }
  const period = hours >= 12 ? translate('time.pm') : translate('time.am');
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const language = useLanguageStore.getState().language;
  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== currentYear ? { year: 'numeric' } : {}),
  };
  return new Intl.DateTimeFormat(localeFor(language), options).format(date);
}

export function formatScheduleRange(schedule: JobSchedule): string {
  const start = schedule.startDate || schedule.date;
  const end = schedule.endDate || schedule.date || start;

  if (!start) {
    return translate('job.scheduleTbd');
  }

  if (!end || formatDateLabel(start) === formatDateLabel(end)) {
    return formatDateLabel(start);
  }

  return `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
}

export function formatTimeRange(schedule: JobSchedule): string {
  if (!schedule.startTime || !schedule.endTime) {
    return '';
  }
  return `${formatTime12h(schedule.startTime)} – ${formatTime12h(schedule.endTime)}`;
}

export function formatDuration(duration?: JobDuration): string {
  if (!duration) {
    return '';
  }

  const { numberOfDays, hoursPerDay, totalHours } = duration;

  if (numberOfDays <= 1) {
    return `${totalHours} ${translate(totalHours === 1 ? 'time.hour' : 'time.hours')}`;
  }

  return `${numberOfDays} ${translate('time.days')} · ${hoursPerDay} ${translate('time.hoursPerDay')}`;
}

export function formatCompensation(compensation: Compensation): string {
  const language = useLanguageStore.getState().language;
  const amount = new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: compensation.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(compensation.amount);

  if (compensation.type === 'hourly') {
    return `${amount}${translate('time.perHour')}`;
  }

  return `${amount}${translate('time.total')}`;
}

export function getEmployerName(employer: JobEmployer | string | undefined): string {
  const fallback = translate('employerName.fallback') || 'Employer';
  if (!employer) {
    return fallback;
  }
  if (typeof employer === 'string') {
    return fallback;
  }
  return employer.companyName || employer.name || fallback;
}

export function getCategoryLabel(category: string): string {
  const match = JOB_CATEGORIES.find((item) => item.value === category);
  return match ? translate(match.labelKey) : category.replace(/_/g, ' ');
}

export function getJobLocationLine(job: Job): string {
  return `${job.location.city}`;
}

export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const salutationKey =
    hour < 12 ? 'greeting.morning' : hour < 17 ? 'greeting.afternoon' : 'greeting.evening';
  const greeting = translate(salutationKey);
  return name ? `${greeting}, ${name.split(' ')[0]}` : greeting;
}

export function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isAssignmentUpcoming(job: Job): boolean {
  const start = job.schedule?.startDate || job.schedule?.date;
  if (!start) {
    return false;
  }
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDate > today;
}

export function getAssignmentBucket(
  assignment: { status: string; job: Job },
): 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' {
  if (assignment.status === 'COMPLETED') {
    return 'COMPLETED';
  }
  if (assignment.status === 'CANCELLED') {
    return 'CANCELLED';
  }
  return isAssignmentUpcoming(assignment.job) ? 'UPCOMING' : 'ACTIVE';
}
