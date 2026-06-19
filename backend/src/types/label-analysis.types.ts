export type LabelMacroBlock = {
  caloriesKcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  addedSugarsG: number | null;
};

export type LabelNutritionExtraction = {
  readable: boolean;
  illegibleReason?: string;
  servingLabel?: string;
  servingSizeG?: number | null;
  perServing?: LabelMacroBlock;
  per100g?: LabelMacroBlock;
  productHint?: string;
  likelyProteinSource?: boolean;
  ingredientsPreview?: string;
};
