import { apiClient } from '@/lib/api/client';
import type {
  ApiSuccessResponse,
  Assignment,
  AssignmentCompletion,
  Pagination,
} from '@/types';

export async function getAssignments(
  page = 1,
  limit = 20,
): Promise<{ assignments: Assignment[]; pagination: Pagination }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ assignments: Assignment[]; pagination: Pagination }>
  >('/worker/assignments', { params: { page, limit } });
  return response.data.data;
}

export async function getAssignmentById(
  assignmentId: string,
): Promise<{ assignment: Assignment; completion: AssignmentCompletion }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ assignment: Assignment; completion: AssignmentCompletion }>
  >(`/worker/assignments/${assignmentId}`);
  return response.data.data;
}

export async function completeAssignment(assignmentId: string): Promise<{
  assignmentStatus: string;
  jobStatus: string;
  waitingFor: 'employer' | 'workers' | null;
}> {
  const response = await apiClient.post<
    ApiSuccessResponse<{
      assignmentStatus: string;
      jobStatus: string;
      waitingFor: 'employer' | 'workers' | null;
    }>
  >(`/worker/assignments/${assignmentId}/complete`);
  return response.data.data;
}
