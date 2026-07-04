import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, CreditCard, QrCode, Sparkles } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useBilling } from '@/hooks/useBilling';
import {
  isPatientAccessExpired,
  isPatientPaidAccessActive,
} from '@/lib/patient-access';
import {
  formatCurrency,
  formatDateBr,
  planLabel,
} from '@/lib/format';
import {
  maskCardExpiry,
  maskCardNumber,
  maskCpf,
  maskCvv,
  onlyDigits,
} from '@/lib/masks';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type BillingPlan = {
  id: string;
  label: string;
  description?: string;
  monthlyAmount: number;
  priceSuffix?: string;
};

type BillingConfig = {
  enabled?: boolean;
  testMode?: boolean;
  publicKey?: string;
  plans?: BillingPlan[];
  payer?: { email?: string; name?: string };
};

type PixPayload = {
  qrCode?: string;
  qr_code?: string;
  qrCodeBase64?: string;
  qr_code_base64?: string;
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const {
    loading,
    error,
    setError,
    fetchConfig,
    fetchSubscription,
    subscribeWithPix,
    subscribeWithCard,
  } = useBilling();

  const [pageLoading, setPageLoading] = useState(true);
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [subscription, setSubscription] = useState<{
    userPlan?: string;
    accessExpiresAt?: string | null;
  } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('PREMIUM');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('pix');
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'pix-waiting'>('idle');
  const [pixData, setPixData] = useState<PixPayload>({});
  const [pixCopied, setPixCopied] = useState(false);
  const [pollingPix, setPollingPix] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');

  const plans = billingConfig?.plans || [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const currentPlan = subscription?.userPlan || user?.plan || 'FREE';
  const accessExpiresAt = subscription?.accessExpiresAt || user?.accessExpiresAt || null;
  const accessExpired = isPatientAccessExpired(accessExpiresAt);
  const needsFirstPayment = !isPatientPaidAccessActive(
    currentPlan,
    accessExpiresAt,
    user?.approvalEmailSentAt,
  );

  const pixCopyCode = String(pixData.qrCode || pixData.qr_code || '').trim();

  const load = useCallback(async () => {
    setPageLoading(true);
    setError('');
    await refreshUser();
    const [config, sub] = await Promise.all([fetchConfig(), fetchSubscription()]);
    setBillingConfig(config as BillingConfig);
    setSubscription(sub as typeof subscription);
    if ((config as BillingConfig)?.plans?.length) {
      setSelectedPlanId((config as BillingConfig).plans![0].id);
    }
    setPageLoading(false);
  }, [fetchConfig, fetchSubscription, refreshUser, setError]);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  async function completeSuccess() {
    await refreshUser();
    router.replace('/assinatura/obrigado' as never);
  }

  async function refreshSubscription() {
    setPollingPix(true);
    const sub = await fetchSubscription();
    setSubscription(sub as typeof subscription);
    const paid = isPatientPaidAccessActive(
      (sub as { userPlan?: string })?.userPlan || currentPlan,
      (sub as { accessExpiresAt?: string | null })?.accessExpiresAt,
      user?.approvalEmailSentAt,
    );
    setPollingPix(false);
    if (paid) await completeSuccess();
  }

  function startPixPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void refreshSubscription();
    }, 5000);
  }

  async function startPixCheckout() {
    const cpf = onlyDigits(identificationNumber, 11);
    if (cpf.length !== 11) {
      setError('Informe seu CPF para gerar o Pix.');
      return;
    }
    setError('');
    try {
      const result = await subscribeWithPix({
        planId: selectedPlanId,
        payerIdentification: { type: 'CPF', number: cpf },
      });
      const pix = (result as { pix?: PixPayload })?.pix || result as PixPayload;
      setPixData(pix);
      setCheckoutStep('pix-waiting');
      startPixPolling();
    } catch {
      /* error set in hook */
    }
  }

  async function submitCardCheckout() {
    if (!billingConfig?.publicKey) {
      setError('Checkout indisponível.');
      return;
    }
    setError('');
    try {
      await subscribeWithCard({
        publicKey: billingConfig.publicKey,
        planId: selectedPlanId,
        payerEmail: String(billingConfig.payer?.email || user?.email || ''),
        payerName: cardholderName || String(billingConfig.payer?.name || user?.name || ''),
        amount: selectedPlan?.monthlyAmount || 0,
        card: {
          cardholderName,
          cardNumber,
          expirationDate,
          securityCode,
          identificationNumber,
        },
      });
      await completeSuccess();
    } catch {
      /* hook */
    }
  }

  async function copyPixCode() {
    if (!pixCopyCode) return;
    await Clipboard.setStringAsync(pixCopyCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  }

  const heroTitle = useMemo(
    () => (needsFirstPayment ? 'Finalize sua assinatura' : 'Renovar assinatura'),
    [needsFirstPayment],
  );

  if (pageLoading) {
    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader title="Assinatura" showBack={!needsFirstPayment} backTo="/perfil" showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader
        title="Assinatura"
        showBack={!needsFirstPayment}
        backTo="/perfil"
        showBell={false}
        showMenu={false}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Sparkles color={colors.primary} size={28} />
          <Text style={styles.eyebrow}>Clube Florescer</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSub}>
            {needsFirstPayment
              ? 'Último passo para liberar dieta, Bella IA e check-ins no app.'
              : 'Mantenha seu acesso sem interrupção.'}
          </Text>
        </View>

        {accessExpired ? (
          <View style={[styles.banner, styles.bannerAlert]}>
            <AlertCircle color={colors.error} size={20} />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Seu acesso expirou</Text>
              <Text style={styles.bannerText}>Renove sua assinatura para continuar usando o Clube Florescer.</Text>
            </View>
          </View>
        ) : currentPlan !== 'FREE' ? (
          <View style={[styles.banner, styles.bannerOk]}>
            <CheckCircle2 color={colors.primary} size={20} />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Plano {planLabel(currentPlan)}</Text>
              <Text style={styles.bannerText}>
                {accessExpiresAt ? `Acesso até ${formatDateBr(accessExpiresAt)}` : 'Assinatura ativa'}
              </Text>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!billingConfig?.enabled ? (
          <View style={styles.emptyCard}>
            <CreditCard color={colors.textMuted} size={32} />
            <Text style={styles.emptyTitle}>Pagamentos em configuração</Text>
            <Text style={styles.emptyText}>A nutricionista ainda está configurando os pagamentos.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Escolha seu plano</Text>
            <View style={styles.planList}>
              {plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={[styles.planCard, selectedPlanId === plan.id && styles.planCardActive]}
                  onPress={() => setSelectedPlanId(plan.id)}
                >
                  <Text style={styles.planName}>{plan.label}</Text>
                  <Text style={styles.planPrice}>
                    {formatCurrency(plan.monthlyAmount)}
                    <Text style={styles.planSuffix}> {plan.priceSuffix || '/mês'}</Text>
                  </Text>
                  {plan.description ? <Text style={styles.planDesc}>{plan.description}</Text> : null}
                </Pressable>
              ))}
            </View>

            <View style={styles.paymentCard}>
              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tab, paymentMethod === 'card' && styles.tabActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <CreditCard size={18} color={paymentMethod === 'card' ? colors.primary : colors.textMuted} />
                  <Text style={styles.tabText}>Cartão</Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, paymentMethod === 'pix' && styles.tabActive]}
                  onPress={() => setPaymentMethod('pix')}
                >
                  <QrCode size={18} color={paymentMethod === 'pix' ? colors.primary : colors.textMuted} />
                  <Text style={styles.tabText}>Pix</Text>
                </Pressable>
              </View>

              {checkoutStep === 'pix-waiting' ? (
                <View style={styles.pixBox}>
                  <Text style={styles.pixTitle}>Pague com Pix</Text>
                  <Text style={styles.pixAmount}>{formatCurrency(selectedPlan?.monthlyAmount || 0)}</Text>
                  {pixData.qrCodeBase64 || pixData.qr_code_base64 ? (
                    <Image
                      source={{
                        uri: `data:image/png;base64,${pixData.qrCodeBase64 || pixData.qr_code_base64}`,
                      }}
                      style={styles.qr}
                    />
                  ) : null}
                  {pixCopyCode ? (
                    <>
                      <Text style={styles.copyLabel}>Pix copia e cola</Text>
                      <Text selectable style={styles.copyCode}>{pixCopyCode}</Text>
                      <CfButton
                        label={pixCopied ? 'Copiado!' : 'Copiar Pix copia e cola'}
                        onPress={copyPixCode}
                      />
                    </>
                  ) : null}
                  <CfButton
                    variant="ghost"
                    label={pollingPix ? 'Verificando…' : 'Já paguei — verificar'}
                    loading={pollingPix}
                    onPress={refreshSubscription}
                  />
                </View>
              ) : paymentMethod === 'pix' ? (
                <View style={styles.form}>
                  <Text style={styles.hint}>
                    Informe seu CPF para gerar o QR Code ou o Pix copia e cola.
                  </Text>
                  <FormField
                    label="CPF"
                    value={identificationNumber}
                    onChangeText={(v) => setIdentificationNumber(maskCpf(v))}
                    keyboardType="number-pad"
                  />
                  <CfButton
                    label={loading ? 'Gerando Pix…' : `Gerar Pix — ${formatCurrency(selectedPlan?.monthlyAmount || 0)}`}
                    loading={loading}
                    onPress={startPixCheckout}
                  />
                </View>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.hint}>
                    Cobrança mensal de {formatCurrency(selectedPlan?.monthlyAmount || 0)} no cartão.
                  </Text>
                  <FormField label="Nome no cartão" value={cardholderName} onChangeText={setCardholderName} />
                  <FormField
                    label="Número do cartão"
                    value={cardNumber}
                    onChangeText={(v) => setCardNumber(maskCardNumber(v))}
                    keyboardType="number-pad"
                  />
                  <FormField
                    label="Validade"
                    value={expirationDate}
                    onChangeText={(v) => setExpirationDate(maskCardExpiry(v))}
                    keyboardType="number-pad"
                  />
                  <FormField
                    label="CVV"
                    value={securityCode}
                    onChangeText={(v) => setSecurityCode(maskCvv(v))}
                    keyboardType="number-pad"
                    secureTextEntry
                  />
                  <FormField
                    label="CPF do titular"
                    value={identificationNumber}
                    onChangeText={(v) => setIdentificationNumber(maskCpf(v))}
                    keyboardType="number-pad"
                  />
                  <CfButton
                    label={loading ? 'Processando…' : 'Assinar com cartão'}
                    loading={loading}
                    onPress={submitCardCheckout}
                  />
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  error: { color: colors.error, fontFamily: fonts.medium },
  emptyCard: {
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[5],
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18 },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  planList: { gap: spacing[3] },
  planCard: {
    padding: spacing[4],
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  planName: { fontFamily: fonts.bold, fontSize: 16 },
  planPrice: { fontFamily: fonts.extrabold, fontSize: 22, marginTop: 4 },
  planSuffix: { fontFamily: fonts.medium, fontSize: 14 },
  planDesc: { fontFamily: fonts.regular, color: colors.textMuted, marginTop: 4 },
  paymentCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[4],
  },
  tabs: { flexDirection: 'row', gap: spacing[2] },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, color: colors.text },
  form: { gap: spacing[3] },
  hint: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 14 },
  pixBox: { gap: spacing[3], alignItems: 'center' },
  pixTitle: { fontFamily: fonts.bold, fontSize: 18 },
  pixAmount: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.primary },
  qr: { width: 220, height: 220, borderRadius: radii.control },
  copyLabel: { alignSelf: 'flex-start', fontFamily: fonts.semibold, fontSize: 13 },
  copyCode: {
    width: '100%',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
  },
});
