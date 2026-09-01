import type { UserRole } from '@/types';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  isVerified: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface PhoneSendOtpRequest {
  phone: string;
  country?: string;
}

export interface PhoneVerifyOtpRequest {
  phone: string;
  code: string;
  role: UserRole;
  name: string;
  country?: string;
}

export interface PhoneVerifyResult {
  user: User;
  token: string;
  isNewUser: boolean;
}

export interface GoogleSignInRequest {
  idToken: string;
  role: UserRole;
}

export type PendingIntent =
  | { action: 'apply'; jobId: string }
  | { action: 'createJob' };

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ msg: string; path?: string }>;
  code?: string;
  data?: ProfileCompletionInfo;
}

export interface ProfileCompletionInfo {
  percentage: number;
  role: 'worker' | 'employer';
  missingFields: string[];
}

export const PROFILE_INCOMPLETE_CODE = 'PROFILE_INCOMPLETE';
