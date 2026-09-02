export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export type JobCategory =
  | 'EVENT_STAFF'
  | 'CATERING'
  | 'WAREHOUSE'
  | 'MOVING'
  | 'DELIVERY_ASSISTANCE'
  | 'CLEANING'
  | 'PROMOTIONAL'
  | 'GENERAL_LABOR'
  | 'OTHER';

export type JobStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'FILLED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type CompensationType = 'hourly' | 'fixed';

export type JobSortOption =
  | 'newest'
  | 'oldest'
  | 'pay_high'
  | 'pay_low'
  | 'date_soon'
  | 'date_late'
  | 'best_match';

export interface JobLocation {
  address: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface JobSchedule {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  date?: string;
  durationHours?: number;
}

export interface JobDuration {
  numberOfDays: number;
  hoursPerDay: number;
  totalHours: number;
}

export interface Compensation {
  type: CompensationType;
  amount: number;
  currency: string;
}

export interface JobRequirements {
  skills?: string[];
  experience?: string;
  dressCode?: string;
  languages?: string[];
}

export interface JobEmployer {
  _id?: string;
  id?: string;
  name?: string;
  companyName?: string;
  logo?: string;
}

export interface JobApplicationState {
  canApply: boolean;
  hasApplied: boolean;
  applicationStatus: ApplicationStatus | null;
  isAssigned: boolean;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  category: JobCategory;
  location: JobLocation;
  schedule: JobSchedule;
  compensation: Compensation;
  workersRequired: number;
  status: JobStatus;
  employer: JobEmployer | string;
  requirements?: JobRequirements;
  hiringDeadline?: string;
  duration?: JobDuration;
  canApply?: boolean;
  hasApplied?: boolean;
  applicationStatus?: ApplicationStatus | null;
  isAssigned?: boolean;
  hasCapacity?: boolean;
  applicationState?: JobApplicationState;
  createdAt?: string;
  updatedAt?: string;
}

export type JobListItem = Job;

export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface ApplicationWorker {
  _id: string;
  name?: string;
  email?: string;
}

export interface Application {
  _id: string;
  job: Job | string;
  worker: string | ApplicationWorker;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Assignment {
  _id: string;
  job: Job;
  worker: string;
  status: AssignmentStatus;
  workerCompleted: boolean;
  workerCompletedAt?: string;
  employerCompleted?: boolean;
  employerCompletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentCompletion {
  jobStatus: JobStatus;
  completion: {
    employerCompleted: boolean;
    workersCompleted: number;
    workersRequired: number;
    isCompleted: boolean;
  };
  waitingFor: 'employer' | 'workers' | null;
}

export interface ProfileCompletion {
  complete: boolean;
  percentage: number;
  missingFields: string[];
}

export interface WorkerProfile {
  _id?: string;
  user: string;
  phone?: string;
  profileImage?: string;
  bio?: string;
  location?: {
    city?: string;
    state?: string;
    pincode?: string;
  };
  skills?: string[];
  experience?: string;
  languages?: string[];
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
  completion?: ProfileCompletion;
}

export interface JobFilters {
  q?: string;
  category?: JobCategory;
  city?: string;
  minPay?: number;
  maxPay?: number;
  compensationType?: CompensationType;
  date?: string;
  fromDate?: string;
  toDate?: string;
  sort?: JobSortOption;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface EmployerProfile {
  _id?: string;
  user: string;
  companyName?: string;
  companyDescription?: string;
  phone?: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  completion?: ProfileCompletion;
}

export interface TrustSummary {
  averageRating: number | null;
  totalReviews: number;
}

export interface WorkerMarketplaceProfile {
  id: string;
  name?: string;
  profileImage?: string;
  bio?: string;
  skills?: string[];
  experience?: string;
  languages?: string[];
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
  location?: {
    city?: string;
    state?: string;
  };
  rating: TrustSummary;
}

export interface EmployerMarketplaceProfile {
  id: string;
  companyName?: string;
  logo?: string;
  companyDescription?: string;
  location?: {
    city?: string;
    state?: string;
  };
  rating: TrustSummary;
}

export type NotificationType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_WITHDRAWN'
  | 'JOB_FILLED'
  | 'WORKER_COMPLETION_CONFIRMED'
  | 'EMPLOYER_COMPLETION_CONFIRMED'
  | 'JOB_COMPLETED'
  | 'REVIEW_RECEIVED';

export interface Notification {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedJob?: string;
  relatedApplication?: string;
  relatedAssignment?: string;
  createdAt: string;
}
