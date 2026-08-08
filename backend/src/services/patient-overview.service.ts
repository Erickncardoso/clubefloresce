import { prisma } from "../lib/prisma";
import { assertPatientUser } from "../utils/patient-access";
import { getWeekStart } from "../utils/week-start";
import { MealPlanService } from "./meal-plan/meal-plan.service";
import { FoodDiaryService } from "./food-diary.service";
import {
  DEFAULT_PATIENT_TIMEZONE,
  getDateKeyInTimeZone,
} from "../utils/patient-timezone";
import { resolveDocumentDeliveryUrl } from "../utils/media/bunny-document-delivery";
import type { PatientProfileData } from "../types/patient-profile.types";
import { resolvePatientTimezone } from "./patient-preferences.service";

const mealPlanService = new MealPlanService();
const foodDiaryService = new FoodDiaryService();

function asProfile(value: unknown): PatientProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PatientProfileData;
}

export class PatientOverviewService {
  async getOverview(userId: string) {
    const patient = await assertPatientUser(userId);
    const weekStart = getWeekStart();
    const profile = asProfile(patient.patientProfileData);
    const timeZone = resolvePatientTimezone(profile) || DEFAULT_PATIENT_TIMEZONE;
    const todayKey = getDateKeyInTimeZone(timeZone);

    const [checkInRows, checkInCount, currentCheckIn, mealPlan, nutritionTarget] = await Promise.all([
      prisma.weeklyCheckIn.findMany({
        where: { userId },
        orderBy: { weekStart: "desc" },
        take: 8,
      }),
      prisma.weeklyCheckIn.count({ where: { userId } }),
      prisma.weeklyCheckIn.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
      }),
      mealPlanService.getForUser(userId),
      prisma.nutritionTarget.findUnique({ where: { userId } }),
    ]);

    const latestCheckIn = checkInRows[0] ?? null;
    const mealCount = mealPlan?.plan?.meals?.length ?? 0;

    const [todayDiary, foodDiaryDays, courseProgress] = await Promise.all([
      foodDiaryService.getDailySummary(userId, todayKey).catch(() => null),
      prisma.foodDiaryEntry.groupBy({
        by: ["entryDate"],
        where: { userId },
        _count: { id: true },
        orderBy: { entryDate: "desc" },
        take: 7,
      }),
      this.getCourseProgress(userId),
    ]);

    const [recentBella, latestSubscription] = await Promise.all([
      prisma.bellaMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, role: true, topic: true, content: true, createdAt: true },
      }),
      prisma.billingSubscription.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { paymentMethod: true, status: true },
      }),
    ]);

    return {
      patient: {
        ...patient,
        billingSubscriptionPaymentMethod: latestSubscription?.paymentMethod || null,
        billingSubscriptionStatus: latestSubscription?.status || null,
      },
      weekStart,
      timezone: timeZone,
      todayKey,
      checkIn: {
        current: currentCheckIn,
        total: checkInCount,
        latest: latestCheckIn,
        recent: checkInRows,
        missingThisWeek: !currentCheckIn,
      },
      mealPlan: mealPlan
        ? {
            id: mealPlan.id,
            title: mealPlan.title,
            fileName: mealPlan.fileName,
            pdfUrl: mealPlan.pdfUrl
              ? resolveDocumentDeliveryUrl(mealPlan.pdfUrl, userId)
              : null,
            mealCount,
            hasMeals: mealCount > 0,
            status: mealCount > 0 ? "active" : "incomplete",
            updatedAt: mealPlan.updatedAt,
          }
        : null,
      nutritionTarget,
      foodDiary: {
        today: todayDiary,
        recentDays: foodDiaryDays.map((row) => ({
          date: row.entryDate,
          entries: row._count.id,
        })),
      },
      courseProgress,
      bella: {
        recentMessages: recentBella.map((msg) => ({
          id: msg.id,
          role: msg.role,
          topic: msg.topic,
          preview: msg.content.slice(0, 160),
          createdAt: msg.createdAt,
        })),
      },
    };
  }

  async getFoodDiaryRecent(userId: string, limit = 14) {
    await assertPatientUser(userId);
    const entries = await prisma.foodDiaryEntry.findMany({
      where: { userId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return entries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate,
      mealType: entry.mealType,
      mealLabel: entry.mealLabel,
      imageUrl: entry.imageUrl,
      caloriesKcal: entry.caloriesKcal,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      items: entry.items,
      createdAt: entry.createdAt,
    }));
  }

  private async getCourseProgress(userId: string) {
    const [watchedLessons, totalLessons] = await Promise.all([
      prisma.lessonProgress.count({ where: { userId, watched: true } }),
      prisma.lesson.count(),
    ]);

    return {
      watchedLessons,
      totalLessons,
      percent: totalLessons ? Math.round((watchedLessons / totalLessons) * 100) : 0,
    };
  }
}
