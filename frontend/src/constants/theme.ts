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
    default: 'rgba(19, 20, 28, 0.50)',
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
