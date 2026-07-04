import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
};

export default function CfButton({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      disabled={disabled || loading}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textGhost]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: colors.primary },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.65 },
  text: { fontFamily: fonts.bold, fontSize: 16 },
  textPrimary: { color: '#fff' },
  textGhost: { color: colors.text },
});
