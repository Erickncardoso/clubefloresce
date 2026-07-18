import { FoodSource } from "@prisma/client";
import { FoodRepository } from "../repositories/food.repository";
import {
  calculateFoodSubstitution,
  type SubstitutionRequest,
} from "./food-substitution.service";

export class FoodService {
  private repo = new FoodRepository();

  async getCatalogMeta() {
    return this.repo.getCatalogMeta();
  }

  async getCatalog() {
    const [meta, items] = await Promise.all([
      this.repo.getCatalogMeta(),
      this.repo.listCatalogItems(),
    ]);
    return { version: meta.version, items };
  }

  async getStats() {
    const grouped = await this.repo.countBySource();
    const bySource = Object.fromEntries(
      grouped.map((row) => [row.source, row._count._all]),
    ) as Record<string, number>;

    return {
      total: grouped.reduce((acc, row) => acc + row._count._all, 0),
      bySource,
    };
  }

  async search(input: { q?: string; source?: string; limit?: number }) {
    const source =
      input.source === "TACO" || input.source === "TBCA"
        ? (input.source as FoodSource)
        : undefined;

    return this.repo.search({
      q: input.q || "",
      source,
      limit: input.limit,
    });
  }

  async matchByName(name: string, source?: string) {
    const parsedSource =
      source === "TACO" || source === "TBCA" ? (source as FoodSource) : undefined;
    return this.repo.findBestMatch(name, parsedSource);
  }

  /** Plano alimentar: TBCA + TACO + overrides Florescer (CUSTOM), melhor score global. */
  async matchForMealPlan(name: string) {
    return this.repo.findBestMealPlanMatch(name);
  }

  async matchBatchForMealPlan(items: Array<{ key: string; name: string }>) {
    const { matchFoodCandidatesBatch } = await import("./meal-plan/meal-plan-food-enricher");
    return matchFoodCandidatesBatch(items, 10);
  }

  async getById(id: string) {
    return this.repo.findById(id);
  }

  async calculateSubstitution(input: SubstitutionRequest) {
    return calculateFoodSubstitution(input);
  }
}
