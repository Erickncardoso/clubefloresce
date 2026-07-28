import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  compact?: boolean;
};

/** Aviso visível exigido em apps de saúde/nutrição (Guideline 1.4.1 Apple). */
export default function HealthDisclaimerBanner({ compact = false }: Props) {
  return (
    <View
      style={[styles.banner, compact && styles.bannerCompact]}
      accessibilityRole="text"
      accessibilityLabel="Aviso de saúde: este app não substitui consulta médica ou emergência."
    >
      <AlertCircle color={colors.textMuted} size={compact ? 16 : 18} />
      <Text style={[styles.text, compact && styles.textCompact]}>
        O Clube Florescer apoia hábitos alimentares e bem-estar. Não substitui consulta médica,
        nutricional presencial ou atendimento de emergência.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.control,
    backgroundColor: 'rgba(139, 150, 124, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 150, 124, 0.22)',
  },
  bannerCompact: {
    padding: spacing[2],
  },
  text: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  textCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
});
