import type { TextStyle } from 'react-native';

import { typography } from '@/constants/theme';
import { useLanguageStore, type AppLanguage } from '@/store/languageStore';

export type FontWeight = 400 | 500 | 600 | 700;

export const FONT_FAMILIES: Record<AppLanguage, Record<FontWeight, string>> = {
  en: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
  },
  kn: {
    400: 'NotoSansKannada_400Regular',
    500: 'NotoSansKannada_500Medium',
    600: 'NotoSansKannada_600SemiBold',
    700: 'NotoSansKannada_700Bold',
  },
};

export function getFontFamily(language: AppLanguage, weight: FontWeight): string {
  return FONT_FAMILIES[language][weight];
}

export function useFontFamily(weight: FontWeight): string {
  const language = useLanguageStore((state) => state.language);
  return getFontFamily(language, weight);
}

export function useTypography(): Record<
  keyof typeof typography,
  TextStyle & { fontFamily: string }
> {
  const language = useLanguageStore((state) => state.language);
  const font = FONT_FAMILIES[language];
  return {
    display: { ...typography.display, fontFamily: font[700] },
    headingXl: { ...typography.headingXl, fontFamily: font[700] },
    headingLg: { ...typography.headingLg, fontFamily: font[600] },
    headingMd: { ...typography.headingMd, fontFamily: font[600] },
    bodyLg: { ...typography.bodyLg, fontFamily: font[400] },
    bodyMd: { ...typography.bodyMd, fontFamily: font[400] },
    label: { ...typography.label, fontFamily: font[500] },
    caption: { ...typography.caption, fontFamily: font[400] },
  };
}
