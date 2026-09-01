/**
 * GigLink design tokens — source of truth: docs/MOBILE_DESIGN_SYSTEM.md
 */

export const colors = {
  background: {
    primary: '#0B0B0F',
    secondary: '#111116',
  },
  surface: {
    card: '#15151B',
    elevated: '#1B1B22',
    higher: '#202027',
  },
  border: {
    default: '#27272A',
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#A1A1AA',
    muted: '#71717A',
    inverse: '#FFFFFF',
  },
  brand: {
    primary: '#4C8DFF',
    primaryPressed: '#3B82F6',
    tint: 'rgba(76, 141, 255, 0.14)',
  },
  accent: {
    opportunity: '#F5B942',
    tint: 'rgba(245, 185, 66, 0.14)',
  },
  overlay: {
    default: 'rgba(0, 0, 0, 0.6)',
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  semanticTint: {
    success: 'rgba(34, 197, 94, 0.12)',
    warning: 'rgba(245, 158, 11, 0.12)',
    error: 'rgba(239, 68, 68, 0.12)',
    brand: 'rgba(76, 141, 255, 0.14)',
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
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'Inter_700Bold',
  },
  headingXl: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Inter_700Bold',
  },
  headingLg: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Inter_600SemiBold',
  },
  headingMd: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Inter_600SemiBold',
  },
  bodyLg: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  bodyMd: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_500Medium',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  },
} as const;

export const shadows = {
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  higher: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const sizes = {
  touchTarget: 44,
  buttonHeight: 48,
  inputHeight: 48,
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
