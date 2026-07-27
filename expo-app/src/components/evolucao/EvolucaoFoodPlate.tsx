import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FOOD_WEEKDAYS } from '@/lib/patient-goals-core';
import { colors, fonts, radii } from '@/theme/tokens';

type FoodPlateProps = {
  selectedDays: number[];
  todayIndex: number;
  onToggleDay: (index: number) => void;
};

export default function EvolucaoFoodPlate({ selectedDays, todayIndex, onToggleDay }: FoodPlateProps) {
  const selectedSet = new Set(selectedDays);
  const selectedCount = selectedDays.length;

  return (
    <View style={styles.root}>
      <Text style={styles.hint}>Toque nos dias em que você fez refeição livre</Text>
      <View style={styles.grid}>
        {FOOD_WEEKDAYS.map((day) => {
          const selected = selectedSet.has(day.index);
          const isToday = day.index === todayIndex;
          return (
            <Pressable
              key={day.index}
              style={[
                styles.chip,
                isToday && styles.chipToday,
                selected && styles.chipSelected,
              ]}
              onPress={() => onToggleDay(day.index)}
            >
              <Text style={[styles.chipShort, selected && styles.chipShortSelected]}>{day.short}</Text>
              <View style={[styles.checkWrap, selected && styles.checkWrapSelected]}>
                {selected ? <Check size={11} color="#fff" strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.summary}>
        <Text style={styles.summaryStrong}>{selectedCount}</Text>
        {' '}
        {selectedCount === 1 ? 'dia marcado' : 'dias marcados'} esta semana
      </Text>
      {selectedCount > 0 ? (
        <Text style={styles.note}>Toque em um dia marcado para desmarcar.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 5,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  chipToday: {
    borderWidth: 1.5,
    borderColor: 'rgba(157, 114, 104, 0.35)',
  },
  chipSelected: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#b8927a',
  },
  chipShort: {
    fontFamily: fonts.extrabold,
    fontSize: 10,
    color: colors.textMuted,
  },
  chipShortSelected: { color: '#9d7268' },
  checkWrap: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: '#e8ddd8',
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrapSelected: {
    backgroundColor: '#b8927a',
    borderColor: '#b8927a',
  },
  summary: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryStrong: {
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  note: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
