import { PrismaClient } from "@prisma/client";
import type { ParsedMealPlan } from "../types/meal-plan.types";

const prisma = new PrismaClient();

export class MealPlanRepository {
  async findByUserId(userId: string) {
    return prisma.patientMealPlan.findUnique({ where: { userId } });
  }

  async upsert(userId: string, data: {
    fileName: string;
    pdfUrl?: string | null;
    title?: string | null;
    patientName?: string | null;
    prescribedAt?: string | null;
    plan: ParsedMealPlan;
    parserSource: string;
  }) {
    return prisma.patientMealPlan.upsert({
      where: { userId },
      create: {
        userId,
        fileName: data.fileName,
        pdfUrl: data.pdfUrl ?? null,
        title: data.title ?? data.plan.title,
        patientName: data.patientName ?? data.plan.patientName,
        prescribedAt: data.prescribedAt ?? data.plan.prescribedAt,
        plan: data.plan as object,
        parserSource: data.parserSource,
      },
      update: {
        fileName: data.fileName,
        pdfUrl: data.pdfUrl ?? null,
        title: data.title ?? data.plan.title,
        patientName: data.patientName ?? data.plan.patientName,
        prescribedAt: data.prescribedAt ?? data.plan.prescribedAt,
        plan: data.plan as object,
        parserSource: data.parserSource,
      },
    });
  }
}
