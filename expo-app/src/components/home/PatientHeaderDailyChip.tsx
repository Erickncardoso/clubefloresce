import { Pressable, StyleSheet, Text } from 'react-native';
import { Flame } from 'lucide-react-native';
import { colors, fonts } from '@/theme/tokens';

type Props = {
  activeStreak: number;
  onPress?: () => void;
};

/** Espelha `frontend/components/PatientHeaderDailyChip.vue` — streak no header. */
export default function PatientHeaderDailyChip({ activeStreak, onPress }: Props) {
  return (
    <Pressable
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={`${activeStreak} dias ativos consecutivos`}
      onPress={onPress}
    >
      <Flame color={colors.primaryDark} size={16} strokeWidth={2.2} />
      <Text style={styles.value}>{activeStreak}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 44,
    height: 44,
    paddingHorizontal: 6,
  },
  value: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
