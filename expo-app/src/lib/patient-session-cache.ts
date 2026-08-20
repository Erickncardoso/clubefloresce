import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingStatus, PatientUser } from '@/types/patient';
import type { PatientMealPlanRecord } from '@/lib/meal-plan-api';
import type { DailySummary } from '@/types/daily-summary';

const USER_KEY = 'cf_expo_cached_user';
const ONBOARDING_KEY = 'cf_expo_cached_onboarding';
const MEAL_PLAN_KEY = 'cf_expo_cached_meal_plan';
const LIBRARY_KEY = 'cf_expo_cached_library';
const DAILY_SUMMARY_KEY = 'cf_expo_cached_daily_summary';

export async function getCachedPatientUser(): Promise<PatientUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatientUser;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCachedPatientUser(user: PatientUser | null): Promise<void> {
  try {
    if (!user?.id) {
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* cache opcional */
  }
}

export async function getCachedOnboarding(): Promise<OnboardingStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingStatus;
  } catch {
    return null;
  }
}

export async function saveCachedOnboarding(status: OnboardingStatus | null): Promise<void> {
  try {
    if (!status) {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      return;
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(status));
  } catch {
    /* cache opcional */
  }
}

export async function getCachedMealPlan(): Promise<PatientMealPlanRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(MEAL_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatientMealPlanRecord | null;
    return parsed ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedMealPlan(plan: PatientMealPlanRecord | null): Promise<void> {
  try {
    if (!plan) {
      await AsyncStorage.removeItem(MEAL_PLAN_KEY);
      return;
    }
    await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* cache opcional */
  }
}

type LibraryCache = {
  courses: Record<string, unknown>[];
  ebooks: Record<string, unknown>[];
};

export async function getCachedLibrary(): Promise<LibraryCache | null> {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LibraryCache;
    if (!Array.isArray(parsed?.courses) || !Array.isArray(parsed?.ebooks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedLibrary(data: LibraryCache): Promise<void> {
  try {
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(data));
  } catch {
    /* cache opcional */
  }
}

function todayCacheKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getCachedDailySummary(): Promise<DailySummary | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_SUMMARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date: string; summary: DailySummary };
    if (parsed?.date !== todayCacheKey()) return null;
    return parsed.summary ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedDailySummary(summary: DailySummary | null): Promise<void> {
  try {
    if (!summary) {
      await AsyncStorage.removeItem(DAILY_SUMMARY_KEY);
      return;
    }
    await AsyncStorage.setItem(
      DAILY_SUMMARY_KEY,
      JSON.stringify({ date: todayCacheKey(), summary }),
    );
  } catch {
    /* cache opcional */
  }
}

export async function clearPatientSessionCache(): Promise<void> {
  await AsyncStorage.multiRemove([
    USER_KEY,
    ONBOARDING_KEY,
    MEAL_PLAN_KEY,
    LIBRARY_KEY,
    DAILY_SUMMARY_KEY,
  ]);
}
