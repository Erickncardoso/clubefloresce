import { prisma } from "../lib/prisma";
import { assertPatientUser } from "../utils/patient-access";
import { getWeekStart } from "../utils/week-start";
import { MealPlanService } from "./meal-plan/meal-plan.service";
import { FoodDiaryService } from "./food-diary.service";
import { getDateKeyInTimeZone } from "../utils/patient-timezone";

const mealPlanService = new MealPlanService();

export class PatientOverviewService {
  async getOverview(userId: string) {
    const patient = await assertPatientUser(userId);
    const weekStart = getWeekStart();

    const [
      currentCheckIn,
      checkInCount,
      latestCheckIn,
      mealPlan,
      nutritionTarget,
      todayDiary,
      foodDiaryDays,
      courseProgress,
      recentBella,
      recentCheckIns,
    ] = await Promise.all([
      prisma.weeklyCheckIn.findUnique({
        where: { userId_weekStart: { userId, weekStart } },
      }),
      prisma.weeklyCheckIn.count({ where: { userId } }),
      prisma.weeklyCheckIn.findFirst({
        where: { userId },
        orderBy: { weekStart: "desc" },
      }),
      mealPlanService.getForUser(userId),
      prisma.nutritionTarget.findUnique({ where: { userId } }),
      new FoodDiaryService().getDailySummary(userId, getDateKeyInTimeZone("UTC")).catch(() => null),
      prisma.foodDiaryEntry.groupBy({
        by: ["entryDate"],
        where: { userId },
        _count: { id: true },
        orderBy: { entryDate: "desc" },
        take: 7,
      }),
      this.getCourseProgress(userId),
      prisma.bellaMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, role: true, topic: true, content: true, createdAt: true },
      }),
      prisma.weeklyCheckIn.findMany({
        where: { userId },
        orderBy: { weekStart: "desc" },
        take: 8,
      }),
    ]);

    return {
      patient,
      weekStart,
      checkIn: {
        current: currentCheckIn,
        total: checkInCount,
        latest: latestCheckIn,
        recent: recentCheckIns,
        missingThisWeek: !currentCheckIn,
      },
      mealPlan: mealPlan
        ? {
            id: mealPlan.id,
            title: mealPlan.title,
            fileName: mealPlan.fileName,
            pdfUrl: mealPlan.pdfUrl,
            mealCount: mealPlan.plan?.meals?.length ?? 0,
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
