import { Request, Response } from "express";
import { FoodDiaryService } from "../services/food-diary.service";
import { readPatientTimeHeaders, resolvePatientDateKey } from "../utils/patient-timezone";

const foodDiaryService = new FoodDiaryService();

function resolveDateKey(req: Request): string {
  const headers = readPatientTimeHeaders(req);
  const queryDate = typeof req.query.date === "string" ? req.query.date : undefined;
  if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) return queryDate;
  return resolvePatientDateKey(headers);
}

export class FoodDiaryController {
  async getToday(req: Request, res: Response): Promise<any> {
    try {
      const dateKey = resolveDateKey(req);
      const data = await foodDiaryService.getDailySummary(req.user!.id, dateKey);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async getMonth(req: Request, res: Response): Promise<any> {
    try {
      const headers = readPatientTimeHeaders(req);
      const fallback = resolvePatientDateKey(headers);
      const year = Number(req.query.year) || Number(fallback.slice(0, 4));
      const month = Number(req.query.month) || Number(fallback.slice(5, 7));
      const data = await foodDiaryService.getMonthSummary(req.user!.id, year, month);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async confirm(req: Request, res: Response): Promise<any> {
    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const dateKey = resolveDateKey(req);
      const result = await foodDiaryService.confirmEntry(
        req.user!.id,
        {
          items,
          mealType: typeof body.mealType === "string" ? body.mealType : "other",
          mealLabel: typeof body.mealLabel === "string" ? body.mealLabel : undefined,
          imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
          topic: typeof body.topic === "string" ? body.topic : "meal",
          userMessageId: typeof body.userMessageId === "string" ? body.userMessageId : undefined,
        },
        dateKey,
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async updateEntry(req: Request, res: Response): Promise<any> {
    try {
      const entryId = String(req.params.id || "").trim();
      if (!entryId) return res.status(400).json({ message: "Refeição inválida." });

      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const result = await foodDiaryService.updateEntry(
        req.user!.id,
        entryId,
        {
          items,
          mealType: typeof body.mealType === "string" ? body.mealType : undefined,
          mealLabel: typeof body.mealLabel === "string" ? body.mealLabel : undefined,
          imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
        },
      );
      return res.json(result);
    } catch (error: any) {
      const status = error.message === "Refeição não encontrada." ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async deleteEntry(req: Request, res: Response): Promise<any> {
    try {
      const entryId = String(req.params.id || "").trim();
      if (!entryId) return res.status(400).json({ message: "Refeição inválida." });

      const result = await foodDiaryService.deleteEntry(req.user!.id, entryId);
      return res.json(result);
    } catch (error: any) {
      const status = error.message === "Refeição não encontrada." ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async syncPlanCheck(req: Request, res: Response): Promise<any> {
    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const dateKey = resolveDateKey(req);
      const result = await foodDiaryService.syncPlanCheckEntry(
        req.user!.id,
        {
          mealType: typeof body.mealType === "string" ? body.mealType : "other",
          mealLabel: typeof body.mealLabel === "string" ? body.mealLabel : undefined,
          items,
        },
        dateKey,
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
