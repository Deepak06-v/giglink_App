import axios from 'axios';

import { translate } from '@/lib/i18n';
import { PROFILE_INCOMPLETE_CODE, type ApiErrorResponse, type ProfileCompletionInfo } from '@/types/auth';

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;

    if (data?.code) {
      if (data.code === 'PROFILE_INCOMPLETE') {
        return translate('profileIncomplete.message', { percent: data.data?.percentage ?? 0 });
      }
      return data.message || translate('common.somethingWentWrong');
    }

    if (data?.errors?.length) {
      return data.errors.map((item) => item.msg).join('. ');
    }

    if (data?.message) {
      return data.message;
    }

    if (error.message === 'Network Error') {
      return translate('errors.network');
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback ?? translate('common.somethingWentWrong');
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function getProfileCompletionInfo(error: unknown): ProfileCompletionInfo | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const data = error.response?.data as ApiErrorResponse | undefined;
  if (data?.code === PROFILE_INCOMPLETE_CODE && data.data) {
    return data.data;
  }
  return null;
}
