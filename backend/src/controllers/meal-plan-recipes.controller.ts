import { Request, Response } from "express";
import { mealPlanRecipesService } from "../services/meal-plan/meal-plan-recipes.service";
import { recipeAiImportService } from "../services/meal-plan/recipe-ai-import.service";

export class MealPlanRecipesController {
  async list(_req: Request, res: Response) {
    try {
      const items = await mealPlanRecipesService.list();
      res.json({ items });
    } catch (err) {
      console.error("[meal-plan.recipes.list]", err);
      res.status(500).json({ message: "Erro ao carregar receitas." });
    }
  }

  async listMine(req: Request, res: Response) {
    try {
      const patientId = req.user?.id;
      if (!patientId) {
        res.status(401).json({ message: "Não autenticado." });
        return;
      }
      const items = await mealPlanRecipesService.listForPatient(patientId);
      res.json({ items });
    } catch (err) {
      console.error("[meal-plan.recipes.listMine]", err);
      res.status(500).json({ message: "Erro ao carregar receitas." });
    }
  }

  async upsert(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const item = await mealPlanRecipesService.upsert({
        id: typeof body.id === "string" ? body.id : undefined,
        title: typeof body.title === "string" ? body.title : "",
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
        imagePosition: typeof body.imagePosition === "string" ? body.imagePosition : "50% 50%",
        servingsLabel: typeof body.servingsLabel === "string" ? body.servingsLabel : "1 porção",
        prepMinutes: body.prepMinutes != null ? Number(body.prepMinutes) : null,
        shareWithAll: body.shareWithAll === true,
        sharedPatientIds: Array.isArray(body.sharedPatientIds) ? body.sharedPatientIds : [],
        ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
        steps: typeof body.steps === "string" ? body.steps : "",
      });
      res.json({ item });
    } catch (err: any) {
      console.error("[meal-plan.recipes.upsert]", err);
      res.status(400).json({ message: err?.message || "Erro ao salvar receita." });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      await mealPlanRecipesService.delete(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[meal-plan.recipes.remove]", err);
      res.status(500).json({ message: "Erro ao excluir receita." });
    }
  }

  async importFromFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        res.status(400).json({ message: "Envie o PDF ou a foto da receita." });
        return;
      }

      const result = await recipeAiImportService.importFromFile({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      res.json({
        draft: result.draft,
        sourceType: result.sourceType,
        warnings: result.warnings,
        message: "Receita extraída. Revise os ingredientes antes de salvar.",
      });
    } catch (err: any) {
      console.error("[meal-plan.recipes.import]", err);
      const message = String(err?.message || "Erro ao importar receita.");
      const status = /OPENAI_API_KEY|indisponível/i.test(message)
        ? 503
        : /vazio|encontramos|suportado|escaneado|ler o PDF/i.test(message)
          ? 400
          : 500;
      res.status(status).json({ message });
    }
  }
}
