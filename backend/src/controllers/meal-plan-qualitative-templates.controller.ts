import { Request, Response } from "express";
import { mealPlanQualitativeTemplatesService } from "../services/meal-plan/meal-plan-qualitative-templates.service";

export class MealPlanQualitativeTemplatesController {
  async list(_req: Request, res: Response) {
    try {
      const items = await mealPlanQualitativeTemplatesService.list();
      res.json({ items });
    } catch (err) {
      console.error("[meal-plan.qualitative-templates.list]", err);
      res.status(500).json({ message: "Erro ao carregar modelos qualitativos." });
    }
  }

  async upsert(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const item = await mealPlanQualitativeTemplatesService.upsert({
        id: typeof body.id === "string" ? body.id : undefined,
        title: typeof body.title === "string" ? body.title : "",
        editorHtml: typeof body.editorHtml === "string" ? body.editorHtml : "",
        editorText: typeof body.editorText === "string" ? body.editorText : "",
        finalNotes: typeof body.finalNotes === "string" ? body.finalNotes : null,
      });
      res.json({ item });
    } catch (err: any) {
      console.error("[meal-plan.qualitative-templates.upsert]", err);
      res.status(400).json({ message: err?.message || "Erro ao salvar modelo qualitativo." });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      await mealPlanQualitativeTemplatesService.delete(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[meal-plan.qualitative-templates.remove]", err);
      res.status(500).json({ message: "Erro ao excluir modelo qualitativo." });
    }
  }
}
