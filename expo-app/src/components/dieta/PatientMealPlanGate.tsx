import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Upload } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { usePatientMealPlan } from '@/hooks/usePatientMealPlan';
import { isPatientCheckoutPath } from '@/lib/patient-access';
import { isPatientPublicPath } from '@/lib/patient-routes';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

/** Espelha `showMealPlanGate` em `cliente/app.vue`. */
export function useShowMealPlanGate() {
  const pathname = usePathname() || '/';
  const path = pathname.split('?')[0];
  const { hasSession } = useAuth();
  const { hasPlan, planChecked, loading } = usePatientMealPlan();

  if (!hasSession) return false;
  if (isPatientPublicPath(path) || isPatientCheckoutPath(path)) return false;
  if (path.startsWith('/onboarding')) return false;
  if (!planChecked || loading) return false;
  return !hasPlan;
}

/** Popup obrigatório ao entrar sem plano — o PWA já tinha; o app nativo não. */
export default function PatientMealPlanGate() {
  const open = useShowMealPlanGate();
  const { uploading, error, uploadPdf } = usePatientMealPlan();

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      await uploadPdf(asset.uri, asset.name || 'plano-alimentar.pdf');
    } catch {
      /* erro no hook */
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View style={styles.dialog} accessibilityRole="alert">
          <View style={styles.iconWrap}>
            <FileText size={20} color={colors.primary} />
          </View>
          <Text style={styles.title}>Envie sua dieta para começar</Text>
          <Text style={styles.copy}>
            Antes de usar o app, importe o PDF do seu plano alimentar prescrito pela nutricionista.
            Extraímos refeições, porções e substituições automaticamente.
          </Text>
          <Pressable
            style={[styles.btn, uploading && styles.btnDisabled]}
            disabled={uploading}
            onPress={() => void pickPdf()}
          >
            <Upload size={16} color="#fff" />
            <Text style={styles.btnText}>
              {uploading ? 'Processando PDF…' : 'Enviar PDF da dieta'}
            </Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.hint}>Use o PDF do plano alimentar enviado pela sua nutricionista.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    borderRadius: radii.control,
  },
  btnDisabled: { opacity: 0.9 },
  btnText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 13 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.error, textAlign: 'center' },
  hint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.textMuted, textAlign: 'center' },
});
