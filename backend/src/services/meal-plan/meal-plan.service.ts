import { cloudinaryDocumentUpload, cloudinaryUpload } from "../../utils/cloudinary";
import { resolveDocumentDeliveryUrl } from "../../utils/media/bunny-document-delivery";
import { MealPlanRepository } from "../../repositories/meal-plan.repository";
import type { ParsedMealPlan, PatientMealPlanResponse } from "../../types/meal-plan.types";
import { parseDietboxMealPlan } from "./dietbox-parser";
import { parseMealPlanWithAi } from "./meal-plan-ai-parser";
import { extractPdfRawText } from "./pdf-text";
import { normalizePersonName, syncUserNameFromMealPlan } from "./sync-patient-name";
import { syncNutritionTargetsFromMealPlan } from "./sync-nutrition-targets";
import { enrichParsedMealPlan, parsedMealPlanNeedsFoodEnrichment } from "./meal-plan-food-enricher";
import type { User } from "@prisma/client";

const repo = new MealPlanRepository();
const mealPlanEnrichInFlight = new Set<string>();

function scheduleMealPlanFoodEnrichment(
  userId: string,
  record: {
    fileName: string;
    pdfUrl: string | null;
    title: string | null;
    patientName: string | null;
    prescribedAt: string | null;
    parserSource: string;
  },
  plan: ParsedMealPlan,
) {
  if (mealPlanEnrichInFlight.has(userId)) return;
  mealPlanEnrichInFlight.add(userId);

  void (async () => {
    try {
      const enriched = await enrichParsedMealPlan(plan);
      if (!parsedMealPlanNeedsFoodEnrichment(enriched)) {
        await repo.upsert(userId, {
          fileName: record.fileName,
          pdfUrl: record.pdfUrl,
          title: record.title,
          patientName: record.patientName,
          prescribedAt: record.prescribedAt,
          plan: enriched,
          parserSource: record.parserSource,
        });
      }
    } catch (err) {
      console.error("[meal-plan] background food enrich failed", { userId, err });
    } finally {
      mealPlanEnrichInFlight.delete(userId);
    }
  })();
}

function toResponse(record: {
  id: string;
  fileName: string;
  pdfUrl: string | null;
  title: string | null;
  patientName: string | null;
  prescribedAt: string | null;
  plan: unknown;
  parserSource: string;
  updatedAt: Date;
}, userId?: string | null): PatientMealPlanResponse {
  return {
    id: record.id,
    fileName: record.fileName,
    pdfUrl: record.pdfUrl
      ? resolveDocumentDeliveryUrl(record.pdfUrl, userId)
      : null,
    title: record.title,
    patientName: record.patientName,
    prescribedAt: record.prescribedAt,
    plan: record.plan as ParsedMealPlan,
    parserSource: record.parserSource,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class MealPlanService {
  async getForUser(userId: string): Promise<PatientMealPlanResponse | null> {
    const record = await repo.findByUserId(userId);
    if (!record) return null;

    const plan = record.plan as unknown as ParsedMealPlan;
    if (parsedMealPlanNeedsFoodEnrichment(plan)) {
      scheduleMealPlanFoodEnrichment(userId, record, plan);
    }

    await syncUserNameFromMealPlan(userId, record.patientName);

    return toResponse({ ...record, plan }, userId);
  }

  async parsePdfBuffer(buffer: Buffer, fileName: string): Promise<ParsedMealPlan> {
    const { text } = await extractPdfRawText(buffer);

    try {
      const dietboxPlan = parseDietboxMealPlan(text, fileName);
      if (dietboxPlan.meals.length >= 1) return dietboxPlan;
    } catch {
      /* fallback abaixo */
    }

    if (process.env.OPENAI_API_KEY) {
      return parseMealPlanWithAi(text, fileName);
    }

    throw new Error(
      "Não foi possível ler o formato do PDF automaticamente. Peça à nutricionista o arquivo exportado em texto (não escaneado).",
    );
  }

  async uploadAndSave(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{
    plan: PatientMealPlanResponse;
    user: Omit<User, "password"> | null;
    nutritionTargets: {
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    } | null;
  }> {
    const fileName = file.originalname || "plano-alimentar.pdf";
    const parsedPlan = await this.parsePdfBuffer(file.buffer, fileName);
    const patientName = normalizePersonName(parsedPlan.patientName);

    let plan: ParsedMealPlan = {
      ...parsedPlan,
      patientName,
      title: parsedPlan.title?.trim() || "Planejamento alimentar",
    };

    plan = await enrichParsedMealPlan(plan);

    let pdfUrl: string | null = null;
    try {
      // PDF como "image" no Cloudinary entrega Content-Type correto no browser.
      const uploaded = await cloudinaryDocumentUpload(
        file.buffer,
        "clube-meal-plan-pdfs",
        file.originalname || fileName,
      );
      pdfUrl = uploaded.url;
    } catch {
      try {
        pdfUrl = await cloudinaryUpload(file.buffer, "clube-meal-plan-pdfs", {
          resourceType: "raw",
          fileSizeBytes: file.size,
          originalFilename: file.originalname,
          errorKind: "document",
        });
      } catch {
        pdfUrl = null;
      }
    }

    const saved = await repo.upsert(userId, {
      fileName,
      pdfUrl,
      plan,
      parserSource: plan.parserSource,
      patientName,
      title: plan.title,
      prescribedAt: plan.prescribedAt,
    });

    const syncedUser = await syncUserNameFromMealPlan(userId, patientName);
    const syncedTargets = await syncNutritionTargetsFromMealPlan(userId, plan.nutritionTotals);

    return {
      plan: toResponse(saved, userId),
      user: syncedUser,
      nutritionTargets: syncedTargets
        ? {
            caloriesKcal: syncedTargets.caloriesKcal,
            proteinG: syncedTargets.proteinG,
            carbsG: syncedTargets.carbsG,
            fatG: syncedTargets.fatG,
          }
        : null,
    };
  }

  async saveFromEditor(
    userId: string,
    input: {
      title: string;
      plan: ParsedMealPlan;
    },
  ): Promise<{
    plan: PatientMealPlanResponse;
    user: Omit<User, "password"> | null;
    nutritionTargets: {
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    } | null;
  }> {
    const title = input.title?.trim() || input.plan.title?.trim() || "Plano alimentar";
    let plan: ParsedMealPlan = {
      ...input.plan,
      title,
      fileName: `${title}.prescricao`,
      parserSource: input.plan.parserSource || "ai",
    };

    plan = await enrichParsedMealPlan(plan);

    const saved = await repo.upsert(userId, {
      fileName: plan.fileName,
      pdfUrl: null,
      plan,
      parserSource: plan.parserSource,
      patientName: plan.patientName,
      title: plan.title,
      prescribedAt: plan.prescribedAt,
    });

    const syncedUser = await syncUserNameFromMealPlan(userId, plan.patientName);
    const syncedTargets = await syncNutritionTargetsFromMealPlan(userId, plan.nutritionTotals);

    return {
      plan: toResponse(saved, userId),
      user: syncedUser,
      nutritionTargets: syncedTargets
        ? {
            caloriesKcal: syncedTargets.caloriesKcal,
            proteinG: syncedTargets.proteinG,
            carbsG: syncedTargets.carbsG,
            fatG: syncedTargets.fatG,
          }
        : null,
    };
  }
}
