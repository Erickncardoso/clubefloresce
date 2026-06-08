import { cloudinaryUpload } from "../../utils/cloudinary";
import { MealPlanRepository } from "../../repositories/meal-plan.repository";
import type { ParsedMealPlan, PatientMealPlanResponse } from "../../types/meal-plan.types";
import { parseDietboxMealPlan } from "./dietbox-parser";
import { parseMealPlanWithAi } from "./meal-plan-ai-parser";
import { extractPdfRawText } from "./pdf-text";

const repo = new MealPlanRepository();

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
}): PatientMealPlanResponse {
  return {
    id: record.id,
    fileName: record.fileName,
    pdfUrl: record.pdfUrl,
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
    return record ? toResponse(record) : null;
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
  ): Promise<PatientMealPlanResponse> {
    const fileName = file.originalname || "plano-alimentar.pdf";
    const plan = await this.parsePdfBuffer(file.buffer, fileName);

    let pdfUrl: string | null = null;
    try {
      pdfUrl = await cloudinaryUpload(file.buffer, "clube-meal-plan-pdfs", {
        resourceType: "raw",
        fileSizeBytes: file.size,
      });
    } catch {
      pdfUrl = null;
    }

    const saved = await repo.upsert(userId, {
      fileName,
      pdfUrl,
      plan,
      parserSource: plan.parserSource,
    });

    return toResponse(saved);
  }
}
