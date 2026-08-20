import { Pressable, Text, View } from 'react-native';
import { CalendarDays, MoreHorizontal, X } from 'lucide-react-native';
import { mealConfirmStyles as styles } from '@/components/bella/mealConfirmStyles';
import { colors } from '@/theme/tokens';

type Props = {
  light: boolean;
  capturedAt: string;
  onCancel: () => void;
  onWhen: () => void;
  onMore: () => void;
};

export default function MealConfirmHeaderBar({ light, capturedAt, onCancel, onWhen, onMore }: Props) {
  const fg = light ? '#fff' : colors.text;
  const chip = light ? 'rgba(0,0,0,0.35)' : 'transparent';
  return (
    <View style={styles.heroBar}>
      <Pressable
        style={[styles.roundBtn, { backgroundColor: chip }]}
        onPress={onCancel}
        accessibilityLabel="Fechar"
      >
        <X color={fg} size={18} strokeWidth={2.2} />
      </Pressable>
      <Pressable
        style={[styles.whenPill, { backgroundColor: chip }]}
        onPress={onWhen}
        accessibilityLabel="Alterar horário"
      >
        <CalendarDays color={fg} size={13} strokeWidth={1.8} />
        <Text style={[styles.whenText, { color: fg }]}>{capturedAt}</Text>
      </Pressable>
      <Pressable
        style={[styles.roundBtn, { backgroundColor: chip }]}
        onPress={onMore}
        accessibilityLabel="Mais"
      >
        <MoreHorizontal color={fg} size={18} />
      </Pressable>
    </View>
  );
}
