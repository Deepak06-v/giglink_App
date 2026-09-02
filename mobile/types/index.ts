export type UserRole = 'worker' | 'employer';

export type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthSession,
  GoogleSignInRequest,
  LoginCredentials,
  PendingIntent,
  PhoneSendOtpRequest,
  PhoneVerifyOtpRequest,
  PhoneVerifyResult,
  SignupCredentials,
  User,
} from './auth';

export type {
  Application,
  ApplicationStatus,
  ApplicationWorker,
  Assignment,
  AssignmentCompletion,
  AssignmentStatus,
  Compensation,
  CompensationType,
  Job,
  JobApplicationState,
  JobCategory,
  JobDuration,
  JobEmployer,
  JobFilters,
  JobListItem,
  JobLocation,
  JobRequirements,
  JobSchedule,
  JobSortOption,
  JobStatus,
  PaginatedResponse,
  Pagination,
  ProfileCompletion,
  TrustSummary,
  WorkerMarketplaceProfile,
  EmployerMarketplaceProfile,
  WorkerProfile,
  EmployerProfile,
  Notification,
  NotificationType,
} from './jobs';

export type {
  UploadAssetType,
  UploadAuthorization,
} from './upload';
