import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { X, type LucideIcon } from 'lucide-react-native';
import { useBottomSheetDismiss } from '@/components/ui/AppleBottomSheet';
import { useAppToast } from '@/hooks/useAppToast';
import { toastSaveError } from '@/lib/app-toast';
import { fonts } from '@/theme/tokens';

export const GOAL_RING_LEN = Math.PI * 88;
export const GOAL_RING_PATH = 'M 120 32 A 88 88 0 0 1 120 208';

const RING_THEMES = {
  water: { track: '#e6e9eb', value: '#5ba4d9', hero: '#f8fbfd', accent: '#438ec4' },
  food: { track: '#ebe3e0', value: '#a87d70', hero: '#fcf9f8', accent: '#9d7268' },
  exercise: { track: '#e3e9e1', value: '#5f8f58', hero: '#f8faf7', accent: '#5f8f58' },
  sleep: { track: '#e4e5ed', value: '#6b74b8', hero: '#f8f8fc', accent: '#555c98' },
} as const;

export type GoalSheetTheme = keyof typeof RING_THEMES;

type SheetHeadProps = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
};

export function GoalSheetHead({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: SheetHeadProps) {
  const { dismiss } = useBottomSheetDismiss();

  return (
    <View style={styles.head}>
      <View style={[styles.headIcon, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={16} strokeWidth={1.8} />
      </View>
      <View style={styles.headCopy}>
        <Text style={styles.headTitle}>{title}</Text>
        <Text style={styles.headSub}>{subtitle}</Text>
      </View>
      <Pressable style={styles.closeBtn} accessibilityLabel="Fechar" onPress={dismiss}>
        <X color="#5f5f65" size={15} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

type HeroStat = { label: string; value: string; highlight?: boolean; small?: string };

export function GoalSheetHero({
  theme,
  percent,
  stats,
}: {
  theme: GoalSheetTheme;
  percent: number;
  stats: HeroStat[];
}) {
  const palette = RING_THEMES[theme];
  const safePercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  const dashOffset = GOAL_RING_LEN * (1 - safePercent / 100);
  const triple = safePercent >= 100;
  const doubleDigit = safePercent >= 10 && safePercent < 100;

  return (
    <View style={[styles.hero, { backgroundColor: palette.hero }]}>
      <View style={styles.ringWrap} pointerEvents="none">
        <Svg width={248} height={248} viewBox="0 0 240 240">
          <Path
            d={GOAL_RING_PATH}
            fill="none"
            stroke={palette.track}
            strokeWidth={27}
            strokeLinecap="butt"
          />
          <Path
            d={GOAL_RING_PATH}
            fill="none"
            stroke={palette.value}
            strokeWidth={27}
            strokeLinecap="butt"
            strokeDasharray={GOAL_RING_LEN}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      </View>

      <View style={styles.ringLabel}>
        <Text
          style={[
            styles.ringPct,
            doubleDigit && styles.ringPctDouble,
            triple && styles.ringPctTriple,
          ]}
          numberOfLines={1}
        >
          {safePercent}%
        </Text>
        <Text style={styles.ringSub}>concluído</Text>
      </View>

      <View style={styles.summaryCol}>
        {stats.map((stat) => (
          <View key={stat.label} style={stat.highlight ? styles.summaryToday : styles.summaryRow}>
            <Text style={styles.summaryLabel}>{stat.label}</Text>
            <Text
              style={[
                stat.highlight ? styles.summaryTodayValue : styles.summaryRowValue,
                stat.highlight && { color: palette.accent },
              ]}
            >
              {stat.value}
              {stat.small ? <Text style={styles.summarySmall}> {stat.small}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function GoalSheetSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionSub}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function GoalValuePicker({
  previous,
  current,
  next,
  unit,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  previous: string;
  current: string;
  next: string;
  unit: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <>
      <View style={styles.picker}>
        <Pressable
          style={styles.pickerSide}
          disabled={!canDecrease}
          onPress={onDecrease}
        >
          <Text style={[styles.pickerSideText, !canDecrease && styles.pickerSideDisabled]}>{previous}</Text>
        </Pressable>
        <View style={styles.pickerCenter}>
          <Text style={styles.pickerValue}>{current}</Text>
        </View>
        <Pressable
          style={styles.pickerSide}
          disabled={!canIncrease}
          onPress={onIncrease}
        >
          <Text style={[styles.pickerSideText, !canIncrease && styles.pickerSideDisabled]}>{next}</Text>
        </Pressable>
      </View>
      <Text style={styles.pickerUnit}>{unit}</Text>
      <Text style={styles.pickerHint}>Toque nos valores laterais para ajustar</Text>
    </>
  );
}

export type GoalTabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  vessel?: 'glass' | 'bottle';
};

export function GoalSettingTabs({
  tabs,
  activeId,
  onChange,
  columns = 3,
}: {
  tabs: GoalTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  columns?: 2 | 3;
}) {
  return (
    <View style={[styles.tabs, columns === 2 && styles.tabsTwo]}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.id}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tab.id)}
          >
            {Icon ? <Icon size={16} color={active ? '#202124' : '#6c7074'} strokeWidth={1.8} /> : null}
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GoalSheetSaveButton({
  label,
  onPress,
  compact,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  compact?: boolean;
}) {
  const { dismiss } = useBottomSheetDismiss();
  const { showToast } = useAppToast();

  return (
    <Pressable
      style={[styles.saveBtn, !compact && styles.saveBtnPadded, compact && styles.saveBtnCompact]}
      onPress={() => {
        void (async () => {
          try {
            await onPress();
            dismiss();
          } catch {
            showToast(toastSaveError());
          }
        })();
      }}
    >
      <Text style={styles.saveBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GoalSheetCancelButton({
  label = 'Cancelar',
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  const { dismiss } = useBottomSheetDismiss();

  return (
    <Pressable
      style={styles.cancelBtn}
      onPress={() => {
        onPress?.();
        dismiss();
      }}
    >
      <Text style={styles.cancelBtnText}>{label}</Text>
    </Pressable>
  );
}

export const GOAL_SHEET_PAD = 16;

export function GoalSheetScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      nestedScrollEnabled
      contentContainerStyle={styles.scrollContent}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 8 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: GOAL_SHEET_PAD,
  },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headCopy: { flex: 1, minWidth: 0 },
  headTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: -0.24,
    color: '#202124',
  },
  headSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#737378',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hero: {
    position: 'relative',
    minHeight: 248,
    overflow: 'hidden',
  },
  ringWrap: {
    position: 'absolute',
    top: 0,
    left: -124,
    width: 248,
    height: 248,
  },
  ringLabel: {
    position: 'absolute',
    top: 100,
    left: 6,
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  ringPct: {
    fontFamily: fonts.medium,
    fontSize: 23,
    lineHeight: 26,
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
    color: '#202124',
    textAlign: 'center',
    alignSelf: 'center',
  },
  ringPctDouble: {
    letterSpacing: -0.85,
    transform: [{ translateX: -7 }],
  },
  ringPctTriple: {
    fontSize: 19,
    letterSpacing: -0.9,
    transform: [{ translateX: -9 }],
  },
  ringSub: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#686d72',
    textAlign: 'center',
    alignSelf: 'center',
    transform: [{ translateX: -2 }],
  },
  summaryCol: {
    width: '50%',
    marginLeft: 'auto',
    paddingTop: 24,
    paddingRight: GOAL_SHEET_PAD,
    paddingBottom: 20,
    paddingLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    zIndex: 1,
  },
  summaryToday: { alignItems: 'flex-end' },
  summaryRow: { alignItems: 'flex-end' },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#68737b',
    marginBottom: 3,
  },
  summaryTodayValue: {
    fontFamily: fonts.medium,
    fontSize: 26,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  summaryRowValue: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: '#202124',
    textAlign: 'right',
  },
  summarySmall: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  section: { paddingTop: 20, paddingHorizontal: GOAL_SHEET_PAD },
  sectionHead: { marginBottom: 4 },
  sectionTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#202124',
  },
  sectionSub: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#686d72',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: 20,
  },
  pickerSide: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSideText: {
    fontFamily: fonts.regular,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    color: '#9da1a5',
  },
  pickerSideDisabled: { color: '#d2d4d6' },
  pickerCenter: {
    flex: 1.15,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#cfd9ca',
  },
  pickerValue: {
    fontFamily: fonts.medium,
    fontSize: 26,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    color: '#1f2022',
  },
  pickerUnit: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#85898d',
    textAlign: 'center',
  },
  pickerHint: {
    marginTop: 9,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#85898d',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e2e6',
    borderRadius: 14,
    backgroundColor: '#f4f4f6',
  },
  tabsTwo: {},
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#121416',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#6c7074',
  },
  tabTextActive: {
    fontFamily: fonts.medium,
    color: '#202124',
  },
  saveBtn: {
    minHeight: 45,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#6f7863',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPadded: {
    marginHorizontal: GOAL_SHEET_PAD,
    alignSelf: 'stretch',
  },
  saveBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
  saveBtnCompact: {
    flex: 1,
    marginTop: 0,
    width: undefined,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: '#f2f2f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#202124',
  },
});
