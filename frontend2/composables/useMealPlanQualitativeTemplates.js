import { authFetchInit } from '~/composables/useAuthSession.js'
import { mergeQualitativeTemplates } from '~/utils/meal-plan-qualitative-templates.js'

export function useMealPlanQualitativeTemplates() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  async function listSavedTemplates() {
    const res = await $fetch(`${apiBase}/meal-plan/qualitative-templates`, authFetchInit())
    return Array.isArray(res?.items) ? res.items : []
  }

  async function listAllTemplates() {
    const saved = await listSavedTemplates()
    return mergeQualitativeTemplates(saved)
  }

  async function saveTemplate(template) {
    const res = await $fetch(`${apiBase}/meal-plan/qualitative-templates`, authFetchInit({
      method: 'POST',
      body: template,
    }))
    return res?.item || null
  }

  async function deleteTemplate(id) {
    if (!id) return
    await $fetch(`${apiBase}/meal-plan/qualitative-templates/${id}`, authFetchInit({ method: 'DELETE' }))
  }

  return {
    listSavedTemplates,
    listAllTemplates,
    saveTemplate,
    deleteTemplate,
  }
}
