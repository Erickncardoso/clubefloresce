import { DefaultTheme, type Theme } from '@react-navigation/native';
import { colors } from '@/theme/tokens';

/** Tema claro — evita faixa cinza (`rgb(242,242,242)`) na safe area inferior do iOS. */
export const patientNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    border: colors.border,
  },
};
