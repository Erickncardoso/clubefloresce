import { Platform, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const CONTROL_RADIUS = radii.control;

const webInputReset =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none',
      } as object)
    : {};

/** TextInput dentro de wrapper com borda (login, ícone + campo). */
export const innerInputStyle = StyleSheet.create({
  field: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing[2],
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...webInputReset,
  },
});

/** @deprecated Use FloatField — mantido para compatibilidade. */
export const fieldInputStyle = StyleSheet.create({
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: CONTROL_RADIUS,
    paddingHorizontal: spacing[4],
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    ...webInputReset,
  },
  error: {
    borderColor: colors.error,
  },
});
