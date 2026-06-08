export function parseMealTimeToMinutes(time) {
  if (!time || typeof time !== 'string') return 0
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return hours * 60 + minutes
}

export function getMealIdForTimeFromMeals(meals = [], date = new Date()) {
  if (!meals.length) return null

  const now = date.getHours() * 60 + date.getMinutes()
  const sorted = [...meals].sort(
    (a, b) => parseMealTimeToMinutes(a.time) - parseMealTimeToMinutes(b.time),
  )

  let currentId = sorted[0].id
  for (const meal of sorted) {
    if (now >= parseMealTimeToMinutes(meal.time)) currentId = meal.id
  }

  return currentId
}
