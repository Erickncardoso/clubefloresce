import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import DiaryCalendarSheet from '@/components/dieta/DiaryCalendarSheet';
import { useDiaryDate } from '@/hooks/useDiaryDate';
import {
  diaryDateChipOffset,
  formatDiaryDateLabel,
  formatDiaryDatePillLabel,
} from '@/lib/diary-date';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  /** `chips` = Hoje/Ontem/Anteontem + calendário. `pill` = só data centralizada (Dieta). */
  variant?: 'chips' | 'pill';
  /** Remove espaçamento extra quando a pill fica ao lado de outro botão. */
  inline?: boolean;
};

export default function DiaryDatePicker({ variant = 'chips', inline = false }: Props) {
  const { selectedDateKey, setDateOffset, setDateKey, diaryDateOptions, isToday } = useDiaryDate();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedOffset = useMemo(
    () => diaryDateChipOffset(selectedDateKey),
    [selectedDateKey],
  );

  const calendarActive = selectedOffset == null;
  const pillLabel = formatDiaryDatePillLabel(selectedDateKey);
  const filtered = !isToday;

  if (variant === 'pill') {
    return (
      <>
        <View style={[styles.pillWrap, inline && styles.pillWrapInline]}>
          <Pressable
            style={[styles.pillBtn, filtered && styles.pillBtnFiltered]}
            accessibilityRole="button"
            accessibilityLabel={`Dia do consumo: ${pillLabel}`}
            onPress={() => setCalendarOpen(true)}
          >
            <CalendarDays
              color={filtered ? '#fff' : colors.primaryDark}
              size={14}
              strokeWidth={2}
            />
            <Text style={[styles.pillLabel, filtered && styles.pillLabelFiltered]} numberOfLines={1}>
              {pillLabel}
            </Text>
          </Pressable>
        </View>

        <DiaryCalendarSheet
          open={calendarOpen}
          selectedDateKey={selectedDateKey}
          onClose={() => setCalendarOpen(false)}
          onSelect={setDateKey}
        />
      </>
    );
  }

  const calendarLabel = calendarActive ? formatDiaryDateLabel(selectedDateKey) : '';

  return (
    <>
      <View style={styles.row} accessibilityRole="tablist">
        {diaryDateOptions.map((option) => {
          const active = selectedOffset === option.offset;
          return (
            <Pressable
              key={option.id}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setDateOffset(option.offset)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.calendarBtn, calendarActive && styles.calendarBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="Escolher data no calendário"
          onPress={() => setCalendarOpen(true)}
        >
          <CalendarDays
            color={calendarActive ? '#fff' : colors.textMuted}
            size={15}
            strokeWidth={2}
          />
          {calendarActive && calendarLabel ? (
            <Text style={styles.calendarLabel} numberOfLines={1}>{calendarLabel}</Text>
          ) : null}
        </Pressable>
      </View>

      <DiaryCalendarSheet
        open={calendarOpen}
        selectedDateKey={selectedDateKey}
        onClose={() => setCalendarOpen(false)}
        onSelect={setDateKey}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  pillWrapInline: {
    paddingBottom: 0,
    alignItems: 'flex-start',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  pillBtnFiltered: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pillLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  pillLabelFiltered: {
    color: '#fff',
  },
  row: { flexDirection: 'row', gap: 6, paddingBottom: 12 },
  chip: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: '#fff' },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  calendarBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  calendarLabel: {
    maxWidth: 56,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#fff',
  },
});
