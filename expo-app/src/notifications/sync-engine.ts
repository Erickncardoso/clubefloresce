import {
  FACTORY_LIMITS,
  FACTORY_MESSAGES,
  FACTORY_SCHEDULE,
  NOTIFICATION_TEST_MODE,
} from '@/notifications/factory-rules';
import { getPermissionState } from '@/notifications/permission';
import {
  clearCheckinDraftStarted,
  clearOnboardingLeft,
  getCheckinDraftStartedAt,
  getLastAppOpen,
  getOnboardingLeftAt,
  loadRegistry,
  markStreak7Celebrated,
  touchLastAppOpen,
  wasStreak7Celebrated,
} from '@/notifications/registry';
import {
  cancelLogicalKeys,
  scheduleAtDate,
  scheduleDailyNotification,
  scheduleUserReminder,
  scheduleWeeklyNotification,
} from '@/notifications/scheduler';
import { loadUserReminders } from '@/notifications/user-reminders';
import { buildMonthActivityMap, computeCurrentStreak } from '@/lib/patient-activity-days';

type SyncContext = {
  request: <T>(path: string, init?: RequestInit & { method?: string }) => Promise<T>;
  onboardingComplete: boolean;
  checkinPreferenceEnabled: boolean;
};

function hoursToMs(hours: number) {
  if (NOTIFICATION_TEST_MODE) return hours * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

function daysToMs(days: number) {
  if (NOTIFICATION_TEST_MODE) return days * 60 * 1000;
  return days * 24 * 60 * 60 * 1000;
}

async function syncUserReminders() {
  const reminders = await loadUserReminders();
  const enabled = reminders.filter((item) => item.enabled);
  const disabled = reminders.filter((item) => !item.enabled);

  for (const item of disabled) {
    const prefix = `user:${item.id}`;
    const keys = (await loadRegistry())
      .filter((entry) => entry.logicalKey.startsWith(prefix))
      .map((entry) => entry.logicalKey);
    if (keys.length) await cancelLogicalKeys(keys);
  }

  for (const item of enabled) {
    await scheduleUserReminder({
      id: item.id,
      label: item.label,
      body: FACTORY_MESSAGES.userReminderDefaultBody,
      route: item.route,
      hour: item.hour,
      minute: item.minute,
      weekdays: item.weekdays,
    });
  }
}

async function syncWeeklyCheckin(ctx: SyncContext) {
  if (!ctx.checkinPreferenceEnabled) {
    await cancelLogicalKeys(['factory:weekly-checkin']);
    return;
  }

  try {
    const data = await ctx.request<{ templates?: Array<{ completedThisPeriod?: boolean }>; status?: { windowOpen?: boolean } }>(
      '/checkin/templates/active',
    );
    const pending = (data.templates || []).some(
      (tpl) => !tpl.completedThisPeriod && (tpl as { frequency?: string }).frequency !== 'daily',
    );
    const windowOpen = Boolean(data.status?.windowOpen);
    if (!pending || !windowOpen) {
      await cancelLogicalKeys(['factory:weekly-checkin']);
      return;
    }
  } catch {
    /* mantém agendamento se API falhar */
  }

  const msg = FACTORY_MESSAGES.weeklyCheckin;
  await scheduleWeeklyNotification({
    logicalKey: 'factory:weekly-checkin',
    title: msg.title,
    body: msg.body,
    route: msg.route,
    channelId: msg.channelId,
    weekday: FACTORY_SCHEDULE.weeklyCheckin.weekday,
    hour: FACTORY_SCHEDULE.weeklyCheckin.hour,
    minute: FACTORY_SCHEDULE.weeklyCheckin.minute,
  });
}

async function syncEmptyDiary(ctx: SyncContext) {
  try {
    const summary = await ctx.request<{ consumed?: { caloriesKcal?: number } }>('/food-diary/today');
    const calories = Number(summary?.consumed?.caloriesKcal || 0);
    if (calories > 0) {
      await cancelLogicalKeys(['factory:empty-diary']);
      return;
    }
  } catch {
    /* segue */
  }

  const msg = FACTORY_MESSAGES.emptyDiary;
  await scheduleDailyNotification({
    logicalKey: 'factory:empty-diary',
    title: msg.title,
    body: msg.body,
    route: msg.route,
    channelId: msg.channelId,
    hour: FACTORY_SCHEDULE.emptyDiary.hour,
    minute: FACTORY_SCHEDULE.emptyDiary.minute,
  });
}

async function syncStreakCelebration(ctx: SyncContext) {
  if (await wasStreak7Celebrated()) {
    await cancelLogicalKeys(['factory:streak-7']);
    return;
  }

  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const data = await ctx.request<{ days?: Array<{ date: string; entryCount?: number }> }>(
      `/food-diary/month?year=${year}&month=${month}`,
    );
    const diaryDays = Array.isArray(data.days) ? data.days : [];
    const map = buildMonthActivityMap([], {}, diaryDays);
    const streak = computeCurrentStreak(map);
    if (streak < 7) {
      await cancelLogicalKeys(['factory:streak-7']);
      return;
    }

    const msg = FACTORY_MESSAGES.streak7;
    const when = new Date(Date.now() + (NOTIFICATION_TEST_MODE ? 90_000 : 60_000));
    await scheduleAtDate({
      logicalKey: 'factory:streak-7',
      title: msg.title,
      body: msg.body,
      route: msg.route,
      channelId: msg.channelId,
      date: when,
    });
    await markStreak7Celebrated();
  } catch {
    /* ignore */
  }
}

async function syncReengagement() {
  await touchLastAppOpen();
  const lastOpen = await getLastAppOpen();
  if (!lastOpen) return;

  const msg = FACTORY_MESSAGES.reengagement;
  const when = new Date(lastOpen + daysToMs(FACTORY_LIMITS.reengagementDays));
  await scheduleAtDate({
    logicalKey: 'factory:reengagement',
    title: msg.title,
    body: msg.body,
    route: msg.route,
    channelId: msg.channelId,
    date: when,
  });
}

async function syncOnboardingRecovery(ctx: SyncContext) {
  if (ctx.onboardingComplete) {
    await clearOnboardingLeft();
    await cancelLogicalKeys(['factory:onboarding-recovery']);
    return;
  }

  const leftAt = await getOnboardingLeftAt();
  if (!leftAt) return;

  const msg = FACTORY_MESSAGES.onboardingRecovery;
  const when = new Date(leftAt + hoursToMs(FACTORY_LIMITS.onboardingRecoveryHours));
  await scheduleAtDate({
    logicalKey: 'factory:onboarding-recovery',
    title: msg.title,
    body: msg.body,
    route: msg.route,
    channelId: msg.channelId,
    date: when,
  });
}

async function syncCheckinDraftRecovery() {
  const startedAt = await getCheckinDraftStartedAt();
  if (!startedAt) {
    await cancelLogicalKeys(['factory:checkin-draft']);
    return;
  }

  const msg = FACTORY_MESSAGES.checkinDraftRecovery;
  const when = new Date(startedAt + hoursToMs(FACTORY_LIMITS.checkinDraftRecoveryHours));
  await scheduleAtDate({
    logicalKey: 'factory:checkin-draft',
    title: msg.title,
    body: msg.body,
    route: msg.route,
    channelId: msg.channelId,
    date: when,
  });
}

export async function syncLocalNotifications(ctx: SyncContext) {
  const permission = await getPermissionState();
  if (permission !== 'granted') return;

  await syncUserReminders();
  await syncWeeklyCheckin(ctx);
  await syncEmptyDiary(ctx);
  await syncStreakCelebration(ctx);
  await syncReengagement();
  await syncOnboardingRecovery(ctx);
  await syncCheckinDraftRecovery();
}

export async function onCheckinCompleted() {
  await cancelLogicalKeys(['factory:weekly-checkin', 'factory:checkin-draft']);
  await clearCheckinDraftStarted();
}

export async function onFoodDiaryUpdated(ctx: SyncContext) {
  await syncEmptyDiary(ctx);
}
