import { Request, Response } from "express";
import { MealPlanService } from "../services/meal-plan/meal-plan.service";

const mealPlanService = new MealPlanService();

export class MealPlanController {
  async getMine(req: Request, res: Response): Promise<any> {
    try {
      const data = await mealPlanService.getForUser(req.user!.id);
      return res.json({ plan: data });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async upload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Envie o PDF do planejamento alimentar." });
      }

      const result = await mealPlanService.uploadAndSave(req.user!.id, {
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
      return res.status(400).json({ message: error.message || "Não foi possível processar o PDF." });
    }
  }
}
