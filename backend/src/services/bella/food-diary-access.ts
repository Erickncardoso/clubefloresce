import type { FoodDiaryService } from "../food-diary.service";

let foodDiaryService: FoodDiaryService | null = null;

export async function getFoodDiaryService(): Promise<FoodDiaryService> {
  if (!foodDiaryService) {
    const { FoodDiaryService: Service } = await import("../food-diary.service");
    foodDiaryService = new Service();
  }
  return foodDiaryService;
}
