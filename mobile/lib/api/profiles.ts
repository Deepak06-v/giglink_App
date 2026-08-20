import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, EmployerProfile, WorkerProfile } from '@/types';

export async function getWorkerProfile(): Promise<WorkerProfile> {
  const response = await apiClient.get<ApiSuccessResponse<{ profile: WorkerProfile }>>('/worker/profile');
  return response.data.data.profile;
}

export async function updateWorkerProfile(data: Partial<WorkerProfile>): Promise<WorkerProfile> {
  const response = await apiClient.patch<ApiSuccessResponse<{ profile: WorkerProfile }>>(
    '/worker/profile',
    data,
  );
  return response.data.data.profile;
}

export async function getEmployerProfile(): Promise<EmployerProfile> {
  const response = await apiClient.get<ApiSuccessResponse<{ profile: EmployerProfile }>>('/employer/profile');
  return response.data.data.profile;
}

export async function updateEmployerProfile(data: Partial<EmployerProfile>): Promise<EmployerProfile> {
  const response = await apiClient.patch<ApiSuccessResponse<{ profile: EmployerProfile }>>(
    '/employer/profile',
    data,
  );
  return response.data.data.profile;
}
