/** Design tokens — espelha `frontend/assets/css/patient-app.css`. */

export const colors = {
  primary: '#8B967C',
  primaryDark: '#6f7863',
  primarySoft: '#eef0eb',
  bg: '#ffffff',
  surface: '#ffffff',
  text: '#1a1a1a',
  textMuted: '#5f5f5c',
  border: '#e4e4e0',
  track: '#e8e8e4',
  error: '#b42318',
  errorSoft: '#fef3f2',
  inputIcon: '#b8c0bd',
  placeholder: '#b0b8b5',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
} as const;

export const radii = {
  control: 16,
  surface: 24,
  pill: 999,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;
