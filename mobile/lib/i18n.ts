import { useLanguageStore, type AppLanguage } from '@/store/languageStore';
import { en, type MessageKey } from '@/locales/en';
import { kn } from '@/locales/kn';

const messages: Record<AppLanguage, typeof en> = { en, kn };

export type { MessageKey };

type Path<T> = T extends string
  ? never
  : {
      [K in keyof T]: K extends string
        ? T[K] extends string
          ? K
          : T[K] extends object
            ? `${K}.${Path<T[K]>}`
            : never
        : never;
    }[keyof T];

export type TranslationKey = Path<typeof en>;

type Params = Record<string, string | number>;

function resolveValue(language: AppLanguage, key: TranslationKey): string {
  const dict = messages[language];
  const parts = key.split('.');
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
}

function interpolate(template: string, params?: Params): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function translate(key: TranslationKey, params?: Params): string {
  const language = useLanguageStore.getState().language;
  return interpolate(resolveValue(language, key), params);
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  return {
    language,
    t: (key: TranslationKey, params?: Params) => interpolate(resolveValue(language, key), params),
  };
}
