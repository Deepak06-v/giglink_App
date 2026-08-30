import type { CompensationType, Job, JobCategory } from '@/types';
import { translate, type TranslationKey } from '@/lib/i18n';

export interface JobFormState {
  title: string;
  description: string;
  category: JobCategory | '';
  workersRequired: string;
  hiringDeadline: string;
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  compensationType: CompensationType;
  compensationAmount: string;
  skills: string;
  experience: string;
  dressCode: string;
  languages: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
}

export interface JobFormPayload {
  title: string;
  description: string;
  category: JobCategory;
  workersRequired: number;
  hiringDeadline?: string;
  schedule: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  };
  compensation: {
    type: CompensationType;
    amount: number;
    currency: string;
  };
  requirements: {
    skills: string[];
    experience: string;
    dressCode: string;
    languages: string[];
  };
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export function emptyJobFormState(): JobFormState {
  return {
    title: '',
    description: '',
    category: '',
    workersRequired: '1',
    hiringDeadline: '',
    scheduleStartDate: '',
    scheduleEndDate: '',
    scheduleStartTime: '',
    scheduleEndTime: '',
    compensationType: 'hourly',
    compensationAmount: '',
    skills: '',
    experience: '',
    dressCode: '',
    languages: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
  };
}

export function toDateInputValue(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function jobFormStateFromJob(job: Job): JobFormState {
  const requirements = job.requirements ?? {};
  return {
    title: job.title,
    description: job.description,
    category: job.category,
    workersRequired: String(job.workersRequired),
    hiringDeadline: job.hiringDeadline ? toDateInputValue(job.hiringDeadline) : '',
    scheduleStartDate: toDateInputValue(job.schedule.startDate),
    scheduleEndDate: toDateInputValue(job.schedule.endDate),
    scheduleStartTime: job.schedule.startTime,
    scheduleEndTime: job.schedule.endTime,
    compensationType: job.compensation.type,
    compensationAmount: String(job.compensation.amount),
    skills: requirements.skills?.join(', ') ?? '',
    experience: requirements.experience ?? '',
    dressCode: requirements.dressCode ?? '',
    languages: requirements.languages?.join(', ') ?? '',
    address: job.location.address,
    city: job.location.city,
    state: job.location.state,
    pincode: job.location.pincode,
    latitude: job.location.coordinates?.latitude != null ? String(job.location.coordinates.latitude) : '',
    longitude: job.location.coordinates?.longitude != null ? String(job.location.coordinates.longitude) : '',
  };
}

export function buildJobPayload(state: JobFormState): JobFormPayload {
  const skills = state.skills
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const languages = state.languages
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const parsedCoordinates = parseCoordinates(state);

  return {
    title: state.title.trim(),
    description: state.description.trim(),
    category: state.category as JobCategory,
    workersRequired: Number(state.workersRequired),
    hiringDeadline: state.hiringDeadline.trim() || undefined,
    schedule: {
      startDate: state.scheduleStartDate.trim(),
      endDate: state.scheduleEndDate.trim(),
      startTime: state.scheduleStartTime.trim(),
      endTime: state.scheduleEndTime.trim(),
    },
    compensation: {
      type: state.compensationType,
      amount: Number(state.compensationAmount),
      currency: 'INR',
    },
    requirements: {
      skills,
      experience: state.experience.trim(),
      dressCode: state.dressCode.trim(),
      languages,
    },
    location: parsedCoordinates
      ? {
          address: state.address.trim(),
          city: state.city.trim(),
          state: state.state.trim(),
          pincode: state.pincode.trim(),
          coordinates: parsedCoordinates,
        }
      : {
          address: state.address.trim(),
          city: state.city.trim(),
          state: state.state.trim(),
          pincode: state.pincode.trim(),
        },
  };
}

function toLocalMidnight(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Mirrors the backend schedule calculation for display purposes only.
 * The backend remains authoritative for stored values.
 */
export function getSchedulePreview(state: JobFormState): {
  numberOfDays: number;
  hoursPerDay: number;
  totalHours: number;
} | null {
  const start = toLocalMidnight(state.scheduleStartDate);
  const end = toLocalMidnight(state.scheduleEndDate);
  if (!start || !end || end < start) {
    return null;
  }
  const numberOfDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

  const startMinutes = timeToMinutes(state.scheduleStartTime);
  const endMinutes = timeToMinutes(state.scheduleEndTime);
  if (startMinutes === null || endMinutes === null) {
    return null;
  }
  const durationMinutes = endMinutes <= startMinutes ? 1440 - startMinutes + endMinutes : endMinutes - startMinutes;
  const hoursPerDay = durationMinutes / 60;

  return {
    numberOfDays,
    hoursPerDay,
    totalHours: numberOfDays * hoursPerDay,
  };
}

export function parseCoordinates(state: JobFormState): { latitude: number; longitude: number } | null {
  const latitude = Number(state.latitude);
  const longitude = Number(state.longitude);
  if (
    !state.latitude.trim() ||
    !state.longitude.trim() ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{1,2}:\d{2}$/;

export function isValidTime(time: string): boolean {
  if (!TIME_PATTERN.test(time.trim())) {
    return false;
  }
  return timeToMinutes(time) !== null;
}

export function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value.trim()) && toLocalMidnight(value) !== null;
}

export interface StepValidation {
  valid: boolean;
  errors: string[];
}

export function validateStep(state: JobFormState, step: number): StepValidation {
  const errors: string[] = [];
  const push = (key: TranslationKey) => errors.push(translate(key));

  switch (step) {
    case 0:
      if (!state.title.trim()) {
        push('jobForm.errorTitleRequired');
      }
      if (!state.description.trim()) {
        push('jobForm.errorDescriptionRequired');
      }
      if (!state.category) {
        push('jobForm.errorCategoryRequired');
      }
      if (!state.workersRequired.trim() || Number(state.workersRequired) < 1) {
        push('jobForm.errorWorkersMinimum');
      }
      if (state.hiringDeadline.trim() && !isValidDate(state.hiringDeadline)) {
        push('jobForm.errorDeadlineInvalid');
      }
      break;

    case 1:
      if (!isValidDate(state.scheduleStartDate)) {
        push('jobForm.errorStartDateRequired');
      }
      if (!isValidDate(state.scheduleEndDate)) {
        push('jobForm.errorEndDateRequired');
      }
      if (!isValidTime(state.scheduleStartTime)) {
        push('jobForm.errorStartTimeRequired');
      }
      if (!isValidTime(state.scheduleEndTime)) {
        push('jobForm.errorEndTimeRequired');
      }
      if (isValidDate(state.scheduleStartDate) && isValidDate(state.scheduleEndDate)) {
        const start = toLocalMidnight(state.scheduleStartDate);
        const end = toLocalMidnight(state.scheduleEndDate);
        if (start && end && end < start) {
          push('jobForm.errorEndBeforeStart');
        }
      }
      break;

    case 2:
      if (!state.compensationAmount.trim() || Number(state.compensationAmount) < 0) {
        push('jobForm.errorAmountInvalid');
      }
      break;

    case 3:
      break;

    case 4:
      if (!state.address.trim()) {
        push('jobForm.errorAddressRequired');
      }
      if (!state.city.trim()) {
        push('jobForm.errorCityRequired');
      }
      if (!state.state.trim()) {
        push('jobForm.errorStateRequired');
      }
      if (!state.pincode.trim()) {
        push('jobForm.errorPincodeRequired');
      }
      const hasLat = state.latitude.trim() !== '';
      const hasLng = state.longitude.trim() !== '';
      if (hasLat !== hasLng) {
        push('jobForm.errorCoordinatesPartial');
      } else if (hasLat && hasLng && !parseCoordinates(state)) {
        push('jobForm.errorCoordinatesInvalid');
      }
      break;

    default:
      break;
  }

  return { valid: errors.length === 0, errors };
}