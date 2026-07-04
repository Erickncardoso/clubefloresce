import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Sparkles } from 'lucide-react-native';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PatientShell from '@/components/PatientShell';
import { useAuth, type PatientProfileData } from '@/providers/AuthProvider';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Step = 'welcome' | 'gender' | 'birth' | 'measurements' | 'goal' | 'workouts' | 'target-weight' | 'complete';

const GENDER_OPTIONS = [
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
  { value: 'prefer_not_say', label: 'Prefiro não informar' },
];

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Perder peso' },
  { value: 'maintain', label: 'Manter peso' },
  { value: 'gain_weight', label: 'Ganhar peso' },
  { value: 'muscle', label: 'Ganhar massa muscular' },
  { value: 'health', label: 'Saúde e hábitos' },
];

const WORKOUT_OPTIONS = [
  { value: '0-2', label: '0–2 treinos' },
  { value: '3-5', label: '3–5 treinos' },
  { value: '6+', label: '6+ treinos' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { fetchOnboarding, saveProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<PatientProfileData>({
    gender: null,
    birthDate: '',
    heightCm: 165,
    weightKg: 70,
    targetWeightKg: 68,
    primaryGoal: null,
    workoutsPerWeek: null,
  });

  const needsTargetWeight = draft.primaryGoal === 'lose_weight' || draft.primaryGoal === 'gain_weight';
  const flowSteps = useMemo(() => {
    const steps: Step[] = ['gender', 'birth', 'measurements', 'goal', 'workouts'];
    if (needsTargetWeight) steps.push('target-weight');
    steps.push('complete');
    return steps;
  }, [needsTargetWeight]);

  useEffect(() => {
    (async () => {
      try {
        await fetchOnboarding(true);
      } catch {
        setError('Não foi possível carregar seu perfil.');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchOnboarding]);

  function goNext() {
    setError('');
    if (step === 'welcome') {
      setStep('gender');
      return;
    }
    const index = flowSteps.indexOf(step);
    if (index >= 0 && index < flowSteps.length - 1) {
      setStep(flowSteps[index + 1]);
    }
  }

  function goBack() {
    if (step === 'welcome') return;
    const index = flowSteps.indexOf(step);
    setStep(index <= 0 ? 'welcome' : flowSteps[index - 1]);
  }

  async function handleContinue() {
    setError('');
    if (step === 'complete') {
      setSaving(true);
      try {
        await saveProfile(draft, { complete: true });
        router.replace('/inicio' as never);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 'welcome') {
      goNext();
      return;
    }

    setSaving(true);
    try {
      const payload: PatientProfileData = {};
      if (step === 'gender') payload.gender = draft.gender;
      if (step === 'birth') payload.birthDate = draft.birthDate;
      if (step === 'measurements') {
        payload.heightCm = draft.heightCm;
        payload.weightKg = draft.weightKg;
      }
      if (step === 'goal') payload.primaryGoal = draft.primaryGoal;
      if (step === 'workouts') payload.workoutsPerWeek = draft.workoutsPerWeek;
      if (step === 'target-weight') payload.targetWeightKg = draft.targetWeightKg;
      await saveProfile(payload);
      goNext();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const continueDisabled =
    (step === 'gender' && !draft.gender)
    || (step === 'birth' && !draft.birthDate)
    || (step === 'measurements' && (draft.heightCm == null || draft.weightKg == null))
    || (step === 'goal' && !draft.primaryGoal)
    || (step === 'workouts' && !draft.workoutsPerWeek)
    || (step === 'target-weight' && draft.targetWeightKg == null);

  if (loading) {
    return <PatientShell withTabClearance={false}><LoadingScreen /></PatientShell>;
  }

  return (
    <PatientShell withTabClearance={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 'welcome' ? (
          <View style={styles.center}>
            <Sparkles color={colors.primary} size={36} />
            <Text style={styles.title}>Sua jornada no Clube Florescer começa aqui</Text>
            <Text style={styles.sub}>
              Algumas perguntas rápidas para montarmos seu perfil e a nutri acompanhar sua evolução.
            </Text>
          </View>
        ) : null}

        {step === 'gender' ? (
          <StepBlock title="Qual é o seu gênero?" sub="Usamos isso para calibrar seu plano.">
            {GENDER_OPTIONS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                selected={draft.gender === option.value}
                onPress={() => setDraft((d) => ({ ...d, gender: option.value }))}
              />
            ))}
          </StepBlock>
        ) : null}

        {step === 'birth' ? (
          <StepBlock title="Quando você nasceu?" sub="A idade ajuda a interpretar metas e evolução.">
            <FormField
              label="Data de nascimento (AAAA-MM-DD)"
              value={draft.birthDate || ''}
              onChangeText={(birthDate) => setDraft((d) => ({ ...d, birthDate }))}
              placeholder="1990-05-15"
            />
          </StepBlock>
        ) : null}

        {step === 'measurements' ? (
          <StepBlock title="Altura e peso" sub="Esses dados alimentam seu perfil.">
            <FormField
              label="Altura (cm)"
              value={String(draft.heightCm ?? '')}
              onChangeText={(v) => setDraft((d) => ({ ...d, heightCm: Number(v) || null }))}
              keyboardType="number-pad"
            />
            <FormField
              label="Peso atual (kg)"
              value={String(draft.weightKg ?? '')}
              onChangeText={(v) => setDraft((d) => ({ ...d, weightKg: Number(v) || null }))}
              keyboardType="decimal-pad"
            />
          </StepBlock>
        ) : null}

        {step === 'goal' ? (
          <StepBlock title="Qual é seu objetivo principal?" sub="Escolha o foco que mais combina com você.">
            {GOAL_OPTIONS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                selected={draft.primaryGoal === option.value}
                onPress={() => setDraft((d) => ({ ...d, primaryGoal: option.value }))}
              />
            ))}
          </StepBlock>
        ) : null}

        {step === 'workouts' ? (
          <StepBlock title="Quantos treinos por semana?" sub="Isso ajuda nas recomendações de energia.">
            {WORKOUT_OPTIONS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                selected={draft.workoutsPerWeek === option.value}
                onPress={() => setDraft((d) => ({ ...d, workoutsPerWeek: option.value }))}
              />
            ))}
          </StepBlock>
        ) : null}

        {step === 'target-weight' ? (
          <StepBlock title="Qual é seu peso desejado?" sub="Defina o peso que você quer alcançar.">
            <FormField
              label="Peso desejado (kg)"
              value={String(draft.targetWeightKg ?? '')}
              onChangeText={(v) => setDraft((d) => ({ ...d, targetWeightKg: Number(v) || null }))}
              keyboardType="decimal-pad"
            />
          </StepBlock>
        ) : null}

        {step === 'complete' ? (
          <View style={styles.center}>
            <Sparkles color={colors.primaryDark} size={32} />
            <Text style={styles.title}>Obrigada por confiar no Clube Florescer</Text>
            <Text style={styles.sub}>Agora vamos personalizar sua experiência com base no seu perfil.</Text>
            <View style={styles.privacy}>
              <Lock color={colors.primaryDark} size={18} />
              <Text style={styles.privacyTitle}>Sua privacidade importa</Text>
              <Text style={styles.privacyText}>
                Seus dados ficam seguros e são usados só para seu acompanhamento nutricional.
              </Text>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footer}>
          {step !== 'welcome' ? (
            <CfButton variant="ghost" label="Voltar" onPress={goBack} />
          ) : null}
          <CfButton
            label={step === 'complete' ? 'Entrar no app' : step === 'welcome' ? 'Começar' : 'Continuar'}
            loading={saving}
            disabled={continueDisabled}
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
    </PatientShell>
  );
}

function StepBlock({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <CfButton
      variant={selected ? 'primary' : 'ghost'}
      label={label}
      onPress={onPress}
      style={styles.optionBtn}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[6] },
  center: { alignItems: 'center', gap: spacing[3] },
  block: { gap: spacing[3] },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  options: { gap: spacing[3], marginTop: spacing[2] },
  optionBtn: { width: '100%' },
  privacy: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: radii.surface,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  privacyTitle: { fontFamily: fonts.bold, fontSize: 14 },
  privacyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.error, fontFamily: fonts.medium },
  footer: { gap: spacing[3], marginTop: spacing[4] },
});
