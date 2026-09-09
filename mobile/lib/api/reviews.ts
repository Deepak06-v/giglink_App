import { apiClient } from '@/lib/api/client';
import type {
  ApiSuccessResponse,
  Pagination,
  Review,
  TrustSummary,
} from '@/types';

export interface WorkerReviewStatus {
  canReview: boolean;
  hasReviewed: boolean;
}

export interface EmployerReviewWorkerStatus {
  workerId: string;
  hasReviewed: boolean;
}

export interface EmployerReviewStatus {
  canReview: boolean;
  workers: EmployerReviewWorkerStatus[];
}

export async function getWorkerReviewStatus(jobId: string): Promise<WorkerReviewStatus> {
  const response = await apiClient.get<ApiSuccessResponse<WorkerReviewStatus>>(
    `/worker/jobs/${jobId}/review-status`,
  );
  return response.data.data;
}

export async function getEmployerReviewStatus(jobId: string): Promise<EmployerReviewStatus> {
  const response = await apiClient.get<ApiSuccessResponse<EmployerReviewStatus>>(
    `/employer/jobs/${jobId}/review-status`,
  );
  return response.data.data;
}

export async function submitWorkerReview(
  jobId: string,
  data: { rating: number; comment?: string },
): Promise<Review> {
  const response = await apiClient.post<ApiSuccessResponse<{ review: Review }>>(
    `/worker/jobs/${jobId}/reviews`,
    data,
  );
  return response.data.data.review;
}

export async function submitEmployerReview(
  jobId: string,
  workerId: string,
  data: { rating: number; comment?: string },
): Promise<Review> {
  const response = await apiClient.post<ApiSuccessResponse<{ review: Review }>>(
    `/employer/jobs/${jobId}/reviews`,
    { ...data, workerId },
  );
  return response.data.data.review;
}

export async function getUserReviews(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ summary: TrustSummary; reviews: Review[]; pagination: Pagination }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ summary: TrustSummary; reviews: Review[]; pagination: Pagination }>
  >(`/users/${userId}/reviews`, { params: { page, limit } });
  return response.data.data;
}