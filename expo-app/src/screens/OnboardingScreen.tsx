import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BellRing, Lock, Sparkles } from 'lucide-react-native';
import HealthDisclaimerBanner from '@/components/ui/HealthDisclaimerBanner';
import OnboardingHeightPicker from '@/components/onboarding/OnboardingHeightPicker';
import OnboardingOptionCard from '@/components/onboarding/OnboardingOptionCard';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import WeightRulerPicker from '@/components/evolucao/WeightRulerPicker';
import { BrandLogo } from '@/components/BrandLogo';
import CfButton from '@/components/ui/CfButton';
import FormField from '@/components/ui/FormField';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth, type PatientProfileData } from '@/providers/AuthProvider';
import { clearOnboardingLeft, markOnboardingLeft } from '@/notifications/registry';
import {
  activateOnboardingPushNotifications,
  finalizeOnboardingNotifications,
} from '@/notifications/onboarding-complete';
import {
  getPermissionState,
  openSystemNotificationSettings,
  permissionBlockedMessage,
  type PermissionState,
} from '@/notifications/permission';
import { patientAssets } from '@/lib/patient-assets';
import { maskBirthDateBr, parseBirthDateBrToIso } from '@/lib/masks';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Step = 'welcome' | 'gender' | 'birth' | 'measurements' | 'goal' | 'workouts' | 'target-weight' | 'complete';

const GENDER_OPTIONS = [
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
  { value: 'prefer_not_say', label: 'Prefiro não informar' },
];

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Perder peso', subtitle: 'Reduzir gordura com acompanhamento.' },
  { value: 'maintain', label: 'Manter peso', subtitle: 'Estabilidade e consistência.' },
  { value: 'gain_weight', label: 'Ganhar peso', subtitle: 'Aumento gradual e saudável.' },
  { value: 'muscle', label: 'Ganhar massa muscular', subtitle: 'Foco em composição corporal.' },
  { value: 'health', label: 'Saúde e hábitos', subtitle: 'Rotina, energia e bem-estar.' },
];

const WORKOUT_OPTIONS = [
  {
    value: '0-2',
    label: '0–2',
    subtitle: 'Treinos de vez em quando',
    dots: [{ col: 2, row: 2 }],
  },
  {
    value: '3-5',
    label: '3–5',
    subtitle: 'Alguns treinos por semana',
    dots: [{ col: 1, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 3 }],
  },
  {
    value: '6+',
    label: '6+',
    subtitle: 'Rotina intensa de treinos',
    dots: [
      { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
      { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { fetchOnboarding, saveProfile } = useAuth();
  const { request } = usePatientApi();
  const { preferences } = useNotificationPreferences();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pushPermission, setPushPermission] = useState<PermissionState>('undetermined');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState('');
  const [step, setStep] = useState<Step>('welcome');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [draft, setDraft] = useState<PatientProfileData>({
    gender: null,
    birthDate: '',
    heightCm: 165,
    weightKg: null,
    targetWeightKg: null,
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

  const progressTotal = flowSteps.length - 1;
  const progressIndex = (() => {
    const index = flowSteps.indexOf(step);
    return index >= 0 ? index + 1 : 0;
  })();

  const continueLabel = step === 'welcome'
    ? 'Começar'
    : step === 'complete'
      ? 'Entrar no app'
      : 'Continuar';

  const continueDisabled =
    (step === 'gender' && !draft.gender)
    || (step === 'birth' && !parseBirthDateBrToIso(birthDateInput))
    || (step === 'measurements' && (draft.heightCm == null || draft.weightKg == null))
    || (step === 'goal' && !draft.primaryGoal)
    || (step === 'workouts' && !draft.workoutsPerWeek)
    || (step === 'target-weight' && draft.targetWeightKg == null);

  const targetWeightHint = draft.primaryGoal === 'lose_weight' || draft.primaryGoal === 'gain_weight'
    ? 'Defina o peso que você quer alcançar.'
    : 'Selecione seu peso desejado.';

  const checkinPreferenceEnabled = preferences.find((item) => item.key === 'checkin')?.enabled !== false;

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

  useEffect(() => {
    return () => {
      if (step !== 'welcome' && step !== 'complete') {
        void markOnboardingLeft();
      }
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'complete') return;
    void getPermissionState().then(setPushPermission);
  }, [step]);

  function handleBirthDateChange(text: string) {
    const masked = maskBirthDateBr(text);
    setBirthDateInput(masked);
    const iso = parseBirthDateBrToIso(masked);
    setDraft((d) => ({ ...d, birthDate: iso || '' }));
  }

  function goBack() {
    setError('');
    if (step === 'welcome') return;
    const index = flowSteps.indexOf(step);
    setStep(index <= 0 ? 'welcome' : flowSteps[index - 1]);
  }

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

  async function handleActivatePush() {
    setPushError('');
    setPushLoading(true);
    try {
      const state = await activateOnboardingPushNotifications({
        request,
        checkinPreferenceEnabled,
      });
      setPushPermission(state);
      if (state === 'denied') {
        setPushError(permissionBlockedMessage(state));
      }
    } catch (err) {
      setPushError((err as Error).message || 'Não foi possível ativar as notificações.');
    } finally {
      setPushLoading(false);
    }
  }

  async function handleContinue() {
    setError('');

    if (step === 'complete') {
      setSaving(true);
      try {
        await saveProfile(draft, { complete: true });
        await clearOnboardingLeft();
        const sent = await finalizeOnboardingNotifications({
          request,
          checkinPreferenceEnabled,
        });
        if (!sent) {
          const latest = await getPermissionState();
          setPushPermission(latest);
        }
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

  if (loading) {
    return (
      <OnboardingShell showHeader={false} showFooter={false}>
        <View style={styles.loadingWrap}>
          <LoadingScreen />
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      showHeader={step !== 'welcome'}
      showBack={step !== 'welcome'}
      progressCurrent={step === 'welcome' ? 0 : progressIndex}
      progressTotal={step === 'welcome' ? 0 : progressTotal}
      continueLabel={continueLabel}
      continueDisabled={continueDisabled}
      saving={saving}
      onBack={goBack}
      onContinue={() => void handleContinue()}
      footerNote={error ? <Text style={styles.error}>{error}</Text> : null}
    >
      {step === 'welcome' ? (
        <View style={styles.welcome}>
          <View style={styles.welcomeHero}>
            <View style={styles.welcomeDevice}>
              <View style={styles.welcomeScreen}>
                <BrandLogo size="lg" animated />
              </View>
              <Image
                source={patientAssets.mockupIsa}
                style={styles.welcomeMockup}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          </View>
          <Text style={styles.title}>Sua jornada no Clube Florescer começa aqui</Text>
          <Text style={styles.sub}>
            Algumas perguntas rápidas para montarmos seu perfil e a nutri acompanhar sua evolução.
          </Text>
          <HealthDisclaimerBanner compact />
        </View>
      ) : null}

      {step === 'gender' ? (
        <View style={styles.step}>
          <Text style={styles.title}>Qual é o seu gênero?</Text>
          <Text style={styles.sub}>Usamos isso para calibrar seu plano e metas com mais precisão.</Text>
          <View style={styles.options}>
            {GENDER_OPTIONS.map((option) => (
              <OnboardingOptionCard
                key={option.value}
                title={option.label}
                selected={draft.gender === option.value}
                onPress={() => setDraft((d) => ({ ...d, gender: option.value }))}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 'birth' ? (
        <View style={styles.step}>
          <Text style={styles.title}>Quando você nasceu?</Text>
          <Text style={styles.sub}>A idade ajuda a nutricionista a interpretar metas e evolução.</Text>
          <FormField
            label="Data de nascimento"
            value={birthDateInput}
            onChangeText={handleBirthDateChange}
            placeholder="15/05/1990"
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
      ) : null}

      {step === 'measurements' ? (
        <View style={styles.step}>
          <Text style={styles.title}>Altura e peso</Text>
          <Text style={styles.sub}>Esses dados alimentam seu perfil e o acompanhamento semanal.</Text>
          <View style={styles.measureBlock}>
            <Text style={styles.measureLabel}>Altura</Text>
            <OnboardingHeightPicker
              value={draft.heightCm ?? 165}
              onChange={(heightCm) => setDraft((d) => ({ ...d, heightCm }))}
            />
          </View>
          <View style={[styles.measureBlock, styles.measureBlockLast]}>
            <Text style={styles.measureLabel}>Peso atual</Text>
            <WeightRulerPicker
              value={draft.weightKg ?? null}
              onChange={(weightKg) => setDraft((d) => ({ ...d, weightKg }))}
              min={40}
              max={180}
            />
          </View>
        </View>
      ) : null}

      {step === 'goal' ? (
        <View style={styles.step}>
          <Text style={styles.title}>Qual é seu objetivo principal?</Text>
          <Text style={styles.sub}>Escolha o foco que mais combina com você agora.</Text>
          <View style={styles.options}>
            {GOAL_OPTIONS.map((option) => (
              <OnboardingOptionCard
                key={option.value}
                title={option.label}
                subtitle={option.subtitle}
                selected={draft.primaryGoal === option.value}
                onPress={() => setDraft((d) => ({ ...d, primaryGoal: option.value }))}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 'workouts' ? (
        <View style={styles.step}>
          <Text style={styles.title}>Quantos treinos você faz por semana?</Text>
          <Text style={styles.sub}>Isso ajuda a ajustar recomendações de movimento e energia.</Text>
          <View style={styles.options}>
            {WORKOUT_OPTIONS.map((option) => (
              <OnboardingOptionCard
                key={option.value}
                title={option.label}
                subtitle={option.subtitle}
                iconDots={option.dots}
                selected={draft.workoutsPerWeek === option.value}
                onPress={() => setDraft((d) => ({ ...d, workoutsPerWeek: option.value }))}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 'target-weight' ? (
        <View style={styles.step}>
          <Text style={styles.title}>Qual é seu peso desejado?</Text>
          <Text style={styles.sub}>{targetWeightHint}</Text>
          <WeightRulerPicker
            value={draft.targetWeightKg ?? null}
            onChange={(targetWeightKg) => setDraft((d) => ({ ...d, targetWeightKg }))}
            min={40}
            max={180}
          />
        </View>
      ) : null}

      {step === 'complete' ? (
        <View style={[styles.step, styles.stepComplete]}>
          <View style={styles.completeBadge}>
            <Sparkles color={colors.primaryDark} size={32} />
          </View>
          <Text style={[styles.title, styles.titleCenter]}>Obrigada por confiar no Clube Florescer</Text>
          <Text style={[styles.sub, styles.subCenter]}>
            Agora vamos personalizar sua experiência com base no seu perfil.
          </Text>

          <View style={styles.privacyCard}>
            <Lock color={colors.primaryDark} size={18} />
            <Text style={styles.privacyTitle}>Sua privacidade importa</Text>
            <Text style={styles.privacyText}>
              Seus dados ficam seguros e são usados só para seu acompanhamento nutricional.
            </Text>
          </View>

          <View style={styles.pushCard}>
            <View style={styles.pushIconWrap}>
              <BellRing color={colors.primaryDark} size={18} />
            </View>
            <Text style={styles.pushTitle}>Ative as notificações</Text>
            <Text style={styles.pushCopy}>
              Receba lembretes de refeições, check-ins, mensagens da Bella e avisos da comunidade —
              mesmo com o app fechado.
            </Text>
            {pushPermission === 'granted' ? (
              <Text style={styles.pushOk}>Notificações ativas. Enviamos um aviso de teste em instantes.</Text>
            ) : (
              <>
                <CfButton
                  label={pushLoading ? 'Ativando…' : 'Ativar notificações'}
                  loading={pushLoading}
                  onPress={() => void handleActivatePush()}
                />
                {pushPermission === 'denied' ? (
                  <CfButton
                    variant="ghost"
                    label="Abrir ajustes do celular"
                    onPress={() => void openSystemNotificationSettings()}
                  />
                ) : null}
              </>
            )}
            {pushError ? <Text style={styles.error}>{pushError}</Text> : null}
          </View>
        </View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
  },
  welcome: {
    width: '100%',
    alignItems: 'center',
    gap: spacing[4],
  },
  welcomeHero: {
    width: '100%',
    maxWidth: 184,
    marginBottom: spacing[2],
  },
  welcomeDevice: {
    width: '100%',
    aspectRatio: 486 / 978,
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
  },
  welcomeScreen: {
    position: 'absolute',
    top: '5.5%',
    left: '5.5%',
    right: '5.5%',
    bottom: '6.7%',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeMockup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  step: {
    width: '100%',
    gap: spacing[3],
  },
  stepComplete: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  },
  titleCenter: {
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subCenter: {
    textAlign: 'center',
  },
  options: {
    gap: 10,
    width: '100%',
  },
  measureBlock: {
    width: '100%',
    marginBottom: spacing[4],
  },
  measureBlockLast: {
    marginBottom: 0,
  },
  measureLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 6,
  },
  completeBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0eb',
    marginBottom: spacing[3],
  },
  privacyCard: {
    width: '100%',
    marginTop: spacing[3],
    padding: spacing[4],
    borderRadius: radii.surface,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    gap: spacing[2],
  },
  privacyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  privacyText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pushCard: {
    width: '100%',
    marginTop: spacing[3],
    padding: spacing[4],
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing[3],
  },
  pushIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  pushCopy: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pushOk: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    fontFamily: fonts.medium,
    textAlign: 'center',
    fontSize: 13,
  },
});
