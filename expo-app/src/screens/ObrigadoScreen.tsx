import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/providers/AuthProvider';
import { isPatientPaidAccessActive } from '@/lib/patient-access';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function ObrigadoScreen() {
  const router = useRouter();
  const { resolvePostLoginRoute } = useAuth();
  const { fetchSubscription } = useBilling();
  const [loading, setLoading] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sub = await fetchSubscription() as {
        userPlan?: string;
        accessExpiresAt?: string | null;
      } | null;
      if (!isPatientPaidAccessActive(sub?.userPlan, sub?.accessExpiresAt)) {
        router.replace('/assinatura' as never);
        return;
      }
      setAccessExpiresAt(sub?.accessExpiresAt || null);
    })();
  }, [fetchSubscription, router]);

  async function goNext() {
    setLoading(true);
    try {
      const route = await resolvePostLoginRoute();
      router.replace(route as never);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PatientShell withTabClearance={false}>
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <CheckCircle2 color={colors.primary} size={40} />
          </View>
          <Text style={styles.title}>Bem-vinda ao Clube Florescer!</Text>
          <Text style={styles.sub}>Seu pagamento foi confirmado e seu acesso está liberado.</Text>
          {accessExpiresAt ? (
            <Text style={styles.access}>
              Válido até <Text style={styles.accessStrong}>
                {new Date(accessExpiresAt).toLocaleDateString('pt-BR')}
              </Text>
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Sparkles color={colors.primary} size={24} />
          <Text style={styles.cardTitle}>Tudo pronto para começar</Text>
          <Text style={styles.listItem}>• Dieta personalizada</Text>
          <Text style={styles.listItem}>• Bella IA no seu dia a dia</Text>
          <Text style={styles.listItem}>• Check-ins e acompanhamento</Text>
          <Text style={styles.note}>Enviamos a confirmação no seu e-mail e WhatsApp.</Text>
          <CfButton label={loading ? 'Carregando…' : 'Começar agora'} loading={loading} onPress={goNext} />
        </View>
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing[5], gap: spacing[5] },
  hero: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4] },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 24, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  access: { fontFamily: fonts.regular, color: colors.textMuted },
  accessStrong: { fontFamily: fonts.bold, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[3],
    alignItems: 'center',
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 18 },
  listItem: { alignSelf: 'stretch', fontFamily: fonts.regular },
  note: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', fontSize: 13 },
});
