import { Request, Response } from "express";
import { FoodService } from "../services/food.service";

export class FoodController {
  private service = new FoodService();

  async stats(_req: Request, res: Response) {
    try {
      const stats = await this.service.getStats();
      res.json(stats);
    } catch (err) {
      console.error("[foods.stats]", err);
      res.status(500).json({ message: "Erro ao carregar estatísticas da base de alimentos." });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const source = typeof req.query.source === "string" ? req.query.source : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await this.service.search({ q, source, limit });
      res.json(result);
    } catch (err) {
      console.error("[foods.search]", err);
      res.status(500).json({ message: "Erro ao buscar alimentos." });
    }
  }

  async match(req: Request, res: Response) {
    try {
      const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
      if (!name) {
        res.status(400).json({ message: "Informe o nome do alimento." });
        return;
      }
      const source = typeof req.query.source === "string" ? req.query.source : undefined;
      const item = await this.service.matchByName(name, source);
      res.json({ item });
    } catch (err) {
      console.error("[foods.match]", err);
      res.status(500).json({ message: "Erro ao localizar alimento." });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const item = await this.service.getById(req.params.id);
      if (!item) {
        res.status(404).json({ message: "Alimento não encontrado." });
        return;
      }
      res.json({ item });
    } catch (err) {
      console.error("[foods.getById]", err);
      res.status(500).json({ message: "Erro ao carregar alimento." });
    }
  }

  async substitute(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const grams = Number(body.grams);
      if (!Number.isFinite(grams) || grams <= 0) {
        res.status(400).json({ message: "Informe a quantidade em gramas." });
        return;
      }

      if (!body.foodId && !body.foodName?.trim()) {
        res.status(400).json({ message: "Selecione o alimento de referência." });
        return;
      }

      const mode = body.mode === "specific" ? "specific" : "multiple";
      if (mode === "specific" && !body.replacementId && !body.replacementName?.trim()) {
        res.status(400).json({ message: "Selecione o substituto específico." });
        return;
      }

      const criterion = ["calories", "protein", "carbs", "fat"].includes(body.criterion)
        ? body.criterion
        : "calories";

      const groupFilter = ["all", "carb_rich", "protein_rich", "fat_rich"].includes(body.groupFilter)
        ? body.groupFilter
        : "all";

      const result = await this.service.calculateSubstitution({
        foodId: body.foodId,
        foodName: body.foodName,
        grams,
        mode,
        criterion,
        groupFilter,
        replacementId: body.replacementId,
        replacementName: body.replacementName,
        limit: body.limit ? Number(body.limit) : undefined,
      });

      if (!result) {
        res.status(404).json({ message: "Alimento de referência não encontrado na base TBCA/TACO." });
        return;
      }

      res.json(result);
    } catch (err) {
      console.error("[foods.substitute]", err);
      res.status(500).json({ message: "Erro ao calcular substituições." });
    }
  }
}
