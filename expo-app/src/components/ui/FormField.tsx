import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export default function FormField({ label, hint, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[4],
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.error,
  },
});
