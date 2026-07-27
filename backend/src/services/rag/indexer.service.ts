import type { KnowledgeSourceType } from "@prisma/client";
import {
  backfillGlobalSources,
  backfillPatientSources,
  backfillFoodSources,
  indexCheckIns,
  indexCourse,
  indexEbook,
  indexFoodItem,
  indexFoodOverride,
  indexLesson,
  indexMealPlan,
  indexNutriNotes,
  indexPatientProfile,
  indexPost,
} from "./source-indexers";

type ReindexTarget =
  | { type: "lesson"; id: string }
  | { type: "course"; id: string }
  | { type: "ebook"; id: string }
  | { type: "post"; id: string }
  | { type: "food"; id: string }
  | { type: "food_override"; id: string }
  | { type: "meal_plan"; userId: string }
  | { type: "profile"; userId: string }
  | { type: "checkin"; userId: string }
  | { type: "nutri_notes" };

export class RagIndexerService {
  async reindex(target: ReindexTarget): Promise<number> {
    switch (target.type) {
      case "lesson":
        return indexLesson(target.id);
      case "course":
        return indexCourse(target.id);
      case "ebook":
        return indexEbook(target.id);
      case "post":
        return indexPost(target.id);
      case "food":
        return indexFoodItem(target.id);
      case "food_override":
        return indexFoodOverride(target.id);
      case "meal_plan":
        return indexMealPlan(target.userId);
      case "profile":
        return indexPatientProfile(target.userId);
      case "checkin":
        return indexCheckIns(target.userId);
      case "nutri_notes":
        return indexNutriNotes();
      default:
        return 0;
    }
  }

  scheduleReindex(target: ReindexTarget): void {
    void this.reindex(target).catch((error) => {
      console.warn("[RAG] Falha ao reindexar:", target, error?.message || error);
    });
  }

  async backfillAll(): Promise<{ global: Record<string, number>; patients?: Record<string, number> }> {
    const global = await backfillGlobalSources();
    return { global };
  }

  async backfillPatient(userId: string): Promise<Record<string, number>> {
    return backfillPatientSources(userId);
  }

  async backfillFoods(): Promise<number> {
    return backfillFoodSources();
  }
}

export const ragIndexerService = new RagIndexerService();

export type { KnowledgeSourceType, ReindexTarget };
