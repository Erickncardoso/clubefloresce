import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useOtaUpdateCheck } from '@/hooks/useOtaUpdateCheck';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

/** Baixa o OTA e recarrega sozinho — evita abrir na versão antiga. */
export default function OtaUpdatePrompt() {
  const { applying } = useOtaUpdateCheck();

  if (!applying) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto" accessibilityRole="alert">
      <View style={styles.dialog}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.title}>Atualizando o app</Text>
        <Text style={styles.copy}>Isso leva só alguns segundos. Você continua de onde parou.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 300,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
