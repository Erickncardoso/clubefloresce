import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Cookie,
  Droplets,
  Dumbbell,
  Minus,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react-native';
import EvolucaoExerciseArm from '@/components/evolucao/EvolucaoExerciseArm';
import EvolucaoFoodPlate from '@/components/evolucao/EvolucaoFoodPlate';
import {
  GoalSettingTabs,
  GoalSheetHead,
  GoalSheetHero,
  GoalSheetCancelButton,
  GoalSheetSaveButton,
  GoalSheetScroll,
  GoalSheetSection,
  GoalValuePicker,
} from '@/components/evolucao/EvolucaoGoalSheetUi';
import EvolucaoSleepChart from '@/components/evolucao/EvolucaoSleepChart';
import EvolucaoWaterBottle from '@/components/evolucao/EvolucaoWaterBottle';
import EvolucaoWaterVesselIcon from '@/components/evolucao/EvolucaoWaterVesselIcon';
import AppleBottomSheet from '@/components/ui/AppleBottomSheet';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientGoals, type PatientGoal } from '@/hooks/usePatientGoals';
import { buildGoalBatchSaveToast } from '@/lib/goal-check-toast';
import { toastSuccess } from '@/lib/app-toast';
import {
  loadWaterVesselSettings,
  saveWaterVesselSettings,
} from '@/lib/water-vessel-settings';
import { colors, fonts, radii } from '@/theme/tokens';

const GOAL_ICON_BG: Record<string, { bg: string; fg: string }> = {
  water: { bg: '#eef6fc', fg: '#4a8fc4' },
  food: { bg: '#f8f1ef', fg: '#9d7268' },
  exercise: { bg: '#f0f5ee', fg: '#5f8f58' },
  sleep: { bg: '#f1f2fa', fg: '#6b74b8' },
};

const GOAL_PROGRESS: Record<string, string> = {
  water: '#5ba4d9',
  food: '#a87d70',
  exercise: '#5f8f58',
  sleep: '#6b74b8',
};

const targetFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const mlFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

type WaterSetting = 'target' | 'glass' | 'bottle';
type ExerciseSetting = 'progress' | 'target';
type SleepSetting = 'bed' | 'wake' | 'target';

type GoalForm = {
  label: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly';
  glassMl: number;
  bottleMl: number;
};

function goalIcon(goal: PatientGoal) {
  if (goal.type === 'water') return Droplets;
  if (goal.id === 'food') return Cookie;
  if (goal.id === 'exercise') return Dumbbell;
  if (goal.id === 'sleep') return Moon;
  return Sparkles;
}

function frequencyLabel(frequency: PatientGoal['frequency']) {
  return frequency === 'weekly' ? 'Semanal' : 'Diária';
}

function clampWaterTarget(value: number) {
  const rounded = Math.round((Number(value) || 2) * 4) / 4;
  return Math.max(0.5, Math.min(6, rounded));
}

function formatWaterMl(value: number) {
  return mlFormatter.format(Math.max(0, Math.round(Number(value) || 0)));
}

function formatClockMinutes(value: number) {
  const normalized = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatSleepDuration(totalMinutes: number) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (total < 60) return `${total} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export default function EvolucaoGoalsPanel() {
  const { showToast } = useAppToast();
  const {
    todaySummary,
    sleepSchedule,
    incrementGoal,
    decrementGoal,
    setGoalProgress,
    getFoodSelectedDays,
    toggleFoodDay,
    shiftSleepTime,
    updateGoal,
    addGoal,
    setSleepSchedule,
    weekdayIndex,
  } = usePatientGoals();

  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);
  const [activeWaterSetting, setActiveWaterSetting] = useState<WaterSetting>('target');
  const [activeExerciseSetting, setActiveExerciseSetting] = useState<ExerciseSetting>('progress');
  const [activeSleepSetting, setActiveSleepSetting] = useState<SleepSetting>('bed');
  const [foodDraftDays, setFoodDraftDays] = useState<number[]>([]);
  const [exerciseDraft, setExerciseDraft] = useState({ progress: 0, target: 3 });
  const [sleepDraft, setSleepDraft] = useState({
    bedMinutes: 23 * 60,
    wakeMinutes: 7 * 60 + 20,
    target: 8,
  });
  const [form, setForm] = useState<GoalForm>({
    label: '',
    target: 1,
    unit: '',
    frequency: 'daily',
    glassMl: 250,
    bottleMl: 500,
  });

  const isEditingWater = editingGoal?.id === 'water';
  const isEditingFood = editingGoal?.id === 'food';
  const isEditingExercise = editingGoal?.id === 'exercise';
  const isEditingSleep = editingGoal?.id === 'sleep';
  const isSpecialSheetOpen = isEditingWater || isEditingFood || isEditingExercise || isEditingSleep;
  const isGenericSheetOpen = (showAdd || !!editingGoal) && !isSpecialSheetOpen;

  const waterSummary = todaySummary.find((item) => item.goal.id === 'water');
  const waterCurrentMl = Math.max(0, Math.round(Number(waterSummary?.progress || 0) * 1000));
  const waterTargetMl = Math.round(clampWaterTarget(form.target) * 1000);
  const waterRemainingMl = Math.max(0, waterTargetMl - waterCurrentMl);
  const waterProgressPercent = waterTargetMl
    ? Math.min(100, Math.round((waterCurrentMl / waterTargetMl) * 100))
    : 0;

  const foodTargetDays = Math.max(1, Number(editingGoal?.target || 1));
  const foodProgressPercent = Math.min(
    100,
    Math.round((foodDraftDays.length / foodTargetDays) * 100),
  );
  const foodRemainingDays = Math.max(0, foodTargetDays - foodDraftDays.length);

  const exerciseProgressPercent = exerciseDraft.target
    ? Math.min(100, Math.round((exerciseDraft.progress / exerciseDraft.target) * 100))
    : 0;
  const exerciseRemaining = Math.max(0, exerciseDraft.target - exerciseDraft.progress);

  const sleepDurationMinutes = useMemo(() => {
    let duration = sleepDraft.wakeMinutes - sleepDraft.bedMinutes;
    if (duration <= 0) duration += 1440;
    return duration;
  }, [sleepDraft.bedMinutes, sleepDraft.wakeMinutes]);

  const sleepProgressPercent = Math.min(
    100,
    Math.round((sleepDurationMinutes / Math.max(1, sleepDraft.target * 60)) * 100),
  );
  const sleepRemainingMinutes = Math.max(
    0,
    Math.round(sleepDraft.target * 60 - sleepDurationMinutes),
  );

  const waterSettingConfig = useMemo(() => {
    if (activeWaterSetting === 'glass') {
      return {
        field: 'glassMl' as const,
        description: 'Volume registrado a cada copo.',
        unit: 'ml',
        min: 100,
        max: 750,
        step: 50,
      };
    }
    if (activeWaterSetting === 'bottle') {
      return {
        field: 'bottleMl' as const,
        description: 'Volume registrado a cada garrafa.',
        unit: 'ml',
        min: 250,
        max: 2000,
        step: 50,
      };
    }
    return {
      field: 'target' as const,
      description: 'Total que deseja beber durante o dia.',
      unit: 'L',
      min: 0.5,
      max: 6,
      step: 0.25,
    };
  }, [activeWaterSetting]);

  const waterSettingValue = Number(form[waterSettingConfig.field]) || waterSettingConfig.min;

  const exerciseSettingConfig = activeExerciseSetting === 'target'
    ? {
        field: 'target' as const,
        description: 'Quantidade de treinos que deseja fazer por semana.',
        min: 1,
        max: 14,
        step: 1,
        unit: 'treinos',
      }
    : {
        field: 'progress' as const,
        description: 'Registre quantos treinos já realizou nesta semana.',
        min: 0,
        max: Math.max(1, exerciseDraft.target),
        step: 1,
        unit: 'treinos',
      };

  const exerciseSettingValue = Number(exerciseDraft[exerciseSettingConfig.field]) || 0;

  const sleepSettingConfig = useMemo(() => {
    if (activeSleepSetting === 'wake') {
      return {
        field: 'wakeMinutes' as const,
        description: 'Defina o horário em que deseja começar o dia.',
        unit: 'horário',
        min: 0,
        max: 1439,
        step: 15,
      };
    }
    if (activeSleepSetting === 'target') {
      return {
        field: 'target' as const,
        description: 'Escolha quantas horas deseja dormir por noite.',
        unit: 'horas',
        min: 4,
        max: 12,
        step: 0.5,
      };
    }
    return {
      field: 'bedMinutes' as const,
      description: 'Defina o horário em que pretende ir para a cama.',
      unit: 'horário',
      min: 0,
      max: 1439,
      step: 15,
    };
  }, [activeSleepSetting]);

  const sleepSettingValue = Number(sleepDraft[sleepSettingConfig.field]);

  useEffect(() => {
    if (!isEditingWater) return;
    void loadWaterVesselSettings().then((settings) => {
      setForm((prev) => ({
        ...prev,
        glassMl: settings.glassMl,
        bottleMl: settings.bottleMl,
      }));
    });
  }, [isEditingWater]);

  function closeModal() {
    setShowAdd(false);
    setEditingGoal(null);
  }

  function openEdit(goal: PatientGoal) {
    setEditingGoal(goal);
    setActiveWaterSetting('target');
    setForm((prev) => ({
      ...prev,
      label: goal.label,
      target: goal.target,
      unit: goal.unit,
      frequency: goal.frequency,
    }));
    setShowAdd(false);
  }

  function openGoalEditor(goal: PatientGoal) {
    if (goal.id === 'exercise') {
      openExerciseEditor(goal, 'target');
      return;
    }
    if (goal.id === 'sleep') {
      openSleepEditor(goal, 'target');
      return;
    }
    openEdit(goal);
  }

  function openFoodEditor(goal: PatientGoal) {
    setEditingGoal(goal);
    setFoodDraftDays([...getFoodSelectedDays()]);
    setShowAdd(false);
  }

  function openExerciseEditor(goal: PatientGoal, setting: ExerciseSetting = 'progress') {
    const summary = todaySummary.find((item) => item.goal.id === goal.id);
    setEditingGoal(goal);
    setActiveExerciseSetting(setting);
    setExerciseDraft({
      progress: Number(summary?.progress || 0),
      target: Math.max(1, Number(goal.target || 3)),
    });
    setShowAdd(false);
  }

  function openSleepEditor(goal: PatientGoal, setting: SleepSetting = 'bed') {
    setEditingGoal(goal);
    setActiveSleepSetting(setting);
    setSleepDraft({
      bedMinutes: Number(sleepSchedule?.bedMinutes ?? 23 * 60),
      wakeMinutes: Number(sleepSchedule?.wakeMinutes ?? 7 * 60 + 20),
      target: Math.max(4, Math.min(12, Number(goal.target || 8))),
    });
    setShowAdd(false);
  }

  function clampWaterSetting(value: number) {
    const stepped = Math.round(Number(value) / waterSettingConfig.step) * waterSettingConfig.step;
    return Math.max(waterSettingConfig.min, Math.min(waterSettingConfig.max, stepped));
  }

  function formatWaterSetting(value: number) {
    const clamped = clampWaterSetting(value);
    if (activeWaterSetting === 'target') return targetFormatter.format(clamped);
    return mlFormatter.format(clamped);
  }

  function adjustWaterSetting(direction: number) {
    const next = clampWaterSetting(waterSettingValue + direction * waterSettingConfig.step);
    setForm((prev) => ({ ...prev, [waterSettingConfig.field]: next }));
  }

  function adjustExerciseSetting(direction: number) {
    const next = Math.max(
      exerciseSettingConfig.min,
      Math.min(exerciseSettingConfig.max, exerciseSettingValue + direction),
    );
    setExerciseDraft((prev) => {
      const updated = { ...prev, [exerciseSettingConfig.field]: next };
      if (exerciseSettingConfig.field === 'target') {
        updated.progress = Math.min(updated.progress, updated.target);
      }
      return updated;
    });
  }

  function nextSleepValue(direction: number) {
    const next = sleepSettingValue + direction * sleepSettingConfig.step;
    if (activeSleepSetting === 'target') {
      return Math.max(sleepSettingConfig.min, Math.min(sleepSettingConfig.max, next));
    }
    return (next + 1440) % 1440;
  }

  function adjustSleepSetting(direction: number) {
    const next = nextSleepValue(direction);
    setSleepDraft((prev) => ({ ...prev, [sleepSettingConfig.field]: next }));
  }

  function formatSleepSetting(value: number) {
    if (activeSleepSetting === 'target') return targetFormatter.format(Number(value) || 0);
    return formatClockMinutes(value);
  }

  function toggleDraftFoodDay(dayIndex: number) {
    setFoodDraftDays((prev) => {
      const selected = new Set(prev);
      if (selected.has(dayIndex)) selected.delete(dayIndex);
      else selected.add(dayIndex);
      return [...selected].sort((a, b) => a - b);
    });
  }

  async function saveFoodDraft() {
    const current = new Set(getFoodSelectedDays());
    const next = new Set(foodDraftDays);
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if (current.has(dayIndex) !== next.has(dayIndex)) {
        await toggleFoodDay(dayIndex, { silent: true });
      }
    }
    showToast(buildGoalBatchSaveToast('food'));
  }

  async function saveExerciseDraft() {
    const goal = editingGoal;
    if (!goal || goal.id !== 'exercise') return;
    await updateGoal('exercise', {
      label: goal.label,
      target: Math.max(1, Math.min(14, Number(exerciseDraft.target) || 1)),
      unit: goal.unit,
      frequency: goal.frequency,
    });
    await setGoalProgress(
      'exercise',
      Math.max(0, Math.min(exerciseDraft.progress, exerciseDraft.target)),
    );
    showToast(buildGoalBatchSaveToast('exercise'));
  }

  async function saveSleepDraft() {
    const goal = editingGoal;
    if (!goal || goal.id !== 'sleep') return;
    await updateGoal('sleep', {
      label: goal.label,
      target: Math.max(4, Math.min(12, Number(sleepDraft.target) || 8)),
      unit: goal.unit,
      frequency: goal.frequency,
    });
    await setSleepSchedule(sleepDraft.bedMinutes, sleepDraft.wakeMinutes, { notify: true });
  }

  async function saveWaterForm() {
    await updateGoal('water', {
      label: 'Água',
      target: clampWaterTarget(form.target),
      unit: 'litros',
      frequency: 'daily',
    });
    await saveWaterVesselSettings({
      glassMl: form.glassMl,
      bottleMl: form.bottleMl,
    });
    showToast(buildGoalBatchSaveToast('water'));
  }

  async function saveGenericForm() {
    const payload = {
      label: form.label.trim() || 'Meta',
      target: Math.max(1, Math.min(99, Number(form.target) || 1)),
      unit: form.unit.trim() || 'vezes',
      frequency: form.frequency === 'weekly' ? 'weekly' as const : 'daily' as const,
    };
    if (showAdd) {
      await addGoal({ ...payload, type: 'habit', color: '#8B967C' });
      showToast(toastSuccess('Meta criada'));
    } else if (editingGoal) {
      await updateGoal(editingGoal.id, payload);
      showToast(toastSuccess('Meta salva'));
    }
  }

  return (
    <View style={styles.root}>
      {todaySummary.map((item) => {
        const Icon = goalIcon(item.goal);
        const iconTheme = GOAL_ICON_BG[item.goal.id] || { bg: '#f4f4f5', fg: colors.text };
        const progressColor = GOAL_PROGRESS[item.goal.id] || colors.primary;
        const percent = Math.min(100, item.percent);

        return (
          <View key={item.goal.id} style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headCopy}>
                <View style={[styles.iconWrap, { backgroundColor: iconTheme.bg }]}>
                  <Icon size={15} color={iconTheme.fg} strokeWidth={1.8} />
                </View>
                <View style={styles.headText}>
                  <Text style={styles.goalTitle}>{item.goal.label}</Text>
                  <Text style={styles.goalMeta}>
                    {item.goal.id === 'food'
                      ? `Semanal · ${item.progress} ${item.progress === 1 ? 'dia registrado' : 'dias registrados'}`
                      : `${frequencyLabel(item.goal.frequency)} · ${item.progress} / ${item.goal.target} ${item.goal.unit}`}
                  </Text>
                </View>
              </View>
              <View style={styles.status}>
                <Text style={styles.statusValue}>
                  {item.goal.id === 'food' ? item.progress : `${percent}%`}
                </Text>
                <Text style={styles.statusLabel}>
                  {item.goal.id === 'food' ? (item.progress === 1 ? 'dia' : 'dias') : 'concluído'}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: progressColor }]} />
            </View>

            <View style={styles.surface}>
              {item.goal.type === 'water' ? (
                <EvolucaoWaterBottle
                  current={item.progress}
                  target={item.goal.target}
                  onIncrement={(amount) => incrementGoal(item.goal.id, amount)}
                  onDecrement={(amount) => decrementGoal(item.goal.id, amount)}
                />
              ) : null}

              {item.goal.id === 'food' ? (
                <EvolucaoFoodPlate
                  compact
                  selectedDays={getFoodSelectedDays()}
                  todayIndex={weekdayIndex()}
                  onToggleDay={(day) => toggleFoodDay(day)}
                  onOpenEditor={() => openFoodEditor(item.goal)}
                />
              ) : null}

              {item.goal.id === 'exercise' ? (
                <EvolucaoExerciseArm
                  compact
                  current={item.progress}
                  target={item.goal.target}
                  onIncrement={() => incrementGoal(item.goal.id)}
                  onDecrement={() => decrementGoal(item.goal.id)}
                  onOpenEditor={() => openExerciseEditor(item.goal, 'progress')}
                />
              ) : null}

              {item.goal.id === 'sleep' ? (
                <EvolucaoSleepChart
                  compact
                  target={item.goal.target}
                  schedule={sleepSchedule}
                  onShiftBed={(delta) => shiftSleepTime('bed', delta)}
                  onShiftWake={(delta) => shiftSleepTime('wake', delta)}
                  onOpenEditor={() => openSleepEditor(item.goal, 'bed')}
                />
              ) : null}

              {item.goal.type !== 'water'
                && item.goal.id !== 'food'
                && item.goal.id !== 'exercise'
                && item.goal.id !== 'sleep' ? (
                  <View style={styles.genericActions}>
                    <Pressable style={styles.genericBtn} onPress={() => decrementGoal(item.goal.id)}>
                      <Minus size={16} color={colors.textMuted} />
                    </Pressable>
                    <Text style={styles.genericValue}>
                      {item.progress} / {item.goal.target}
                    </Text>
                    <Pressable
                      style={[styles.genericBtn, styles.genericBtnPrimary]}
                      onPress={() => incrementGoal(item.goal.id)}
                    >
                      <Plus size={16} color="#fff" />
                    </Pressable>
                  </View>
                ) : null}
            </View>

            {item.goal.id !== 'food' ? (
              <Pressable style={styles.editBtn} onPress={() => openGoalEditor(item.goal)}>
                <Text style={styles.editBtnText}>Ajustar meta</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Pressable
        style={styles.addGoal}
        onPress={() => {
          setShowAdd(true);
          setEditingGoal(null);
          setForm({
            label: '',
            target: 1,
            unit: '',
            frequency: 'daily',
            glassMl: 250,
            bottleMl: 500,
          });
        }}
      >
        <Text style={styles.addGoalText}>+ Nova meta</Text>
      </Pressable>

      <AppleBottomSheet visible={isEditingWater} onClose={closeModal} maxHeightRatio={0.88} contentPadding={0}>
        <GoalSheetScroll>
          <GoalSheetHead
            icon={Droplets}
            iconBg="#eef7fc"
            iconColor="#4a96c5"
            title="Hidratação"
            subtitle="Ajuste sua meta e o volume dos recipientes."
          />
          <GoalSheetHero
            theme="water"
            percent={waterProgressPercent}
            stats={[
              { label: 'Hoje', value: formatWaterMl(waterCurrentMl), highlight: true, small: 'ml' },
              { label: 'Meta do dia', value: `${formatWaterMl(waterTargetMl)} ml` },
              { label: 'Faltam', value: `${formatWaterMl(waterRemainingMl)} ml` },
            ]}
          />
          <GoalSheetSection title="O que deseja ajustar?" description={waterSettingConfig.description}>
            <GoalValuePicker
              previous={
                waterSettingValue > waterSettingConfig.min
                  ? formatWaterSetting(waterSettingValue - waterSettingConfig.step)
                  : '—'
              }
              current={formatWaterSetting(waterSettingValue)}
              next={
                waterSettingValue < waterSettingConfig.max
                  ? formatWaterSetting(waterSettingValue + waterSettingConfig.step)
                  : '—'
              }
              unit={waterSettingConfig.unit}
              canDecrease={waterSettingValue > waterSettingConfig.min}
              canIncrease={waterSettingValue < waterSettingConfig.max}
              onDecrease={() => adjustWaterSetting(-1)}
              onIncrease={() => adjustWaterSetting(1)}
            />
            <View style={styles.waterTabs}>
              {([
                { id: 'target' as const, label: 'Meta', icon: Droplets },
                { id: 'glass' as const, label: 'Copo', vessel: 'glass' as const },
                { id: 'bottle' as const, label: 'Garrafa', vessel: 'bottle' as const },
              ]).map((tab) => {
                const active = activeWaterSetting === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    style={[styles.waterTab, active && styles.waterTabActive]}
                    onPress={() => setActiveWaterSetting(tab.id)}
                  >
                    {tab.icon ? (
                      <tab.icon size={16} color={active ? '#202124' : '#6c7074'} strokeWidth={1.8} />
                    ) : (
                      <EvolucaoWaterVesselIcon kind={tab.vessel!} fillPercent={72} width={14} height={20} />
                    )}
                    <Text style={[styles.waterTabText, active && styles.waterTabTextActive]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GoalSheetSection>
          <GoalSheetSaveButton label="Salvar ajustes" onPress={saveWaterForm} />
        </GoalSheetScroll>
      </AppleBottomSheet>

      <AppleBottomSheet visible={isEditingFood} onClose={closeModal} maxHeightRatio={0.88} contentPadding={0}>
        <GoalSheetScroll>
          <GoalSheetHead
            icon={Cookie}
            iconBg="#f8efec"
            iconColor="#9d7268"
            title="Refeição livre"
            subtitle="Registre os dias desta semana."
          />
          <GoalSheetHero
            theme="food"
            percent={foodProgressPercent}
            stats={[
              {
                label: 'Esta semana',
                value: String(foodDraftDays.length),
                highlight: true,
                small: foodDraftDays.length === 1 ? 'dia' : 'dias',
              },
              {
                label: 'Meta semanal',
                value: `${foodTargetDays} ${foodTargetDays === 1 ? 'dia' : 'dias'}`,
              },
              {
                label: 'Faltam',
                value: `${foodRemainingDays} ${foodRemainingDays === 1 ? 'dia' : 'dias'}`,
              },
            ]}
          />
          <GoalSheetSection
            title="Em quais dias?"
            description="Selecione somente os dias em que fez uma refeição livre."
          >
            <EvolucaoFoodPlate
              editor
              selectedDays={foodDraftDays}
              todayIndex={weekdayIndex()}
              onToggleDay={toggleDraftFoodDay}
            />
          </GoalSheetSection>
          <GoalSheetSaveButton label="Salvar registros" onPress={saveFoodDraft} />
        </GoalSheetScroll>
      </AppleBottomSheet>

      <AppleBottomSheet visible={isEditingExercise} onClose={closeModal} maxHeightRatio={0.88} contentPadding={0}>
        <GoalSheetScroll>
          <GoalSheetHead
            icon={Dumbbell}
            iconBg="#eef5ec"
            iconColor="#5f8f58"
            title="Exercício"
            subtitle="Registre seus treinos e ajuste a meta semanal."
          />
          <GoalSheetHero
            theme="exercise"
            percent={exerciseProgressPercent}
            stats={[
              {
                label: 'Esta semana',
                value: String(exerciseDraft.progress),
                highlight: true,
                small: exerciseDraft.progress === 1 ? 'treino' : 'treinos',
              },
              { label: 'Meta semanal', value: `${exerciseDraft.target} treinos` },
              {
                label: 'Faltam',
                value: `${exerciseRemaining} ${exerciseRemaining === 1 ? 'treino' : 'treinos'}`,
              },
            ]}
          />
          <GoalSheetSection
            title="O que deseja ajustar?"
            description={exerciseSettingConfig.description}
          >
            <GoalValuePicker
              previous={
                exerciseSettingValue > exerciseSettingConfig.min
                  ? String(exerciseSettingValue - 1)
                  : '—'
              }
              current={String(exerciseSettingValue)}
              next={
                exerciseSettingValue < exerciseSettingConfig.max
                  ? String(exerciseSettingValue + 1)
                  : '—'
              }
              unit={exerciseSettingConfig.unit}
              canDecrease={exerciseSettingValue > exerciseSettingConfig.min}
              canIncrease={exerciseSettingValue < exerciseSettingConfig.max}
              onDecrease={() => adjustExerciseSetting(-1)}
              onIncrease={() => adjustExerciseSetting(1)}
            />
            <GoalSettingTabs
              columns={2}
              activeId={activeExerciseSetting}
              onChange={(id) => setActiveExerciseSetting(id as ExerciseSetting)}
              tabs={[
                { id: 'progress', label: 'Realizados', icon: Dumbbell },
                { id: 'target', label: 'Meta', icon: Target },
              ]}
            />
          </GoalSheetSection>
          <GoalSheetSaveButton label="Salvar exercícios" onPress={saveExerciseDraft} />
        </GoalSheetScroll>
      </AppleBottomSheet>

      <AppleBottomSheet visible={isEditingSleep} onClose={closeModal} maxHeightRatio={0.88} contentPadding={0}>
        <GoalSheetScroll>
          <GoalSheetHead
            icon={Moon}
            iconBg="#f1f2fa"
            iconColor="#6b74b8"
            title="Sono"
            subtitle="Ajuste seus horários e sua meta de descanso."
          />
          <GoalSheetHero
            theme="sleep"
            percent={sleepProgressPercent}
            stats={[
              {
                label: 'Hoje',
                value: formatSleepDuration(sleepDurationMinutes),
                highlight: true,
              },
              { label: 'Meta de sono', value: `${targetFormatter.format(sleepDraft.target)}h` },
              { label: 'Faltam', value: formatSleepDuration(sleepRemainingMinutes) },
            ]}
          />
          <GoalSheetSection
            title="O que deseja ajustar?"
            description={sleepSettingConfig.description}
          >
            <GoalValuePicker
              previous={
                activeSleepSetting !== 'target' || sleepSettingValue > sleepSettingConfig.min
                  ? formatSleepSetting(nextSleepValue(-1))
                  : '—'
              }
              current={formatSleepSetting(sleepSettingValue)}
              next={
                activeSleepSetting !== 'target' || sleepSettingValue < sleepSettingConfig.max
                  ? formatSleepSetting(nextSleepValue(1))
                  : '—'
              }
              unit={sleepSettingConfig.unit}
              canDecrease={
                activeSleepSetting !== 'target' || sleepSettingValue > sleepSettingConfig.min
              }
              canIncrease={
                activeSleepSetting !== 'target' || sleepSettingValue < sleepSettingConfig.max
              }
              onDecrease={() => adjustSleepSetting(-1)}
              onIncrease={() => adjustSleepSetting(1)}
            />
            <GoalSettingTabs
              activeId={activeSleepSetting}
              onChange={(id) => setActiveSleepSetting(id as SleepSetting)}
              tabs={[
                { id: 'bed', label: 'Dormir', icon: Moon },
                { id: 'wake', label: 'Acordar', icon: Sun },
                { id: 'target', label: 'Meta', icon: Target },
              ]}
            />
          </GoalSheetSection>
          <GoalSheetSaveButton label="Salvar sono" onPress={saveSleepDraft} />
        </GoalSheetScroll>
      </AppleBottomSheet>

      <AppleBottomSheet visible={isGenericSheetOpen} onClose={closeModal} maxHeightRatio={0.55} contentPadding={16}>
        <Text style={styles.genericTitle}>{showAdd ? 'Nova meta' : 'Ajustar meta'}</Text>
        <Text style={styles.fieldLabel}>Nome</Text>
        <TextInput
          style={styles.input}
          value={form.label}
          onChangeText={(label) => setForm((prev) => ({ ...prev, label }))}
          maxLength={40}
        />
        <Text style={styles.fieldLabel}>Meta</Text>
        <TextInput
          style={styles.input}
          value={String(form.target)}
          onChangeText={(target) => setForm((prev) => ({ ...prev, target: Number(target) || 1 }))}
          keyboardType="number-pad"
        />
        <Text style={styles.fieldLabel}>Unidade</Text>
        <TextInput
          style={styles.input}
          value={form.unit}
          onChangeText={(unit) => setForm((prev) => ({ ...prev, unit }))}
          maxLength={20}
        />
        <View style={styles.freqRow}>
          {(['daily', 'weekly'] as const).map((freq) => (
            <Pressable
              key={freq}
              style={[styles.freqChip, form.frequency === freq && styles.freqChipActive]}
              onPress={() => setForm((prev) => ({ ...prev, frequency: freq }))}
            >
              <Text style={[styles.freqChipText, form.frequency === freq && styles.freqChipTextActive]}>
                {freq === 'daily' ? 'Diária' : 'Semanal'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.modalActions}>
          <GoalSheetCancelButton />
          <GoalSheetSaveButton compact label="Salvar" onPress={saveGenericForm} />
        </View>
      </AppleBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headText: { flex: 1, minWidth: 0 },
  goalTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: -0.14,
    color: colors.text,
  },
  goalMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: '#8a8a8e',
  },
  status: { alignItems: 'flex-end', flexShrink: 0 },
  statusValue: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 17,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  statusLabel: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 9,
    color: '#8a8a8e',
  },
  progressTrack: {
    height: 4,
    marginTop: 11,
    borderRadius: 999,
    backgroundColor: '#ededf0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  surface: {
    marginTop: 12,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#ededf0',
  },
  genericActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  genericBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genericBtnPrimary: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryDark,
  },
  genericValue: {
    fontFamily: fonts.medium,
    fontSize: 14,
    minWidth: 72,
    textAlign: 'center',
  },
  editBtn: {
    alignSelf: 'flex-end',
    marginTop: 9,
    paddingVertical: 5,
  },
  editBtnText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primaryDark,
  },
  addGoal: {
    minHeight: 45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cfcfd4',
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primaryDark,
  },
  waterTabs: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e2e6',
    borderRadius: 14,
    backgroundColor: '#f4f4f6',
  },
  waterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  waterTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#121416',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  waterTabText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#6c7074',
  },
  waterTabTextActive: {
    fontFamily: fonts.medium,
    color: '#202124',
  },
  genericTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: 14,
    color: colors.text,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 12,
    color: colors.text,
  },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    alignItems: 'center',
  },
  freqChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  freqChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  freqChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: '#e8ece9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
  },
  modalSaveText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
});
