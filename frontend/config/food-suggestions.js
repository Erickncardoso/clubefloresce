import { macrosForFoodRecord } from '~/utils/food-bank'

/** @deprecated Use useFoodBank().searchFoods — mantido como fallback offline. */
export const FOOD_CATALOG = []

export function findFoodByName(_name) {
  return null
}

export function findFoodById(_foodId) {
  return null
}

export function macrosForFood(food, grams) {
  return macrosForFoodRecord(food, grams)
}
