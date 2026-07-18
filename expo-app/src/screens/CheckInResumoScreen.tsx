import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import {
  buildAnswerRows,
  formatCheckinPeriod,
  scoreFromTemplateAnswers,
} from '@/lib/checkin-answers';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type CheckinResponse = {
  periodKey?: string;
  template?: { title?: string; frequency?: string; steps?: Array<{ id: string; label?: string; question?: string; type?: string }> };
  answers?: Record<string, unknown>;
};

const SCORE_LABELS = [
  { min: 80, label: 'Muito bom!', msg: 'Você teve uma semana incrível! Pequenas escolhas diárias geram grandes transformações.' },
  { min: 60, label: 'Bom!', msg: 'Boa evolução! Continue cuidando dos seus hábitos.' },
  { min: 0, label: 'Regular', msg: 'Cada semana é uma nova chance. Vamos juntos na próxima!' },
];

function tagFromText(text: string) {
  if (/Excelente|Boa|Sim/.test(text)) return styles.tagOk;
  if (/Regular|copos| L/.test(text)) return styles.tagWarn;
  if (/Ruim|Péssimo|Não/.test(text)) return styles.tagBad;
  return null;
}

export default function CheckInResumoScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<CheckinResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await request<{ responses?: CheckinResponse[] }>('/checkin/me/responses');
        setCurrent(data.responses?.[0] || null);
      } catch {
        router.replace('/check-in' as never);
      } finally {
        setLoading(false);
      }
    })();
  }, [request, router]);

  const score = useMemo(() => scoreFromTemplateAnswers(current?.answers) ?? 0, [current]);
  const scoreMeta = SCORE_LABELS.find((item) => score >= item.min) || SCORE_LABELS[2];
  const weekRange = current
    ? formatCheckinPeriod(current.periodKey, current.template?.frequency)
    : '';

  const summaryItems = useMemo(() => {
    if (!current?.template?.steps || !current.answers) return [];
    return buildAnswerRows(current.template.steps, current.answers).map((row) => ({
      ...row,
      tagStyle: tagFromText(row.value),
    }));
  }, [current]);

  if (loading) {
    return (
      <PatientShell>
        <PatientHeader title="Resumo da Semana" subtitle={weekRange} showBack backTo="/check-in" showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader title="Resumo da Semana" subtitle={weekRange} showBack backTo="/check-in" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {!current ? (
          <Text style={styles.empty}>Você ainda não respondeu o check-in desta semana.</Text>
        ) : (
          <>
            <View style={styles.ringWrap}>
              <View style={styles.ring}>
                <Text style={styles.ringValue}>{score}%</Text>
                <Text style={styles.ringLabel}>{scoreMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.message}>{scoreMeta.msg}</Text>
            <View style={styles.list}>
              {summaryItems.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={[styles.tag, item.tagStyle]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <CfButton label="Ver histórico completo" onPress={() => router.push('/check-in/historico' as never)} />
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[6] },
  empty: { textAlign: 'center', color: colors.textMuted, fontFamily: fonts.regular, marginVertical: spacing[6] },
  ringWrap: { alignItems: 'center' },
  ring: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 10,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  ringValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.primaryDark },
  ringLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  message: { textAlign: 'center', color: colors.textMuted, lineHeight: 22, fontFamily: fonts.regular },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.control, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14 },
  tag: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  tagOk: { color: colors.primaryDark },
  tagWarn: { color: '#c4842e' },
  tagBad: { color: colors.error },
});
