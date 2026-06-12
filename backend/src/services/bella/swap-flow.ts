export type SwapFlowStep = "meal" | "food" | "mode";

export interface SwapButtonOption {
  id: string;
  label: string;
}

export const SWAP_MEAL_QUESTION =
  "Em qual refeição você gostaria de substituir um alimento?\n\nEscolha uma opção abaixo:";

export const SWAP_FOOD_QUESTION =
  "Qual alimento dessa refeição você quer substituir?\n\nEscolha uma opção:";

export const SWAP_MODE_QUESTION =
  "Como você prefere continuar?\n\nDigite o alimento que quer incluir no lugar ou peça sugestões:";

export const SWAP_NO_PLAN_MESSAGE =
  "Ainda não encontrei um plano alimentar cadastrado para você. Peça à sua nutricionista para publicar o plano no app e volte aqui para trocar alimentos com segurança.";

export function buildSwapSelectionMetadata(step: SwapFlowStep, options: SwapButtonOption[]) {
  return {
    topic: "swap",
    taskType: "chat",
    pendingSwapSelection: true,
    swapStep: step,
    swapOptions: options,
  };
}

export function buildSwapModeMetadata(swapMealId: string, swapFoodKey: string) {
  return {
    topic: "swap",
    taskType: "chat",
    pendingSwapMode: true,
    swapMealId,
    swapFoodKey,
  };
}
