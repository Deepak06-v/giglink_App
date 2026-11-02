import { create } from 'zustand';
import { en } from '@/locales/en';
import { kn } from '@/locales/kn';

export const SUPPORTED_LANGUAGES = ['en', 'kn'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

const LANGUAGE_STORAGE_KEY = 'giglink_language';

const messages: Record<AppLanguage, any> = { en, kn };

function resolveValue(language: AppLanguage, key: string): string {
  const dict = messages[language] || messages.en;
  const parts = key.split('.');
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      if (language !== 'en') {
        return resolveValue('en', key);
      }
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
}

interface LanguageState {
  language: AppLanguage;
  isInitializing: boolean;
  initialize: () => void;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'en' || value === 'kn';
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: DEFAULT_LANGUAGE,
  isInitializing: true,

  initialize: () => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isAppLanguage(stored)) {
        set({ language: stored });
        document.documentElement.setAttribute('data-lang', stored);
      } else {
        document.documentElement.setAttribute('data-lang', DEFAULT_LANGUAGE);
      }
    } finally {
      set({ isInitializing: false });
    }
  },

  setLanguage: (language) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.setAttribute('data-lang', language);
    } catch {
      // Storage unavailable
    }
    set({ language });
  },

  t: (key: string, params?: Record<string, string | number>) => {
    let text = resolveValue(get().language, key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }
    }
    return text;
  },
}));
