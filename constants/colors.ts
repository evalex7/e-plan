// Сучасна кольорова палітра для програми
export const colors = {
  // Основні кольори
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  
  // Статуси
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Фіолетові відтінки
  purple: '#A855F7',
  purpleLight: '#C084FC',
  purpleDark: '#9333EA',
  
  // Нейтральні кольори
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  
  // Білий та чорний
  white: '#FFFFFF',
  black: '#000000',
  
  // Фонові кольори для статусів
  successBg: '#F0FDF4',
  warningBg: '#FEF3C7',
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',
  
  // Текстові кольори для статусів
  successText: '#16A34A',
  warningText: '#D97706',
  errorText: '#DC2626',
  infoText: '#2563EB',
  
  // Тіні
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
  shadowPrimary: 'rgba(99, 102, 241, 0.3)',
  shadowSuccess: 'rgba(34, 197, 94, 0.3)',
  shadowWarning: 'rgba(245, 158, 11, 0.3)',
  shadowError: 'rgba(239, 68, 68, 0.3)',
};

// Градієнти
export const gradients = {
  primary: ['#6366F1', '#8B5CF6'],
  primaryLight: ['#818CF8', '#A78BFA'],
  success: ['#22C55E', '#16A34A'],
  successLight: ['#34D399', '#10B981'],
  warning: ['#F59E0B', '#D97706'],
  warningLight: ['#FBBF24', '#F59E0B'],
  error: ['#EF4444', '#DC2626'],
  errorLight: ['#F87171', '#EF4444'],
  purple: ['#8B5CF6', '#A855F7'],
  purpleLight: ['#A78BFA', '#C084FC'],
  ocean: ['#0EA5E9', '#06B6D4'],
  sunset: ['#F97316', '#EF4444'],
  forest: ['#059669', '#10B981'],
  lavender: ['#8B5CF6', '#EC4899'],
};

// Анімаційні константи
export const animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
    veryFast: 150,
    verySlow: 800,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    spring: 'spring',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  spring: {
    tension: 300,
    friction: 8,
    bouncyTension: 200,
    bouncyFriction: 6,
  },
  scale: {
    small: 0.95,
    medium: 1.05,
    large: 1.1,
  },
  translate: {
    small: 10,
    medium: 20,
    large: 50,
  },
};

// Розміри та відступи
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Радіуси заокруглення
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Розміри шрифтів
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
};

// Ваги шрифтів
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};