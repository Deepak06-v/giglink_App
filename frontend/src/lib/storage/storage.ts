export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'giglink_access_token',
  GUEST_MODE: 'giglink_guest_mode',
  LANGUAGE: 'giglink_language',
  ONBOARDING_COMPLETED: 'giglink_onboarding_completed',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const memoryFallback = new Map<string, string>();

export const appStorage = {
  get(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback below
    }
    return memoryFallback.get(key) ?? null;
  },

  set(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback below
    }
    memoryFallback.set(key, value);
  },

  delete(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback below
    }
    memoryFallback.delete(key);
  },
};
