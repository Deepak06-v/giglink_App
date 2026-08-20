import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, Job, JobFilters, JobListItem, JobStatus, Pagination } from '@/types';

export interface JobCompletionInfo {
  employerCompleted: boolean;
  workersCompleted: number;
  workersRequired: number;
  isCompleted: boolean;
}

export async function getJobs(filters: JobFilters = {}): Promise<{ jobs: JobListItem[]; pagination: Pagination }> {
  const response = await apiClient.get<ApiSuccessResponse<{ jobs: JobListItem[]; pagination: Pagination }>>(
    '/jobs',
    { params: filters },
  );
  return response.data.data;
}

export async function getJobById(jobId: string): Promise<JobListItem> {
  const response = await apiClient.get<ApiSuccessResponse<{ job: JobListItem }>>(`/jobs/${jobId}`);
  return response.data.data.job;
}

export async function createJob(data: Partial<Job>): Promise<Job> {
  const response = await apiClient.post<ApiSuccessResponse<{ job: Job }>>('/jobs', data);
  return response.data.data.job;
}

export async function getEmployerJobs(
  status?: string,
  page?: number,
  limit?: number,
): Promise<{ jobs: Job[]; pagination: Pagination }> {
  const response = await apiClient.get<ApiSuccessResponse<{ jobs: Job[]; pagination: Pagination }>>(
    '/jobs/employer/jobs',
    { params: { status, page, limit } },
  );
  return response.data.data;
}

export async function getEmployerCompletedJobs(
  page?: number,
  limit?: number,
): Promise<{ jobs: Job[]; pagination: Pagination }> {
  const response = await apiClient.get<ApiSuccessResponse<{ jobs: Job[]; pagination: Pagination }>>(
    '/jobs/employer/jobs/completed',
    { params: { page, limit } },
  );
  return response.data.data;
}

export async function getEmployerJobById(
  jobId: string,
): Promise<{ job: Job; completion: JobCompletionInfo }> {
  const response = await apiClient.get<ApiSuccessResponse<{ job: Job; completion: JobCompletionInfo }>>(
    `/jobs/employer/jobs/${jobId}`,
  );
  return response.data.data;
}

export async function updateJob(jobId: string, data: Partial<Job>): Promise<Job> {
  const response = await apiClient.patch<ApiSuccessResponse<{ job: Job }>>(
    `/jobs/employer/jobs/${jobId}`,
    data,
  );
  return response.data.data.job;
}

export async function deleteJob(jobId: string): Promise<void> {
  await apiClient.delete<ApiSuccessResponse<{ message?: string }>>(`/jobs/employer/jobs/${jobId}`);
}

export async function completeJobEmployer(
  jobId: string,
): Promise<{ jobStatus: JobStatus; completion: JobCompletionInfo }> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ jobStatus: JobStatus; completion: JobCompletionInfo }>
  >(`/jobs/employer/jobs/${jobId}/complete`);
  return response.data.data;
}
