import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, Job, JobFilters, JobListItem, JobStatus, Pagination } from '@/types';

export interface JobCompletionInfo {
  employerCompleted: boolean;
  workersCompleted: number;
  workersRequired: number;
  isCompleted: boolean;
}

export interface JobsResponse {
  jobs: JobListItem[];
  items: JobListItem[];
  pagination: Pagination;
}

export interface EmployerJobsResponse {
  jobs: Job[];
  items: Job[];
  pagination: Pagination;
}

export async function getJobs(
  filters: JobFilters & { search?: string; sortBy?: string } = {},
): Promise<JobsResponse> {
  const params: Record<string, any> = { ...filters };
  if (filters.search) {
    params.q = filters.search;
  }
  if (filters.sortBy) {
    params.sort = filters.sortBy;
  }

  const response = await apiClient.get<ApiSuccessResponse<{ jobs: JobListItem[]; pagination: Pagination }>>(
    '/jobs',
    { params },
  );
  const data = response.data.data;
  return {
    jobs: data.jobs,
    items: data.jobs,
    pagination: data.pagination,
  };
}

export async function getJobById(jobId: string): Promise<JobListItem> {
  const response = await apiClient.get<ApiSuccessResponse<{ job: JobListItem }>>(`/jobs/${jobId}`);
  return response.data.data.job;
}

export async function createJob(data: any): Promise<Job> {
  const response = await apiClient.post<ApiSuccessResponse<{ job: Job }>>('/jobs', data);
  return response.data.data.job;
}

export async function getEmployerJobs(
  statusOrOptions?: string | { status?: string; page?: number; limit?: number },
  page?: number,
  limit?: number,
): Promise<EmployerJobsResponse> {
  let status: string | undefined;
  let p = page;
  let l = limit;

  if (typeof statusOrOptions === 'object' && statusOrOptions !== null) {
    status = statusOrOptions.status;
    p = statusOrOptions.page;
    l = statusOrOptions.limit;
  } else {
    status = statusOrOptions;
  }

  const response = await apiClient.get<ApiSuccessResponse<{ jobs: Job[]; pagination: Pagination }>>(
    '/jobs/employer/jobs',
    { params: { status, page: p, limit: l } },
  );
  const data = response.data.data;
  return {
    jobs: data.jobs,
    items: data.jobs,
    pagination: data.pagination,
  };
}

export async function getEmployerCompletedJobs(
  page?: number,
  limit?: number,
): Promise<EmployerJobsResponse> {
  const response = await apiClient.get<ApiSuccessResponse<{ jobs: Job[]; pagination: Pagination }>>(
    '/jobs/employer/jobs/completed',
    { params: { page, limit } },
  );
  const data = response.data.data;
  return {
    jobs: data.jobs,
    items: data.jobs,
    pagination: data.pagination,
  };
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

export async function publishJob(jobId: string): Promise<Job> {
  const response = await apiClient.patch<ApiSuccessResponse<{ job: Job }>>(
    `/jobs/employer/jobs/${jobId}/publish`,
  );
  return response.data.data.job;
}

export async function cancelJob(jobId: string): Promise<Job> {
  const response = await apiClient.patch<ApiSuccessResponse<{ job: Job }>>(
    `/jobs/employer/jobs/${jobId}/cancel`,
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

export const completeJob = completeJobEmployer;
