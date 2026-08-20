import { create } from 'zustand';

import { SECURE_STORAGE_KEYS, secureStorage } from '@/lib/storage/secureStorage';

export const SUPPORTED_LANGUAGES = ['en', 'kn'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

interface LanguageState {
  language: AppLanguage;
  isInitializing: boolean;
  initialize: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
}

async function persistLanguage(language: AppLanguage): Promise<void> {
  await secureStorage.set(SECURE_STORAGE_KEYS.LANGUAGE, language);
}

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'en' || value === 'kn';
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_LANGUAGE,
  isInitializing: true,

  initialize: async () => {
    try {
      const stored = await secureStorage.get(SECURE_STORAGE_KEYS.LANGUAGE);
      if (isAppLanguage(stored)) {
        set({ language: stored });
      }
    } finally {
      set({ isInitializing: false });
    }
  },

  setLanguage: async (language) => {
    await persistLanguage(language);
    set({ language });
  },
}));
