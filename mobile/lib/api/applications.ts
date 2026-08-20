import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, Application, ApplicationStatus, Assignment, Pagination } from '@/types';

export async function applyToJob(jobId: string): Promise<Application> {
  const response = await apiClient.post<ApiSuccessResponse<{ application: Application }>>(
    `/jobs/${jobId}/applications`,
  );
  return response.data.data.application;
}

export async function getApplications(
  page = 1,
  limit = 20,
  status?: ApplicationStatus,
): Promise<{ applications: Application[]; pagination: Pagination }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ applications: Application[]; pagination: Pagination }>
  >('/applications', {
    params: { page, limit, ...(status ? { status } : {}) },
  });
  return response.data.data;
}

export async function getApplicationById(applicationId: string): Promise<Application> {
  const response = await apiClient.get<ApiSuccessResponse<{ application: Application }>>(
    `/applications/${applicationId}`,
  );
  return response.data.data.application;
}

export async function withdrawApplication(applicationId: string): Promise<Application> {
  const response = await apiClient.patch<ApiSuccessResponse<{ application: Application }>>(
    `/applications/${applicationId}/withdraw`,
  );
  return response.data.data.application;
}

export async function getEmployerAllApplications(
  page = 1,
  limit = 20,
  status?: ApplicationStatus,
): Promise<{ applications: Application[]; pagination: Pagination }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ applications: Application[]; pagination: Pagination }>
  >('/employer/applications', {
    params: { page, limit, ...(status ? { status } : {}) },
  });
  return response.data.data;
}

export async function getEmployerApplicationById(applicationId: string): Promise<Application> {
  const response = await apiClient.get<ApiSuccessResponse<{ application: Application }>>(
    `/employer/applications/${applicationId}`,
  );
  return response.data.data.application;
}

export async function getEmployerApplicationsForJob(
  jobId: string,
  page = 1,
  limit = 20,
  status?: ApplicationStatus,
): Promise<{ applications: Application[]; pagination: Pagination }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ applications: Application[]; pagination: Pagination }>
  >(`/employer/jobs/${jobId}/applications`, {
    params: { page, limit, ...(status ? { status } : {}) },
  });
  return response.data.data;
}

export async function acceptApplication(
  applicationId: string,
): Promise<{ application: Application; assignment: Assignment }> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ application: Application; assignment: Assignment }>
  >(`/employer/applications/${applicationId}/accept`);
  return response.data.data;
}

export async function rejectApplication(applicationId: string): Promise<Application> {
  const response = await apiClient.patch<ApiSuccessResponse<{ application: Application }>>(
    `/employer/applications/${applicationId}/reject`,
  );
  return response.data.data.application;
}
