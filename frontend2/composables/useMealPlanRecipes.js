import { authFetchInit } from '~/composables/useAuthSession.js'

export function useMealPlanRecipes() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  async function listRecipes() {
    const res = await $fetch(`${apiBase}/meal-plan/recipes`, authFetchInit())
    return Array.isArray(res?.items) ? res.items : []
  }

  async function listMyRecipes() {
    const res = await $fetch(`${apiBase}/meal-plan/recipes/me`, authFetchInit())
    return Array.isArray(res?.items) ? res.items : []
  }

  async function saveRecipe(recipe) {
    const res = await $fetch(`${apiBase}/meal-plan/recipes`, authFetchInit({
      method: 'POST',
      body: recipe,
    }))
    return res?.item || null
  }

  async function deleteRecipe(id) {
    if (!id) return
    await $fetch(`${apiBase}/meal-plan/recipes/${id}`, authFetchInit({ method: 'DELETE' }))
  }

  async function importRecipe(file) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $fetch(`${apiBase}/meal-plan/recipes/import`, authFetchInit({
      method: 'POST',
      body: formData,
    }))
    return res
  }

  return {
    listRecipes,
    listMyRecipes,
    saveRecipe,
    deleteRecipe,
    importRecipe,
  }
}
