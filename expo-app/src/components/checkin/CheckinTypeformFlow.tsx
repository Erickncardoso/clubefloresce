import { useCallback, useEffect, useMemo, useState } from 'react';
import { markCheckinDraftStarted } from '@/notifications/registry';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, ChevronUp } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export type CheckinFlowStep = {
  id: string;
  type?: string;
  label?: string;
  question?: string;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  yesLabel?: string;
  noLabel?: string;
  options?: Array<string | { value?: string; label?: string }>;
};

type Props = {
  steps: CheckinFlowStep[];
  saving?: boolean;
  submitted?: boolean;
  error?: string;
  showHistoryLink?: boolean;
  onSubmit: (answers: Record<string, unknown>) => void;
};

const FOOD_FACES = [
  { value: 1, emoji: '😫', label: 'Muito ruim' },
  { value: 2, emoji: '😕', label: 'Ruim' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Boa' },
  { value: 5, emoji: '😄', label: 'Excelente' },
];

function normalizeStep(step: CheckinFlowStep, index: number): CheckinFlowStep {
  return {
    ...step,
    id: step.id || `step_${index}`,
    type: step.type || 'text',
    question: step.question || step.label || 'Pergunta',
    yesLabel: step.yesLabel || 'Sim',
    noLabel: step.noLabel || 'Não',
  };
}

function stepperConfig(step: CheckinFlowStep) {
  const min = Number(step.min);
  const max = Number(step.max);
  const increment = Number(step.step);
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 5,
    step: Number.isFinite(increment) && increment > 0 ? increment : 0.25,
    defaultValue: Number.isFinite(Number(step.defaultValue)) ? Number(step.defaultValue) : 0,
  };
}

function formatStepperValue(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  if (rounded % 1 === 0) return String(rounded);
  return rounded.toFixed(2).replace(/0$/, '').replace(/\.$/, '').replace('.', ',');
}

export default function CheckinTypeformFlow({
  steps,
  saving = false,
  submitted = false,
  error = '',
  showHistoryLink = false,
  onSubmit,
}: Props) {
  const router = useRouter();
  const flowSteps = useMemo(
    () => (steps.length ? steps : []).map(normalizeStep),
    [steps],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const currentStep = flowSteps[stepIndex] || flowSteps[0];
  const stepType = currentStep?.type || 'text';
  const isLastStep = stepIndex >= flowSteps.length - 1;
  const progressPct = flowSteps.length
    ? Math.round(((stepIndex + 1) / flowSteps.length) * 100)
    : 0;

  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const step of flowSteps) {
      if (step.type === 'water' || step.type === 'number') {
        const cfg = stepperConfig(step);
        next[step.id] = Number.isFinite(Number(step.defaultValue))
          ? Number(step.defaultValue)
          : cfg.defaultValue;
      } else {
        next[step.id] = null;
      }
    }
    setForm(next);
    setStepIndex(0);
  }, [flowSteps]);

  const scaleRange = useMemo(() => {
    const min = Math.max(0, Number(currentStep?.min) || 1);
    const max = Math.max(min, Number(currentStep?.max) || 5);
    const values: number[] = [];
    for (let n = min; n <= max; n += 1) values.push(n);
    return values;
  }, [currentStep?.max, currentStep?.min]);

  const choiceOptions = useMemo(() => {
    const raw = currentStep?.options;
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index) => {
      if (typeof item === 'string') return { value: item, label: item };
      const value = item?.value ?? item?.label ?? `opt_${index}`;
      return { value: String(value), label: item?.label ?? String(value) };
    });
  }, [currentStep?.options]);

  const canAdvance = useMemo(() => {
    if (!currentStep) return false;
    const value = form[currentStep.id];
    if (stepType === 'food' || stepType === 'exercise' || stepType === 'scale' || stepType === 'choice') {
      return value != null;
    }
    if (stepType === 'water' || stepType === 'number') {
      return Number(value) >= stepperConfig(currentStep).min;
    }
    if (stepType === 'text') return String(value || '').trim().length > 0;
    return false;
  }, [currentStep, form, stepType]);

  const adjustStepper = useCallback((delta: number) => {
    if (!currentStep) return;
    const cfg = stepperConfig(currentStep);
    const current = Number(form[currentStep.id] || 0);
    const next = Math.round((current + delta) * 100) / 100;
    setForm((prev) => ({
      ...prev,
      [currentStep.id]: Math.max(cfg.min, Math.min(cfg.max, next)),
    }));
  }, [currentStep, form]);

  const selectValue = useCallback((id: string, value: unknown, advance = false) => {
    void markCheckinDraftStarted();
    setForm((prev) => {
      const next = { ...prev, [id]: value };
      if (stepIndex >= flowSteps.length - 1) {
        setTimeout(() => onSubmit(next), 280);
      }
      return next;
    });
    if (stepIndex < flowSteps.length - 1 && advance) {
      setTimeout(() => setStepIndex((i) => Math.min(i + 1, flowSteps.length - 1)), 320);
    }
  }, [flowSteps.length, onSubmit, stepIndex]);

  const handleOk = useCallback(() => {
    if (!canAdvance || saving || submitted) return;
    if (isLastStep) {
      onSubmit(form);
      return;
    }
    setStepIndex((i) => i + 1);
  }, [canAdvance, form, isLastStep, onSubmit, saving, submitted]);

  if (submitted) {
    return (
      <View style={styles.success}>
        <View style={styles.successCircle}>
          <Check color={colors.primaryDark} size={28} />
        </View>
        <Text style={styles.successTitle}>Enviado com sucesso!</Text>
        <Text style={styles.successText}>Suas respostas foram registradas.</Text>
      </View>
    );
  }

  if (!currentStep) {
    return <Text style={styles.error}>Nenhuma pergunta disponível.</Text>;
  }

  const cfg = stepperConfig(currentStep);
  const waterUnitLabel = stepType === 'water'
    ? (Number(form[currentStep.id] ?? 0) === 1 ? 'litro' : 'litros')
    : (currentStep.unit || '');

  return (
    <View style={styles.root}>
      <View style={styles.progressTrack} accessibilityRole="progressbar">
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <Text style={styles.counter}>{stepIndex + 1} / {flowSteps.length}</Text>

      <ScrollView contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
        <Text style={styles.question}>{currentStep.question}</Text>
        {currentStep.hint ? <Text style={styles.hint}>{currentStep.hint}</Text> : null}

        {stepType === 'food' ? (
          <View style={styles.foodRow}>
            {FOOD_FACES.map((face) => (
              <Pressable
                key={face.value}
                style={[styles.foodBtn, form[currentStep.id] === face.value && styles.foodBtnActive]}
                onPress={() => selectValue(currentStep.id, face.value, true)}
                accessibilityRole="button"
                accessibilityLabel={face.label}
              >
                <Text style={styles.foodEmoji}>{face.emoji}</Text>
                <Text style={styles.foodLabel}>{face.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {stepType === 'water' || stepType === 'number' ? (
          <View style={styles.stepperWrap}>
            <View style={styles.stepperControl}>
              <Pressable style={styles.stepperBtn} onPress={() => adjustStepper(-cfg.step)}>
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperStrong}>{formatStepperValue(form[currentStep.id])}</Text>
                {waterUnitLabel ? <Text style={styles.stepperUnit}>{waterUnitLabel}</Text> : null}
              </View>
              <Pressable style={styles.stepperBtn} onPress={() => adjustStepper(cfg.step)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {stepType === 'exercise' ? (
          <View style={styles.choiceCol}>
            {[true, false].map((value) => (
              <Pressable
                key={String(value)}
                style={[styles.choiceBtn, form[currentStep.id] === value && styles.choiceBtnActive]}
                onPress={() => selectValue(currentStep.id, value, true)}
              >
                <Text style={styles.choiceLabel}>{value ? currentStep.yesLabel : currentStep.noLabel}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {stepType === 'scale' ? (
          <View style={styles.starRow}>
            {scaleRange.map((n) => (
              <Pressable
                key={n}
                style={styles.starBtn}
                onPress={() => selectValue(currentStep.id, n, !isLastStep)}
              >
                <Text style={[
                  styles.star,
                  (Number(form[currentStep.id]) || 0) >= n && styles.starFilled,
                ]}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {stepType === 'choice' ? (
          <View style={styles.choiceCol}>
            {choiceOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.choiceBtn, form[currentStep.id] === option.value && styles.choiceBtnActive]}
                onPress={() => selectValue(currentStep.id, option.value, true)}
              >
                <Text style={styles.choiceLabel}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {stepType === 'text' ? (
          <TextInput
            style={styles.textArea}
            value={String(form[currentStep.id] || '')}
            onChangeText={(text) => setForm((prev) => ({ ...prev, [currentStep.id]: text }))}
            placeholder={currentStep.placeholder || 'Sua resposta...'}
            placeholderTextColor={colors.placeholder}
            multiline
          />
        ) : null}

        {stepType === 'text' ? (
          <Pressable
            style={[styles.okBtn, (!canAdvance || saving) && styles.okBtnDisabled]}
            disabled={!canAdvance || saving}
            onPress={handleOk}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.okBtnText}>{isLastStep ? 'Responder' : 'Avançar'}</Text>}
          </Pressable>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {showHistoryLink && stepIndex === 0 ? (
          <Pressable onPress={() => router.push('/check-in/historico' as never)}>
            <Text style={styles.historyLink}>Ver histórico</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {(stepIndex > 0 || (stepType !== 'text' && (stepType === 'water' || stepType === 'number' || isLastStep))) ? (
        <View style={styles.footer}>
          {stepIndex > 0 ? (
            <Pressable style={styles.backBtn} onPress={() => setStepIndex((i) => i - 1)}>
              <ChevronUp size={16} color={colors.textMuted} />
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          ) : <View />}

          {stepType !== 'text' && (stepType === 'water' || stepType === 'number' || isLastStep) ? (
            <Pressable
              style={[styles.roundOk, (!canAdvance || saving) && styles.okBtnDisabled]}
              disabled={!canAdvance || saving}
              onPress={handleOk}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : isLastStep ? (
                <Check color="#fff" size={20} />
              ) : (
                <ArrowRight color="#fff" size={20} />
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {saving ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.busyText}>Enviando check-in...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  progressTrack: {
    height: 4,
    backgroundColor: colors.track,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  counter: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  main: {
    padding: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  question: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  foodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'center',
  },
  foodBtn: {
    width: 64,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: radii.control,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#f6f6f4',
  },
  foodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  foodEmoji: { fontSize: 28 },
  foodLabel: { marginTop: 4, fontFamily: fonts.medium, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  stepperWrap: { alignItems: 'center', paddingVertical: spacing[4] },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperBtnText: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  stepperValue: { alignItems: 'center', minWidth: 100 },
  stepperStrong: { fontFamily: fonts.bold, fontSize: 32, color: colors.text },
  stepperUnit: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  choiceCol: { gap: spacing[2] },
  choiceBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[4],
    backgroundColor: colors.surface,
  },
  choiceBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  starRow: { flexDirection: 'row', gap: spacing[2], justifyContent: 'center' },
  starBtn: { padding: spacing[1] },
  star: { fontSize: 36, color: colors.border },
  starFilled: { color: '#f5b301' },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing[3],
    fontFamily: fonts.regular,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  okBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minWidth: 120,
    alignItems: 'center',
  },
  okBtnDisabled: { opacity: 0.45 },
  okBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing[2] },
  backText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  roundOk: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  busyText: { fontFamily: fonts.medium, color: colors.textMuted },
  historyLink: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: spacing[2],
  },
  error: { color: colors.error, fontFamily: fonts.medium, textAlign: 'center' },
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[3],
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  successText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
