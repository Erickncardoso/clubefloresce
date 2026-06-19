import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { MealItemDraft } from "../types/food-diary.types";

export class FoodDiaryRepository {
  async getOrCreateTargets(userId: string) {
    const existing = await prisma.nutritionTarget.findUnique({ where: { userId } });
    if (existing) return existing;

    return prisma.nutritionTarget.create({
      data: { userId },
    });
  }

  async upsertTargets(
    userId: string,
    data: {
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    },
  ) {
    return prisma.nutritionTarget.upsert({
      where: { userId },
      create: {
        userId,
        caloriesKcal: data.caloriesKcal,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
      },
      update: {
        caloriesKcal: data.caloriesKcal,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
      },
    });
  }

  async findEntriesByDate(userId: string, entryDate: Date) {
    return prisma.foodDiaryEntry.findMany({
      where: { userId, entryDate },
      orderBy: { createdAt: "asc" },
    });
  }

  async findEntriesInRange(userId: string, startDate: Date, endDate: Date) {
    return prisma.foodDiaryEntry.findMany({
      where: {
        userId,
        entryDate: { gte: startDate, lte: endDate },
      },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
      select: {
        entryDate: true,
        caloriesKcal: true,
        carbsG: true,
        proteinG: true,
        fatG: true,
      },
    });
  }

  async createEntry(data: {
    userId: string;
    entryDate: Date;
    mealType: string;
    mealLabel?: string;
    imageUrl?: string;
    items: MealItemDraft[];
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
  }) {
    return prisma.foodDiaryEntry.create({
      data: {
        userId: data.userId,
        entryDate: data.entryDate,
        mealType: data.mealType,
        mealLabel: data.mealLabel,
        imageUrl: data.imageUrl,
        items: data.items as unknown as Prisma.InputJsonValue,
        caloriesKcal: data.caloriesKcal,
        carbsG: data.carbsG,
        proteinG: data.proteinG,
        fatG: data.fatG,
      },
    });
  }
}
