import { FoodSource } from "@prisma/client";
import { FoodRepository } from "../repositories/food.repository";

export class FoodService {
  private repo = new FoodRepository();

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

  async getById(id: string) {
    return this.repo.findById(id);
  }
}
