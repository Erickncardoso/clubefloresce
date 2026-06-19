import { Coffee, Cookie, Moon, Salad, Sun, Utensils } from 'lucide-vue-next'
import { MEAL_ORDER, MEAL_PLAN } from '~/config/meal-plan'

export function pickMealIcon(label = '') {
  const value = String(label).toLowerCase()
  if (value.includes('café') || value.includes('cafe')) return Coffee
  if (value.includes('lanche') || value.includes('shake') || value.includes('sobremesa')) return Cookie
  if (value.includes('almoço') || value.includes('almoco')) return Salad
  if (value.includes('jantar')) return Moon
  if (value.includes('tarde')) return Sun
  return Utensils
}

export function buildFallbackMealSlotOptions() {
  return MEAL_ORDER.filter((id) => MEAL_PLAN[id]).map((id) => ({
    id,
    label: MEAL_PLAN[id].label,
    short: MEAL_PLAN[id].short,
    icon: pickMealIcon(MEAL_PLAN[id].label),
  }))
}
