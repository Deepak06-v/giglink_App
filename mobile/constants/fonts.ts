import type { TextStyle } from 'react-native';

import { typography } from '@/constants/theme';
import { useLanguageStore, type AppLanguage } from '@/store/languageStore';

export type FontWeight = 400 | 500 | 600 | 700 | 800;

export const FONT_FAMILIES: Record<AppLanguage, Record<FontWeight, string>> = {
  en: {
    400: 'PlusJakartaSans_400Regular',
    500: 'PlusJakartaSans_500Medium',
    600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold',
    800: 'PlusJakartaSans_800ExtraBold',
  },
  kn: {
    400: 'NotoSansKannada_400Regular',
    500: 'NotoSansKannada_500Medium',
    600: 'NotoSansKannada_600SemiBold',
    700: 'NotoSansKannada_700Bold',
    800: 'NotoSansKannada_700Bold',
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
    display: { ...typography.display, fontFamily: font[800] },
    headingXl: { ...typography.headingXl, fontFamily: font[700] },
    headingLg: { ...typography.headingLg, fontFamily: font[700] },
    headingMd: { ...typography.headingMd, fontFamily: font[600] },
    bodyLg: { ...typography.bodyLg, fontFamily: font[500] },
    bodyMd: { ...typography.bodyMd, fontFamily: font[400] },
    bodySm: { ...typography.bodySm, fontFamily: font[400] },
    label: { ...typography.label, fontFamily: font[600] },
    caption: { ...typography.caption, fontFamily: font[400] },
  };
}
