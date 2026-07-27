import { Request, Response } from "express";
import { MealPlanService } from "../services/meal-plan/meal-plan.service";
import { ShoppingListSmartService } from "../services/meal-plan/shopping-list-smart.service";

const mealPlanService = new MealPlanService();
const shoppingListSmartService = new ShoppingListSmartService();

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

  async updateSelections(req: Request, res: Response): Promise<any> {
    try {
      const selectedMealBySlot = req.body?.selectedMealBySlot;
      if (!selectedMealBySlot || typeof selectedMealBySlot !== "object" || Array.isArray(selectedMealBySlot)) {
        return res.status(400).json({ message: "Informe as opções escolhidas (selectedMealBySlot)." });
      }

      const plan = await mealPlanService.updateSelections(
        req.user!.id,
        selectedMealBySlot as Record<string, string>,
      );

      return res.json({
        message: "Opções do cardápio atualizadas.",
        plan,
      });
    } catch (error: any) {
      const message = error.message || "Não foi possível salvar as opções.";
      const status = /nenhum plano/i.test(message) ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  async smartShoppingList(req: Request, res: Response): Promise<any> {
    try {
      const itemsText = String(req.body?.itemsText || "").trim();
      const planTitle = String(req.body?.planTitle || "").trim();
      const periodDays = Number(req.body?.periodDays) || 7;
      const smartListUses = Math.max(0, Number(req.body?.smartListUses) || 0);

      if (smartListUses >= 5) {
        return res.status(429).json({ message: "Limite de 5 usos da Lista Inteligente atingido neste plano." });
      }

      const result = await shoppingListSmartService.organize({
        itemsText,
        planTitle,
        periodDays,
      });

      return res.json({
        ...result,
        smartListUses: smartListUses + 1,
        remainingUses: Math.max(0, 5 - (smartListUses + 1)),
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Não foi possível organizar a lista." });
    }
  }
}
