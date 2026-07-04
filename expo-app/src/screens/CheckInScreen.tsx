import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useWeeklyCheckIn } from '@/hooks/useWeeklyCheckIn';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type TemplateStep = {
  id: string;
  type?: string;
  title?: string;
  question?: string;
  min?: number;
  max?: number;
};

type Template = {
  id: string;
  title: string;
  description?: string;
  frequency?: string;
  completedThisPeriod?: boolean;
  steps?: TemplateStep[];
};

function frequencyLabel(freq?: string) {
  if (freq === 'daily') return 'Diário';
  if (freq === 'monthly') return 'Mensal';
  return 'Semanal';
}

export default function CheckInScreen() {
  const router = useRouter();
  const { request } = usePatientApi();
  const { templates, loading, canOpenTemplate, loadCheckInAccess } = useWeeklyCheckIn();
  const [selected, setSelected] = useState<Template | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadCheckInAccess();
  }, [loadCheckInAccess]);

  const currentStep = selected?.steps?.[stepIndex];

  async function submitAnswers() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const payload = Object.entries(answers).map(([stepId, value]) => ({
        stepId,
        value,
      }));
      await request('/checkin/responses', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selected.id,
          answers: payload,
        }),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (!selected?.steps?.length) return;
    if (stepIndex < selected.steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    submitAnswers();
  }

  if (loading) {
    return (
      <PatientShell>
        <PatientHeader title="Check-ins" showBack backTo="/inicio" showBell={false} showMenu={false} />
        <LoadingScreen />
      </PatientShell>
    );
  }

  if (done) {
    return (
      <PatientShell>
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Check-in enviado!</Text>
          <Text style={styles.doneText}>Obrigada por compartilhar como foi sua semana.</Text>
          <CfButton label="Voltar ao início" onPress={() => router.replace('/inicio' as never)} />
        </View>
      </PatientShell>
    );
  }

  if (selected && currentStep) {
    const stepId = currentStep.id;
    const value = answers[stepId] || '';
    const isScale = currentStep.type === 'scale' || currentStep.min != null;

    return (
      <PatientShell withTabClearance={false}>
        <PatientHeader title={selected.title} showBack backTo="/check-in" showBell={false} showMenu={false} />
        <ScrollView contentContainerStyle={styles.flow}>
          <Text style={styles.stepCount}>
            Pergunta {stepIndex + 1} de {selected.steps?.length || 0}
          </Text>
          <Text style={styles.question}>{currentStep.question || currentStep.title}</Text>

          {isScale ? (
            <View style={styles.scaleRow}>
              {Array.from({ length: (currentStep.max || 5) - (currentStep.min || 1) + 1 }).map((_, i) => {
                const num = (currentStep.min || 1) + i;
                return (
                  <Pressable
                    key={num}
                    style={[styles.scaleBtn, value === String(num) && styles.scaleBtnActive]}
                    onPress={() => setAnswers((a) => ({ ...a, [stepId]: String(num) }))}
                  >
                    <Text style={[styles.scaleText, value === String(num) && styles.scaleTextActive]}>
                      {num}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              style={styles.textArea}
              value={value}
              onChangeText={(text) => setAnswers((a) => ({ ...a, [stepId]: text }))}
              placeholder="Sua resposta..."
              placeholderTextColor={colors.placeholder}
              multiline
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <CfButton
            label={stepIndex < (selected.steps?.length || 1) - 1 ? 'Continuar' : 'Enviar check-in'}
            loading={saving}
            disabled={!value.trim()}
            onPress={handleNext}
          />
        </ScrollView>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <PatientHeader title="Check-ins" showBack backTo="/inicio" showBell={false} showMenu={false} />
      <ScrollView contentContainerStyle={styles.list}>
        {!templates.length ? (
          <Text style={styles.empty}>Nenhum check-in disponível no momento.</Text>
        ) : null}
        {templates.map((tpl) => {
          const open = canOpenTemplate(tpl);
          return (
            <Pressable
              key={tpl.id}
              style={[styles.card, tpl.completedThisPeriod && styles.cardDone, !open && styles.cardLocked]}
              disabled={!open}
              onPress={() => {
                setSelected(tpl as Template);
                setStepIndex(0);
                setAnswers({});
              }}
            >
              <Text style={styles.cardTitle}>{tpl.title}</Text>
              {tpl.description ? <Text style={styles.cardDesc}>{tpl.description}</Text> : null}
              <Text style={styles.cardMeta}>{frequencyLabel(tpl.frequency)}</Text>
              {tpl.completedThisPeriod ? (
                <Text style={styles.badge}>Respondido</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },
  card: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardDone: { opacity: 0.7 },
  cardLocked: { opacity: 0.5 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16 },
  cardDesc: { fontFamily: fonts.regular, color: colors.textMuted },
  cardMeta: { fontFamily: fonts.semibold, color: colors.primaryDark, fontSize: 12 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    fontFamily: fonts.semibold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  flow: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[6] },
  stepCount: { fontFamily: fonts.medium, color: colors.textMuted },
  question: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  scaleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleText: { fontFamily: fonts.bold, fontSize: 16 },
  scaleTextActive: { color: '#fff' },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[3],
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  error: { color: colors.error, fontFamily: fonts.medium },
  done: { flex: 1, padding: spacing[5], justifyContent: 'center', gap: spacing[4] },
  doneTitle: { fontFamily: fonts.bold, fontSize: 24, textAlign: 'center' },
  doneText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
