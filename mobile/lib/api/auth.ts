import { apiClient } from '@/lib/api/client';
import type {
  ApiSuccessResponse,
  AuthSession,
  GoogleSignInRequest,
  LoginCredentials,
  PhoneSendOtpRequest,
  PhoneVerifyOtpRequest,
  PhoneVerifyResult,
  SignupCredentials,
  User,
} from '@/types/auth';

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await apiClient.post<ApiSuccessResponse<AuthSession>>('/auth/login', credentials);
  return response.data.data;
}

export async function googleSignIn(input: GoogleSignInRequest): Promise<AuthSession> {
  const response = await apiClient.post<ApiSuccessResponse<AuthSession>>('/auth/google', input);
  return response.data.data;
}

export async function signup(credentials: SignupCredentials): Promise<AuthSession> {
  const response = await apiClient.post<ApiSuccessResponse<AuthSession>>('/auth/signup', credentials);
  return response.data.data;
}

export async function sendPhoneOtp(input: PhoneSendOtpRequest): Promise<void> {
  await apiClient.post('/auth/phone/send-otp', input);
}

export async function verifyPhoneOtp(input: PhoneVerifyOtpRequest): Promise<PhoneVerifyResult> {
  const response = await apiClient.post<ApiSuccessResponse<PhoneVerifyResult>>(
    '/auth/phone/verify-otp',
    input,
  );
  return response.data.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiSuccessResponse<{ user: User }>>('/auth/me');
  return response.data.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
