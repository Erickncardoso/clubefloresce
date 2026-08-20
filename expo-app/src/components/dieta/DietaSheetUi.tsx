import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Minus, Plus, Search, X } from 'lucide-react-native';
import { triggerImpactHaptic } from '@/lib/picker-haptics';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export const DIETA_SHEET_GUTTER = spacing[5];

export function DietaSheetHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <View style={headerStyles.wrap}>
      <View style={headerStyles.iconWrap}>
        <Icon size={22} color={colors.primaryDark} strokeWidth={1.8} />
      </View>
      <Text style={headerStyles.title}>{title}</Text>
      <View style={headerStyles.subRow}>
        <Text style={headerStyles.subtitle}>{subtitle}</Text>
        {badge ? <View style={headerStyles.badge}><Text style={headerStyles.badgeText}>{badge}</Text></View> : null}
      </View>
    </View>
  );
}

export function DietaSheetSteps({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <View style={stepStyles.wrap}>
      <View style={stepStyles.trackRow}>
        {steps.map((_, index) => {
          const active = index === activeIndex;
          const done = index < activeIndex;
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;

          return (
            <View key={`track-${index}`} style={stepStyles.trackSegment}>
              <View
                style={[
                  stepStyles.trackLine,
                  isFirst && stepStyles.trackLineHidden,
                  (done || active) && !isFirst && stepStyles.trackLineDone,
                ]}
              />
              <View style={[stepStyles.dot, active && stepStyles.dotActive, done && stepStyles.dotDone]}>
                <Text style={[stepStyles.dotText, (active || done) && stepStyles.dotTextActive]}>
                  {index + 1}
                </Text>
              </View>
              <View
                style={[
                  stepStyles.trackLine,
                  isLast && stepStyles.trackLineHidden,
                  done && !isLast && stepStyles.trackLineDone,
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={stepStyles.labelsRow}>
        {steps.map((label, index) => {
          const active = index === activeIndex;
          return (
            <View key={label} style={stepStyles.labelCell}>
              <Text
                style={[stepStyles.label, active && stepStyles.labelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function DietaSheetSearch({
  value,
  onChange,
  placeholder = 'Busque por nome…',
  loading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}) {
  return (
    <View style={searchStyles.wrap}>
      <Search size={18} color={colors.textMuted} strokeWidth={1.8} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={searchStyles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {loading ? (
        <ActivityIndicator size="small" color={colors.primaryDark} />
      ) : value.length > 0 ? (
        <Pressable
          hitSlop={8}
          onPress={() => {
            triggerImpactHaptic();
            onChange('');
          }}
        >
          <X size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function DietaQuantityStepper({
  value,
  onChange,
  step = 1,
  min = 0.5,
  integer = false,
}: {
  value: string;
  onChange: (next: string) => void;
  step?: number;
  min?: number;
  integer?: boolean;
}) {
  const numeric = Number(String(value).replace(',', '.')) || 0;

  function bump(delta: number) {
    triggerImpactHaptic();
    const raw = numeric + delta * step;
    const next = integer
      ? Math.max(min, Math.round(raw))
      : Math.max(min, Math.round(raw * 10) / 10);
    onChange(String(next));
  }

  return (
    <View style={qtyStyles.row}>
      <Pressable style={qtyStyles.btn} onPress={() => bump(-1)}>
        <Minus size={18} color={colors.text} strokeWidth={2} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={qtyStyles.input}
        selectTextOnFocus
      />
      <Pressable style={qtyStyles.btn} onPress={() => bump(1)}>
        <Plus size={18} color={colors.text} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export function DietaSheetPrimaryButton({
  label,
  sublabel,
  disabled,
  onPress,
}: {
  label: string;
  sublabel?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        btnStyles.btn,
        disabled && btnStyles.btnDisabled,
        pressed && !disabled && btnStyles.btnPressed,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[btnStyles.label, disabled && btnStyles.labelDisabled]}>{label}</Text>
      {sublabel && !disabled ? <Text style={btnStyles.sublabel} numberOfLines={1}>{sublabel}</Text> : null}
    </Pressable>
  );
}

export function DietaGroupedList({ children }: { children: ReactNode }) {
  return <View style={groupStyles.wrap}>{children}</View>;
}

export function DietaGroupedDivider({ inset = spacing[4] }: { inset?: number }) {
  return <View style={[groupStyles.divider, { marginLeft: inset }]} />;
}

const headerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingHorizontal: DIETA_SHEET_GUTTER,
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
    backgroundColor: '#fafafa',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#f2f2f7',
  },
  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primaryDark,
  },
});

const stepStyles = StyleSheet.create({
  wrap: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[1],
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#e5e5ea',
  },
  trackLineHidden: {
    backgroundColor: 'transparent',
  },
  trackLineDone: {
    backgroundColor: colors.primaryDark,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  labelCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },
  dotText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#8e8e93',
  },
  dotTextActive: { color: '#fff' },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primaryDark,
    fontFamily: fonts.semibold,
  },
});

const searchStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: spacing[3],
    borderRadius: radii.control,
    backgroundColor: '#f2f2f7',
    marginBottom: spacing[3],
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 10,
  },
});

const qtyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.control,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.control,
    backgroundColor: '#f2f2f7',
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
  },
});

const btnStyles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
  },
  btnDisabled: { backgroundColor: '#e5e5ea' },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  label: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  labelDisabled: { color: '#aeaeb2' },
  sublabel: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    maxWidth: '100%',
  },
});

const groupStyles = StyleSheet.create({
  wrap: {
    borderRadius: radii.surface,
    backgroundColor: '#f2f2f7',
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d1d6',
  },
});
