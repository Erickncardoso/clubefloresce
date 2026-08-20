export type DailySummary = {
  targets?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
  consumed?: {
    caloriesKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
  entries?: Array<{
    id: string;
    mealType?: string;
    mealLabel?: string;
    caloriesKcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
    imageUrl?: string | null;
    createdAt?: string;
    items?: unknown[];
  }>;
};
