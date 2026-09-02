/**
 * GigLink design tokens — single light-first theme.
 * Visual identity: modern premium consumer marketplace.
 * Primary: electric violet. Accent: warm coral. Neutral: warm gray.
 */

export const colors = {
  background: {
    primary: '#F6F7FB',
    secondary: '#EEF0F6',
  },
  surface: {
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    sunken: '#F2F3F8',
  },
  skeleton: {
    base: '#ECEEF3',
    highlight: '#F6F7FA',
  },
  border: {
    default: '#E9EAF0',
    strong: '#D8DAE3',
  },
  text: {
    primary: '#191B23',
    secondary: '#5A5F6E',
    muted: '#9BA1AE',
    inverse: '#FFFFFF',
    onBrand: '#FFFFFF',
  },
  brand: {
    primary: '#6C5CE7',
    primaryPressed: '#5A4BD1',
    tint: 'rgba(108, 92, 231, 0.10)',
    soft: '#EDEBFC',
  },
  accent: {
    opportunity: '#FF6B35',
    tint: 'rgba(255, 107, 53, 0.10)',
    soft: '#FFEDE4',
  },
  overlay: {
    default: 'rgba(19, 20, 28, 0.5)',
  },
  semantic: {
    success: '#12B76A',
    warning: '#F79009',
    error: '#E5484D',
  },
  semanticTint: {
    success: 'rgba(18, 183, 106, 0.12)',
    warning: 'rgba(247, 144, 9, 0.12)',
    error: 'rgba(229, 72, 77, 0.12)',
    brand: 'rgba(108, 92, 231, 0.10)',
    accent: 'rgba(255, 107, 53, 0.10)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  headingXl: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headingLg: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headingMd: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  bodyMd: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
} as const;

export const shadows = {
  elevated: {
    shadowColor: '#1A3A5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  higher: {
    shadowColor: '#1A3A5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const sizes = {
  touchTarget: 44,
  buttonHeight: 52,
  inputHeight: 52,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  screenPaddingHorizontal: spacing.lg,
  tabBarHeight: 64,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  sizes,
} as const;

export type Theme = typeof theme;
export type ColorToken = typeof colors;
export type SpacingToken = keyof typeof spacing;
