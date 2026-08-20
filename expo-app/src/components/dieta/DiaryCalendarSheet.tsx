import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { getLocalDateKey } from '@/lib/patient-local-time';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  open: boolean;
  selectedDateKey: string;
  onClose: () => void;
  onSelect: (dateKey: string) => void;
};

const ITEM = 40;
const HISTORY_DAYS = 365;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(date: Date, today: Date) {
  const diff = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff === 2) return 'Anteontem';
  return date
    .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace('.', '');
}

export default function DiaryCalendarSheet({ open, selectedDateKey, onClose, onSelect }: Props) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: HISTORY_DAYS }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (HISTORY_DAYS - 1 - i));
      return date;
    });
  }, []);

  const [dayIndex, setDayIndex] = useState(days.length - 1);

  useEffect(() => {
    if (!open) return;
    const match = days.findIndex((day) => getLocalDateKey(day) === selectedDateKey);
    setDayIndex(match >= 0 ? match : days.length - 1);
  }, [days, open, selectedDateKey]);

  function handleDone() {
    const selected = days[dayIndex] || new Date();
    onSelect(getLocalDateKey(selected));
    onClose();
  }

  return (
    <AppleBottomSheet visible={open} onClose={onClose} maxHeightRatio={0.52} contentPadding={20} topRadius={36}>
      <Text style={styles.title}>Qual dia foi?</Text>

      <View style={styles.wheels}>
        <View style={styles.highlight} pointerEvents="none" />
        <Wheel
          data={days.map((day) => dayLabel(day, new Date()))}
          index={dayIndex}
          onChange={setDayIndex}
        />
      </View>

      <Pressable style={styles.done} onPress={handleDone}>
        <Text style={styles.doneText}>Concluído</Text>
      </Pressable>
      <Pressable style={styles.cancel} onPress={onClose}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
    </AppleBottomSheet>
  );
}

function Wheel({
  data,
  index,
  onChange,
}: {
  data: string[];
  index: number;
  onChange: (index: number) => void;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM, animated: false });
  }, [index]);

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      contentContainerStyle={styles.wheelContent}
      onMomentumScrollEnd={(event) => {
        const next = Math.round(event.nativeEvent.contentOffset.y / ITEM);
        onChange(Math.max(0, Math.min(data.length - 1, next)));
      }}
    >
      {data.map((label, i) => (
        <View key={`${label}-${i}`} style={styles.item}>
          <Text style={styles.itemText} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'center',
    color: colors.text,
  },
  wheels: {
    height: ITEM * 5,
    marginBottom: 16,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM * 2,
    height: ITEM,
    borderRadius: radii.control,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  wheel: { flex: 1 },
  wheelContent: { paddingVertical: ITEM * 2 },
  item: {
    height: ITEM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.text,
  },
  done: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  cancel: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.primaryDark,
  },
});
