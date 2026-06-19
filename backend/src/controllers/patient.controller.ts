import { Request, Response } from "express";
import { PatientOverviewService } from "../services/patient-overview.service";
import { MealPlanService } from "../services/meal-plan/meal-plan.service";
import { assertPatientUser } from "../utils/patient-access";

const overviewService = new PatientOverviewService();
const mealPlanService = new MealPlanService();

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
      });
    } catch (error: any) {
      const status = error.message?.includes("não encontrado") ? 404 : 400;
      return res.status(status).json({ message: error.message || "Não foi possível processar o PDF." });
    }
  }
}
