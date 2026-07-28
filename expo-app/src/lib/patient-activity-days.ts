import {
  buildTodaySummary,
  dateKey,
  getProgress,
  parseFoodDays,
  weekStartKey,
  weekdayIndex,
  type GoalsStore,
  type PatientGoal,
} from '@/lib/patient-goals-core';

export { dateKey };

type DiaryDay = { date: string; entryCount?: number };

export function goalsAveragePercent(goals: PatientGoal[], progress: GoalsStore['progress'], date = new Date()) {
  const summary = buildTodaySummary({ goals, progress });
  const items = summary.filter((item) => item.goal.id !== 'food');
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.percent, 0) / items.length);
}

export function isActivityDay(
  goals: PatientGoal[],
  progress: GoalsStore['progress'],
  dateKeyStr: string,
  diaryEntryCount = 0,
) {
  if (diaryEntryCount > 0) return true;

  const date = new Date(`${dateKeyStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  for (const goal of goals) {
    if (goal.id === 'food') {
      const weekKey = weekStartKey(date);
      const selected = parseFoodDays(progress[`food-days:${weekKey}`]);
      if (selected.includes(weekdayIndex(date))) return true;
      continue;
    }
    if (goal.frequency === 'weekly') continue;
    if (getProgress({ goals, progress }, goal, date) > 0) return true;
  }

  if (progress[`sleep-bed:${dateKeyStr}`] != null) return true;
  if (progress[`sleep-wake:${dateKeyStr}`] != null) return true;

  return false;
}

export function buildMonthActivityMap(
  goals: PatientGoal[],
  progress: GoalsStore['progress'],
  diaryDays: DiaryDay[] = [],
) {
  const diaryByDate = new Map(diaryDays.map((day) => [day.date, day.entryCount || 0]));
  const map = new Map<string, boolean>();

  for (const day of diaryDays) {
    map.set(day.date, isActivityDay(goals, progress, day.date, day.entryCount || 0));
  }

  for (const key of Object.keys(progress)) {
    const dated = key.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dated) continue;
    const dk = dated[1];
    if (map.has(dk) && map.get(dk)) continue;
    map.set(dk, isActivityDay(goals, progress, dk, diaryByDate.get(dk) || 0));
  }

  return map;
}

export function countActiveDaysInMonth(activityMap: Map<string, boolean>, year: number, month: number) {
  let count = 0;
  for (const [date, active] of activityMap.entries()) {
    if (!active) continue;
    const [y, m] = date.split('-').map(Number);
    if (y === year && m === month) count += 1;
  }
  return count;
}

export function getWeekDateKeys(date = new Date()) {
  const anchor = new Date(date);
  anchor.setHours(12, 0, 0, 0);
  const startDay = anchor.getDay();
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() - startDay + index);
    return dateKey(next);
  });
}

export function countActiveDaysInWeek(activityMap: Map<string, boolean>, date = new Date()) {
  return getWeekDateKeys(date).filter((key) => activityMap.get(key)).length;
}

export function computeCurrentStreak(activityMap: Map<string, boolean>, todayKey = dateKey()) {
  let streak = 0;
  const cursor = new Date(`${todayKey}T12:00:00`);
  if (Number.isNaN(cursor.getTime())) return 0;

  while (activityMap.get(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeBestStreak(activityMap: Map<string, boolean>) {
  const activeDates = [...activityMap.entries()]
    .filter(([, active]) => active)
    .map(([key]) => key)
    .sort();

  if (!activeDates.length) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < activeDates.length; index += 1) {
    const previous = new Date(`${activeDates[index - 1]}T12:00:00`);
    const next = new Date(`${activeDates[index]}T12:00:00`);
    const diffDays = Math.round((next.getTime() - previous.getTime()) / 86400000);

    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}
