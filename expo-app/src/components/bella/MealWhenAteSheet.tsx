import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { colors, fonts, radii } from '@/theme/tokens';

type Props = {
  open: boolean;
  value: Date;
  onClose: () => void;
  onConfirm: (next: Date) => void;
};

const ITEM = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(date: Date, today: Date) {
  const diff = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export default function MealWhenAteSheet({ open, value, onClose, onConfirm }: Props) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 10 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (9 - i));
      return date;
    });
  }, []);

  const [dayIndex, setDayIndex] = useState(9);
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  useEffect(() => {
    if (!open) return;
    const todayStart = startOfDay(new Date());
    const match = days.findIndex((day) => startOfDay(day) === startOfDay(value));
    setDayIndex(match >= 0 ? match : days.length - 1);
    setHour(value.getHours());
    setMinute(value.getMinutes());
  }, [days, open, value]);

  function handleDone() {
    const next = new Date(days[dayIndex]);
    next.setHours(hour, minute, 0, 0);
    onConfirm(next);
  }

  return (
    <AppleBottomSheet visible={open} onClose={onClose} maxHeightRatio={0.52} contentPadding={20} topRadius={36}>
      <Text style={styles.title}>Quando você comeu?</Text>
      <View style={styles.wheels}>
        <View style={styles.highlight} pointerEvents="none" />
        <Wheel
          data={days.map((day) => dayLabel(day, new Date()))}
          index={dayIndex}
          onChange={setDayIndex}
          flex={1.4}
        />
        <Wheel data={HOURS.map(pad)} index={hour} onChange={setHour} flex={0.7} />
        <Wheel data={MINUTES.map(pad)} index={minute} onChange={setMinute} flex={0.7} />
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
  flex,
}: {
  data: string[];
  index: number;
  onChange: (index: number) => void;
  flex: number;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM, animated: false });
  }, [index]);

  return (
    <ScrollView
      ref={ref}
      style={{ flex }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: ITEM * 2 }}
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
    flexDirection: 'row',
    marginBottom: 16,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM * 2,
    height: ITEM,
    borderRadius: radii.control,
    backgroundColor: '#ececec',
  },
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
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
});
