import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

type Dot = { col: number; row: number };

type Props = {
  title: string;
  subtitle?: string;
  selected?: boolean;
  iconDots?: Dot[] | null;
  onPress: () => void;
};

function DotGrid({ dots, selected }: { dots: Dot[]; selected: boolean }) {
  const cells = Array.from({ length: 9 }, (_, index) => {
    const col = (index % 3) + 1;
    const row = Math.floor(index / 3) + 1;
    return dots.some((dot) => dot.col === col && dot.row === row);
  });

  return (
    <View style={styles.iconGrid}>
      {cells.map((active, index) => (
        <View key={index} style={styles.iconCell}>
          {active ? (
            <View style={[styles.dot, selected && styles.dotSelected]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function OnboardingOptionCard({
  title,
  subtitle,
  selected = false,
  iconDots,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
    >
      {iconDots?.length ? <DotGrid dots={iconDots} selected={selected} /> : null}
      <View style={styles.copy}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>{subtitle}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 17,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  cardSelected: {
    backgroundColor: colors.primaryDark,
  },
  iconGrid: {
    width: 30,
    height: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconCell: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.text,
    opacity: 0.85,
  },
  dotSelected: {
    backgroundColor: '#fff',
  },
  copy: {
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  titleSelected: {
    color: '#fff',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    opacity: 0.72,
    textAlign: 'center',
  },
  subtitleSelected: {
    color: '#fff',
    opacity: 0.92,
  },
});
