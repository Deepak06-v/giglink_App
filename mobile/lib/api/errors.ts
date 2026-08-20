import axios from 'axios';

import { translate } from '@/lib/i18n';
import type { ApiErrorResponse } from '@/types/auth';

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;

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
