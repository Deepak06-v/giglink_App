import { apiClient } from '@/lib/api/client';
import type {
  ApiSuccessResponse,
  EmployerMarketplaceProfile,
  WorkerMarketplaceProfile,
} from '@/types';

export async function getWorkerMarketplaceProfile(
  userId: string,
): Promise<WorkerMarketplaceProfile> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ profile: WorkerMarketplaceProfile }>
  >(`/marketplace/worker/${userId}`);
  return response.data.data.profile;
}

export async function getEmployerMarketplaceProfile(
  userId: string,
): Promise<EmployerMarketplaceProfile> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ profile: EmployerMarketplaceProfile }>
  >(`/marketplace/employer/${userId}`);
  return response.data.data.profile;
}
