import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage keys — used in Phase 2+ for JWT and sensitive data.
 */
export const SECURE_STORAGE_KEYS = {
  ACCESS_TOKEN: 'giglink_access_token',
  GUEST_MODE: 'giglink_guest_mode',
  LANGUAGE: 'giglink_language',
  ONBOARDING_COMPLETED: 'giglink_onboarding_completed',
} as const;

export type SecureStorageKey =
  (typeof SECURE_STORAGE_KEYS)[keyof typeof SECURE_STORAGE_KEYS];

const fallbackStorage = new Map<string, string>();

function getNativeSecureStore(): typeof SecureStore & { default?: Record<string, unknown> } {
  return (SecureStore as typeof SecureStore & { default?: Record<string, unknown> }).default
    ? ((SecureStore as typeof SecureStore & { default?: Record<string, unknown> }).default as typeof SecureStore)
    : SecureStore;
}

async function safeNativeCall<T>(
  methodName: 'setItemAsync' | 'getItemAsync' | 'deleteItemAsync',
  ...args: unknown[]
): Promise<T | null> {
  const nativeStore = getNativeSecureStore();
  const method = nativeStore[methodName] as ((...params: unknown[]) => Promise<T>) | undefined;

  if (typeof method === 'function') {
    try {
      return await method(...args);
    } catch {
      // Fall back to browser memory if native secure storage is unavailable.
    }
  }

  return null;
}

/**
 * Thin abstraction over Expo SecureStore for consistent usage across the app.
 * Falls back to browser/local storage or in-memory storage when the native module is unavailable.
 */
export const secureStorage = {
  async set(key: SecureStorageKey | string, value: string): Promise<void> {
    const result = await safeNativeCall<void>('setItemAsync', key, value);

    if (result !== null) {
      return;
    }

    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem(key, value);
      return;
    }

    fallbackStorage.set(key, value);
  },

  async get(key: SecureStorageKey | string): Promise<string | null> {
    const result = await safeNativeCall<string | null>('getItemAsync', key);

    if (result !== null) {
      return result;
    }

    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage.getItem(key);
    }

    return fallbackStorage.get(key) ?? null;
  },

  async delete(key: SecureStorageKey | string): Promise<void> {
    const result = await safeNativeCall<void>('deleteItemAsync', key);

    if (result !== null || typeof result === 'undefined') {
      return;
    }

    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.removeItem(key);
      return;
    }

    fallbackStorage.delete(key);
  },
};
