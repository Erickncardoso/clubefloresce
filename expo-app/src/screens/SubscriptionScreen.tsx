import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { AlertCircle, CheckCircle2, Shield, Sparkles } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientScrollView from '@/components/ui/PatientScrollView';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useBilling } from '@/hooks/useBilling';
import { isPatientAccessExpired, isPatientFullAccessActive } from '@/lib/patient-access';
import { useAuth } from '@/providers/AuthProvider';
import { LEGAL_CONTACT_EMAIL } from '@/config/legal';
import {
  getNutritionistAccessMessage,
  getPaymentRequiredMessage,
  getSubscriptionScreenTitle,
} from '@/lib/platform-billing';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function SubscriptionScreen() {
  const { user, refreshUser } = useAuth();
  const { fetchSubscription } = useBilling();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<{
    userPlan?: string;
    accessExpiresAt?: string | null;
  } | null>(null);

  const screenTitle = getSubscriptionScreenTitle();
  const currentPlan = subscription?.userPlan || user?.plan || 'FREE';
  const accessExpiresAt = subscription?.accessExpiresAt || user?.accessExpiresAt || null;
  const accessExpired = isPatientAccessExpired(accessExpiresAt);
  const hasFullAccess = isPatientFullAccessActive(
    currentPlan,
    accessExpiresAt,
    user?.approvalEmailSentAt,
  );

  const accessMessage = getNutritionistAccessMessage(hasFullAccess, accessExpiresAt, accessExpired);

  const load = useCallback(async () => {
    setPageLoading(true);
    await refreshUser();
    const sub = await fetchSubscription();
    setSubscription(sub as typeof subscription);
    setPageLoading(false);
  }, [fetchSubscription, refreshUser]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRefreshAccess() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function openSupportEmail() {
    await Linking.openURL(
      `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent('Clube Florescer — meu acesso')}`,
    );
  }

  if (pageLoading) {
    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader />
        <LoadingScreen />
      </PatientShell>
    );
  }

  const heroTitle = hasFullAccess && !accessExpired ? 'Meu acesso' : 'Acesso pendente';
  const heroSub = accessExpired
    ? 'Seu período de acesso terminou. Fale com sua nutricionista se precisar de ajuda.'
    : hasFullAccess
      ? 'Confira até quando seu acesso está liberado no Clube Florescer.'
      : 'Quando sua nutricionista liberar seu acesso, toque em Sincronizar abaixo.';

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader />
      <PatientScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Sparkles color={colors.primary} size={28} />
          <Text style={styles.eyebrow}>Clube Florescer</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
        </View>

        {accessExpired ? (
          <View style={[styles.banner, styles.bannerAlert]}>
            <AlertCircle color={colors.error} size={20} />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Acesso expirado</Text>
              <Text style={styles.bannerText}>{accessMessage}</Text>
            </View>
          </View>
        ) : hasFullAccess ? (
          <View style={[styles.banner, styles.bannerOk]}>
            <CheckCircle2 color={colors.primary} size={20} />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Acesso ativo</Text>
              <Text style={styles.bannerText}>{accessMessage}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <Shield color={colors.primary} size={32} />
          <Text style={styles.statusTitle}>
            {hasFullAccess && !accessExpired ? 'Acesso vinculado à conta' : 'Aguardando liberação'}
          </Text>
          <Text style={styles.statusText}>
            {hasFullAccess && !accessExpired
              ? 'Use o botão abaixo para sincronizar seu acesso com o servidor.'
              : getPaymentRequiredMessage()}
          </Text>
          <CfButton
            label={refreshing ? 'Sincronizando…' : 'Sincronizar'}
            loading={refreshing}
            onPress={handleRefreshAccess}
          />
          <CfButton variant="ghost" label="Fale conosco" onPress={openSupportEmail} />
        </View>
      </PatientScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[6] },
  hero: { alignItems: 'center', gap: spacing[2] },
  eyebrow: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12, textTransform: 'uppercase' },
  heroTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  heroSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  banner: { flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderRadius: radii.control, borderWidth: 1 },
  bannerAlert: { backgroundColor: colors.errorSoft, borderColor: '#fecaca' },
  bannerOk: { backgroundColor: colors.primarySoft, borderColor: colors.border },
  bannerCopy: { flex: 1, gap: 4 },
  bannerTitle: { fontFamily: fonts.bold, color: colors.text },
  bannerText: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 14 },
  statusCard: {
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[5],
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  statusText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
});
