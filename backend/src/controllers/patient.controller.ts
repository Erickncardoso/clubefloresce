import { Request, Response } from "express";
import { PatientOverviewService } from "../services/patient-overview.service";
import { MealPlanService } from "../services/meal-plan/meal-plan.service";
import { FoodDiaryService } from "../services/food-diary.service";
import { PatientGoalsService } from "../services/patient-goals.service";
import { assertPatientUser } from "../utils/patient-access";
import { prisma } from "../lib/prisma";

const overviewService = new PatientOverviewService();
const mealPlanService = new MealPlanService();
const foodDiaryService = new FoodDiaryService();
const patientGoalsService = new PatientGoalsService();

export class PatientController {
  async getOverview(req: Request, res: Response): Promise<any> {
    try {
      const data = await overviewService.getOverview(req.params.id);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getFoodDiary(req: Request, res: Response): Promise<any> {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const entries = await overviewService.getFoodDiaryRecent(req.params.id, limit);
      return res.json({ entries });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getMealPlan(req: Request, res: Response): Promise<any> {
    try {
      await assertPatientUser(req.params.id);
      const plan = await mealPlanService.getForUser(req.params.id);
      return res.json({ plan });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async uploadMealPlan(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Envie o PDF do planejamento alimentar." });
      }

      await assertPatientUser(req.params.id);
      const result = await mealPlanService.uploadAndSave(req.params.id, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      return res.json({
        message: "Plano alimentar importado com sucesso.",
        plan: result.plan,
        user: result.user,
        nutritionTargets: result.nutritionTargets,
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message || "Não foi possível processar o PDF." });
    }
  }

  async getFoodDiaryMonth(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.params.id;
      await assertPatientUser(userId);
      const fallback = new Date().toISOString().slice(0, 10);
      const year = Number(req.query.year) || Number(fallback.slice(0, 4));
      const month = Number(req.query.month) || Number(fallback.slice(5, 7));
      const data = await foodDiaryService.getMonthSummary(userId, year, month);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getFoodDiaryDay(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.params.id;
      await assertPatientUser(userId);
      const dateKey =
        typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
          ? req.query.date
          : new Date().toISOString().slice(0, 10);
      const data = await foodDiaryService.getDailySummary(userId, dateKey);
      return res.json(data);
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getFoodDiaryPhotos(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.params.id;
      await assertPatientUser(userId);
      const limit = Math.min(Number(req.query.limit) || 48, 100);
      const entries = await prisma.foodDiaryEntry.findMany({
        where: { userId, imageUrl: { not: null } },
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        select: {
          id: true,
          entryDate: true,
          mealType: true,
          mealLabel: true,
          imageUrl: true,
          caloriesKcal: true,
          createdAt: true,
        },
      });
      return res.json({
        photos: entries.map((entry) => ({
          id: entry.id,
          entryDate: entry.entryDate.toISOString().slice(0, 10),
          mealType: entry.mealType,
          mealLabel: entry.mealLabel,
          imageUrl: entry.imageUrl,
          caloriesKcal: entry.caloriesKcal,
          createdAt: entry.createdAt,
        })),
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async getGoals(req: Request, res: Response): Promise<any> {
    try {
      const data = await patientGoalsService.getForUser(req.params.id);
      return res.json(data || { goals: [], progress: {} });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
}
