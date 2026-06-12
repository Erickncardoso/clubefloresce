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
}
