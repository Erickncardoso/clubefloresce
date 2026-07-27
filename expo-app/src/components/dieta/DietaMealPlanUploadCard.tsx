import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Upload } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  uploading?: boolean;
  error?: string;
  onUpload: (uri: string, name: string) => Promise<void>;
};

/** Espelha `frontend/components/dieta/MealPlanUploadCard.vue`. */
export default function DietaMealPlanUploadCard({ uploading = false, error = '', onUpload }: Props) {
  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await onUpload(asset.uri, asset.name || 'plano-alimentar.pdf');
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <FileText size={22} color={colors.primary} />
      </View>
      <Text style={styles.title}>Importe seu plano alimentar</Text>
      <Text style={styles.copy}>
        Envie o PDF prescrito pela nutricionista. Extraímos refeições, porções em gramas e ml,
        e opções de substituição automaticamente.
      </Text>

      <Pressable style={styles.btn} onPress={pickPdf} disabled={uploading}>
        <Upload size={16} color="#fff" />
        <Text style={styles.btnText}>{uploading ? 'Processando PDF…' : 'Selecionar PDF'}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>Formato compatível: planejamento exportado em texto (ex.: WebDiet / Dietbox).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[3],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, textAlign: 'center' },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.control,
  },
  btnText: { fontFamily: fonts.bold, color: '#fff', fontSize: 14 },
  error: { fontFamily: fonts.medium, color: colors.error, textAlign: 'center', fontSize: 13 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
