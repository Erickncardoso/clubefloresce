import { StyleSheet, Text, View } from 'react-native';
import { Beef, Droplets, Wheat } from 'lucide-react-native';
import { formatMacro } from '@/lib/meal-confirm-display';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  grams: number;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  compact?: boolean;
};

export default function MealConfirmMacroGrid({
  grams,
  caloriesKcal,
  carbsG,
  proteinG,
  fatG,
  compact = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      {compact ? null : (
        <>
          <Text style={styles.kicker}>Calorias e macros</Text>
          <View style={styles.row}>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Quantidade</Text>
              <Text style={styles.heroValue}>{grams} g</Text>
            </View>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Calorias</Text>
              <Text style={styles.heroValue}>{Math.round(caloriesKcal)}</Text>
            </View>
          </View>
        </>
      )}
      <View style={styles.row}>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Carboidratos</Text>
          <Wheat color="#c9842a" size={18} strokeWidth={1.8} />
          <Text style={styles.macroValue}>{formatMacro(carbsG)} g</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Proteína</Text>
          <Beef color="#c45c4a" size={18} strokeWidth={1.8} />
          <Text style={styles.macroValue}>{formatMacro(proteinG)} g</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Gordura</Text>
          <Droplets color="#5a9a4a" size={18} strokeWidth={1.8} />
          <Text style={styles.macroValue}>{formatMacro(fatG)} g</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  heroCard: {
    flex: 1,
    minHeight: 78,
    padding: spacing[3],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  heroValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.text,
  },
  macroCard: {
    flex: 1,
    minHeight: 92,
    padding: spacing[3],
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    gap: 6,
  },
  macroLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  macroValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: 'auto',
  },
});
