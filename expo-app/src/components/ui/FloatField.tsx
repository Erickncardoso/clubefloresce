import { useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { innerInputStyle } from '@/lib/text-input-styles';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightAccessory?: ReactNode;
  footer?: ReactNode;
};

/** Espelha `.field--float` do PWA (`patient-app.css` + login). */
export default function FloatField({
  label,
  hint,
  error,
  leftIcon: LeftIcon,
  rightAccessory,
  footer,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        <Text style={[styles.floatLabel, focused && styles.floatLabelFocused]}>
          {label}
        </Text>

        <View style={styles.inputRow}>
          {LeftIcon ? (
            <LeftIcon
              size={18}
              color={focused ? colors.primary : colors.inputIcon}
              strokeWidth={1.75}
            />
          ) : null}
          <TextInput
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            spellCheck={false}
            style={[innerInputStyle.field, styles.input, style]}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            {...props}
          />
          {rightAccessory}
        </View>
      </View>

      {footer}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const CONTROL_RADIUS = radii.control;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    overflow: 'visible',
  },
  field: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    borderRadius: CONTROL_RADIUS,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    overflow: 'visible',
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as object)
      : {}),
  },
  fieldFocused: {
    borderColor: colors.primary,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 0 1px rgba(139, 150, 124, 0.15)' } as object)
      : {}),
  },
  fieldError: {
    borderColor: colors.error,
  },
  floatLabel: {
    position: 'absolute',
    top: -9,
    left: 12,
    zIndex: 2,
    paddingHorizontal: 6,
    backgroundColor: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: colors.text,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: `-5px 0 0 0 ${colors.surface}, 5px 0 0 0 ${colors.surface}`,
        } as object)
      : {}),
  },
  floatLabelFocused: {
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 48,
  },
  input: {
    paddingTop: 15,
    paddingBottom: 13,
    fontSize: 15,
  },
  hint: {
    marginTop: spacing[2],
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    marginTop: spacing[2],
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.error,
  },
});
