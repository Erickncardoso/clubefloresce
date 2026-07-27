export type GoalFrequency = 'daily' | 'weekly';

export type PatientGoal = {
  id: string;
  label: string;
  type: 'water' | 'habit' | 'food' | 'exercise' | 'sleep';
  target: number;
  unit: string;
  frequency: GoalFrequency;
  color: string;
  step?: number;
};

export type GoalsStore = {
  goals: PatientGoal[];
  progress: Record<string, string | number>;
};

export const STORAGE_KEY = 'cf-patient-goals-v1';

export const DEFAULT_GOALS: PatientGoal[] = [
  { id: 'water', label: 'Água', type: 'water', target: 2, unit: 'litros', frequency: 'daily', color: '#5ba4d9', step: 0.25 },
  { id: 'food', label: 'Refeição livre', type: 'food', target: 7, unit: 'dias', frequency: 'weekly', color: '#c9a96e' },
  { id: 'exercise', label: 'Exercício', type: 'exercise', target: 3, unit: 'vezes', frequency: 'weekly', color: '#8B967C' },
  { id: 'sleep', label: 'Sono', type: 'sleep', target: 8, unit: 'horas', frequency: 'daily', color: '#6aab6a', step: 0.5 },
];

export const FOOD_WEEKDAYS = [
  { index: 0, short: 'Seg', label: 'Segunda' },
  { index: 1, short: 'Ter', label: 'Terça' },
  { index: 2, short: 'Qua', label: 'Quarta' },
  { index: 3, short: 'Qui', label: 'Quinta' },
  { index: 4, short: 'Sex', label: 'Sexta' },
  { index: 5, short: 'Sáb', label: 'Sábado' },
  { index: 6, short: 'Dom', label: 'Domingo' },
] as const;

const DEFAULT_SLEEP_BED = 23 * 60;
const DEFAULT_SLEEP_WAKE = 7 * 60 + 20;

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekStartKey(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return dateKey(copy);
}

export function periodKeyForGoal(goal: PatientGoal, date = new Date()) {
  return goal.frequency === 'weekly' ? weekStartKey(date) : dateKey(date);
}

export function weekdayIndex(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function roundToStep(value: number, step: number, max: number) {
  const clamped = Math.max(0, Math.min(max, value));
  if (step >= 1) return Math.round(clamped);
  const factor = 1 / step;
  return Math.round(clamped * factor) / factor;
}

function progressStorageKey(goalId: string, periodKey: string) {
  return `${goalId}:${periodKey}`;
}

function foodDaysStorageKey(weekKey: string) {
  return `food-days:${weekKey}`;
}

function parseFoodDays(raw: unknown): number[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function serializeFoodDays(days: number[]) {
  return [...new Set(days)].sort((a, b) => a - b).join(',');
}

function sleepMetaKey(kind: 'bed' | 'wake', dayKey: string) {
  return `sleep-${kind}:${dayKey}`;
}

function calcSleepDurationMinutes(bedMinutes: number, wakeMinutes: number) {
  let diff = wakeMinutes - bedMinutes;
  if (diff <= 0) diff += 1440;
  return diff;
}

function calcSleepDurationHours(bedMinutes: number, wakeMinutes: number) {
  const minutes = calcSleepDurationMinutes(bedMinutes, wakeMinutes);
  return Math.round((minutes / 60) * 2) / 2;
}

function normalizeSleepTimes(bedMinutes: number, wakeMinutes: number) {
  let bed = ((bedMinutes % 1440) + 1440) % 1440;
  let wake = ((wakeMinutes % 1440) + 1440) % 1440;
  const bedH = Math.floor(bed / 60);

  if (bedH >= 6 && bedH < 18) {
    bed = (bed + 12 * 60) % 1440;
  }

  let diff = calcSleepDurationMinutes(bed, wake);
  if (diff < 3 * 60) {
    wake = (bed + 7 * 60) % 1440;
  } else if (diff > 14 * 60) {
    wake = (bed + 8 * 60) % 1440;
  }

  return { bed, wake };
}

function migrateWaterProgress(store: GoalsStore) {
  const water = store.goals.find((item) => item.id === 'water');
  if (!water || water.unit !== 'litros') return false;

  let changed = false;
  for (const [key, value] of Object.entries(store.progress)) {
    if (!key.startsWith('water:') || typeof value !== 'number' || value <= water.target) continue;
    store.progress[key] = roundToStep(value * 0.25, 0.25, water.target);
    changed = true;
  }
  return changed;
}

export function normalizeStoredGoals(goals: PatientGoal[]) {
  const defaultsById = Object.fromEntries(DEFAULT_GOALS.map((goal) => [goal.id, goal]));

  return goals.map((goal) => {
    const fallback = defaultsById[goal.id];
    if (!fallback) return goal as PatientGoal;
    if (goal.id === 'sleep' && (goal.unit === 'noites' || goal.frequency === 'weekly')) {
      return { ...fallback };
    }
    if (goal.id === 'water' && goal.unit === 'copos') {
      return {
        ...goal,
        type: 'water',
        target: Math.round(goal.target * 0.25 * 4) / 4 || 2,
        unit: 'litros',
        step: 0.25,
        color: fallback.color,
      };
    }
    if (goal.id === 'water') {
      return { ...goal, type: 'water', step: goal.step ?? 0.25, color: fallback.color };
    }
    if (goal.id === 'food' && goal.type === 'habit') {
      return { ...goal, type: 'food', label: 'Refeição livre', color: fallback.color };
    }
    if (goal.id === 'food') {
      return { ...goal, label: 'Refeição livre', type: 'food', color: '#c9a96e' };
    }
    if (goal.id === 'exercise' && goal.type === 'habit') {
      return { ...goal, type: 'exercise', color: fallback.color };
    }
    return goal as PatientGoal;
  }) as PatientGoal[];
}

export function readGoalsStore(raw: string | null): GoalsStore {
  if (!raw) return { goals: DEFAULT_GOALS, progress: {} };
  try {
    const parsed = JSON.parse(raw);
    const goals = normalizeStoredGoals(
      Array.isArray(parsed.goals) && parsed.goals.length ? parsed.goals : DEFAULT_GOALS,
    );
    const progress = parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {};
    const store = { goals, progress };
    if (migrateWaterProgress(store)) {
      /* migrated in memory */
    }
    return store;
  } catch {
    return { goals: DEFAULT_GOALS, progress: {} };
  }
}

export function getProgress(store: GoalsStore, goal: PatientGoal, date = new Date()) {
  if (goal.id === 'food') {
    const weekKey = periodKeyForGoal(goal, date);
    const daysKey = foodDaysStorageKey(weekKey);
    if (daysKey in store.progress) {
      return parseFoodDays(store.progress[daysKey]).length;
    }
    return 0;
  }
  const key = progressStorageKey(goal.id, periodKeyForGoal(goal, date));
  const raw = store.progress[key];
  return typeof raw === 'number' ? raw : Number(raw) || 0;
}

export function getProgressPercent(goal: PatientGoal, progress: number) {
  if (goal.id === 'food' || goal.type === 'food') return 0;
  if (!goal.target) return 0;
  return Math.min(100, Math.round((progress / goal.target) * 100));
}

export function getFoodSelectedDays(store: GoalsStore, date = new Date()) {
  const goal = store.goals.find((item) => item.id === 'food');
  if (!goal) return [];
  const weekKey = periodKeyForGoal(goal, date);
  return parseFoodDays(store.progress[foodDaysStorageKey(weekKey)]);
}

export function toggleFoodDayInStore(store: GoalsStore, weekday: number, date = new Date()) {
  const goal = store.goals.find((item) => item.id === 'food');
  if (!goal || weekday < 0 || weekday > 6) return store;

  const weekKey = periodKeyForGoal(goal, date);
  const daysKey = foodDaysStorageKey(weekKey);
  const selected = parseFoodDays(store.progress[daysKey]);
  const existingIndex = selected.indexOf(weekday);

  if (existingIndex >= 0) {
    selected.splice(existingIndex, 1);
  } else if (selected.length >= 7) {
    return store;
  } else {
    selected.push(weekday);
    selected.sort((a, b) => a - b);
  }

  const next = {
    ...store,
    progress: {
      ...store.progress,
      [daysKey]: serializeFoodDays(selected),
      [progressStorageKey('food', weekKey)]: selected.length,
    },
  };
  return next;
}

export function setProgressInStore(
  store: GoalsStore,
  goalId: string,
  value: number,
  date = new Date(),
) {
  const goal = store.goals.find((item) => item.id === goalId);
  if (!goal) return store;
  const key = progressStorageKey(goalId, periodKeyForGoal(goal, date));
  const step = goal.step || 1;
  const max = goal.target;
  return {
    ...store,
    progress: {
      ...store.progress,
      [key]: roundToStep(value, step, max),
    },
  };
}

export function getSleepSchedule(store: GoalsStore, date = new Date()) {
  const dk = dateKey(date);
  const bedStored = store.progress[sleepMetaKey('bed', dk)];
  const wakeStored = store.progress[sleepMetaKey('wake', dk)];

  let bedMinutes = typeof bedStored === 'number' ? bedStored : DEFAULT_SLEEP_BED;
  let wakeMinutes = typeof wakeStored === 'number' ? wakeStored : DEFAULT_SLEEP_WAKE;

  if (bedStored == null || wakeStored == null) {
    const sleepGoal = store.goals.find((item) => item.id === 'sleep');
    const savedHours = sleepGoal ? getProgress(store, sleepGoal, date) : 0;
    if (savedHours > 0) {
      wakeMinutes = (DEFAULT_SLEEP_BED + Math.round(savedHours * 60)) % 1440;
    }
  }

  const normalized = normalizeSleepTimes(bedMinutes, wakeMinutes);
  const durationMinutes = calcSleepDurationMinutes(normalized.bed, normalized.wake);
  const durationHours = calcSleepDurationHours(normalized.bed, normalized.wake);

  return {
    dateKey: dk,
    bedMinutes: normalized.bed,
    wakeMinutes: normalized.wake,
    durationHours,
    durationMinutes,
  };
}

export function setSleepScheduleInStore(
  store: GoalsStore,
  bedMinutes: number,
  wakeMinutes: number,
  date = new Date(),
) {
  const dk = dateKey(date);
  const normalized = normalizeSleepTimes(
    Math.round(bedMinutes / 15) * 15,
    Math.round(wakeMinutes / 15) * 15,
  );
  const hours = calcSleepDurationHours(normalized.bed, normalized.wake);
  let next: GoalsStore = {
    ...store,
    progress: {
      ...store.progress,
      [sleepMetaKey('bed', dk)]: normalized.bed,
      [sleepMetaKey('wake', dk)]: normalized.wake,
    },
  };
  next = setProgressInStore(next, 'sleep', hours, date);
  return next;
}

export function shiftSleepTimeInStore(
  store: GoalsStore,
  kind: 'bed' | 'wake',
  deltaMinutes: number,
  date = new Date(),
) {
  const current = getSleepSchedule(store, date);
  if (kind === 'bed') {
    return setSleepScheduleInStore(store, current.bedMinutes + deltaMinutes, current.wakeMinutes, date);
  }
  return setSleepScheduleInStore(store, current.bedMinutes, current.wakeMinutes + deltaMinutes, date);
}

export function repairSleepScheduleInStore(store: GoalsStore, date = new Date()) {
  const dk = dateKey(date);
  const bedKey = sleepMetaKey('bed', dk);
  const wakeKey = sleepMetaKey('wake', dk);
  const bedStored = store.progress[bedKey];
  const wakeStored = store.progress[wakeKey];

  let bed = typeof bedStored === 'number' ? bedStored : DEFAULT_SLEEP_BED;
  let wake = typeof wakeStored === 'number' ? wakeStored : DEFAULT_SLEEP_WAKE;

  if (bedStored == null || wakeStored == null) {
    const sleepGoal = store.goals.find((item) => item.id === 'sleep');
    const savedHours = sleepGoal ? getProgress(store, sleepGoal, date) : 0;
    if (savedHours > 0) {
      wake = (DEFAULT_SLEEP_BED + Math.round(savedHours * 60)) % 1440;
    }
  }

  const normalized = normalizeSleepTimes(bed, wake);
  const hours = calcSleepDurationHours(normalized.bed, normalized.wake);
  const sleepGoal = store.goals.find((item) => item.id === 'sleep') || DEFAULT_GOALS[3];
  const sleepKey = progressStorageKey('sleep', periodKeyForGoal(sleepGoal, date));
  const currentHours = typeof store.progress[sleepKey] === 'number' ? store.progress[sleepKey] : 0;

  const scheduleChanged = bedStored !== normalized.bed || wakeStored !== normalized.wake;
  const hoursChanged = currentHours !== hours;

  if (!scheduleChanged && !hoursChanged) return store;

  return setSleepScheduleInStore(store, normalized.bed, normalized.wake, date);
}

export function buildTodaySummary(store: GoalsStore, date = new Date()) {
  return store.goals.map((goal) => {
    const progress = getProgress(store, goal, date);
    return {
      goal,
      progress,
      percent: getProgressPercent(goal, progress),
    };
  });
}

export function goalsAverageFromSummary(
  summary: ReturnType<typeof buildTodaySummary>,
) {
  const items = summary.filter((item) => item.goal.id !== 'food');
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.percent, 0) / items.length);
}

export function updateGoalInStore(
  store: GoalsStore,
  goalId: string,
  patch: Partial<Pick<PatientGoal, 'label' | 'target' | 'unit' | 'frequency'>>,
) {
  if (goalId === 'food') return store;
  const index = store.goals.findIndex((item) => item.id === goalId);
  if (index < 0) return store;
  const goals = [...store.goals];
  goals[index] = { ...goals[index], ...patch };
  return { ...store, goals };
}

export function addGoalToStore(store: GoalsStore, goal: Omit<PatientGoal, 'id'>) {
  const id = `custom-${Date.now()}`;
  return { ...store, goals: [...store.goals, { ...goal, id }] };
}
