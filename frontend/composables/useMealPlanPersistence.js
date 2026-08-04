import { computed, ref, unref } from 'vue'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import { buildParsedMealPlanFromPrescription } from '~/utils/meal-plan-prescription.js'
import { clearMealPlanLocalDraftsForPlan } from '~/utils/meal-plan-local-draft.js'

export const MAX_MEAL_PLANS = 10

/**
 * Persistência de prescrições alimentares (rascunho e publicação).
 *
 * Vive fora do editor porque a lista e a página de edição gravam na mesma
 * coleção `patientProfile.mealPlans`; antes essa lógica só existia dentro do
 * workspace, o que prendia a edição ao modal.
 */
export function useMealPlanPersistence(userRef, options = {}) {
  const apiBase = useApiBase()
  const { verifiedUser } = useAuthSession()

  const saving = ref(false)
  const publishing = ref(false)
  const saveMessage = ref('')
  const saveError = ref(false)

  const user = computed(() => unref(userRef))

  function currentPlans() {
    const fromUser = user.value?.patientProfileData?.mealPlans
    const fromProfile = user.value?.patientProfile?.mealPlans
    if (Array.isArray(fromUser)) return [...fromUser]
    if (Array.isArray(fromProfile)) return [...fromProfile]
    return []
  }

  function upsertPlanList(nextItem, removeId = '') {
    const current = currentPlans()
    if (removeId) return current.filter((item) => item.id !== removeId)
    const idx = current.findIndex((item) => item.id === nextItem.id)
    if (idx >= 0) {
      current[idx] = nextItem
      return current
    }
    return [nextItem, ...current].slice(0, MAX_MEAL_PLANS)
  }

  async function patchMealPlans(nextList) {
    const updated = await $fetch(`${apiBase.value}/users/${user.value.id}`, authFetchInit({
      method: 'PATCH',
      body: {
        patientProfile: { mealPlans: nextList },
      },
    }))
    options.onUserUpdated?.(updated)
    return updated
  }

  function buildRecord(formPayload, status, planId = '') {
    const now = new Date().toISOString()
    const existing = currentPlans().find((item) => item.id === planId)
    const id = planId || crypto.randomUUID()
    return {
      id,
      title: formPayload.title?.trim() || existing?.title || 'Plano alimentar',
      methodology: formPayload.methodology || existing?.methodology || 'qualitative',
      status,
      objective: formPayload.objective || null,
      dietType: formPayload.dietType || null,
      startDate: formPayload.startDate || null,
      endDate: formPayload.indefinite ? null : (formPayload.endDate || null),
      indefinite: formPayload.indefinite !== false,
      editorText: formPayload.editorText || '',
      editorHtml: formPayload.editorHtml || '',
      finalNotes: formPayload.finalNotes || '',
      meals: formPayload.meals || [],
      nutritionTotals: formPayload.nutritionTotals || existing?.nutritionTotals || null,
      pdfNutritionTotals: formPayload.pdfNutritionTotals || existing?.pdfNutritionTotals || null,
      hydrationPrescription: formPayload.hydrationPrescription ?? existing?.hydrationPrescription ?? null,
      shoppingList: formPayload.shoppingList ?? existing?.shoppingList ?? null,
      authorName: verifiedUser.value?.name || existing?.authorName || 'Nutricionista',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
  }

  function clearDrafts(planId) {
    if (!user.value?.id) return
    clearMealPlanLocalDraftsForPlan(user.value.id, 'new')
    if (planId) clearMealPlanLocalDraftsForPlan(user.value.id, planId)
  }

  function readError(err, fallback) {
    return err?.data?.error || err?.data?.message || err?.message || fallback
  }

  async function saveDraft(formPayload, planId = '') {
    if (!user.value?.id) {
      saveError.value = true
      saveMessage.value = 'Paciente não carregado.'
      return null
    }
    saving.value = true
    saveError.value = false
    try {
      const item = buildRecord(formPayload, 'draft', planId)
      await patchMealPlans(upsertPlanList(item))
      clearDrafts(item.id)
      saveMessage.value = 'Rascunho salvo.'
      return item
    } catch (err) {
      saveMessage.value = readError(err, 'Erro ao salvar.')
      saveError.value = true
      return null
    } finally {
      saving.value = false
    }
  }

  async function publish(formPayload, planId = '') {
    if (!user.value?.id) {
      saveError.value = true
      saveMessage.value = 'Paciente não carregado.'
      return null
    }
    publishing.value = true
    saving.value = true
    saveError.value = false
    try {
      const item = buildRecord(formPayload, 'active', planId)
      await patchMealPlans(upsertPlanList(item))
      clearDrafts(item.id)

      const parsed = buildParsedMealPlanFromPrescription(item, user.value?.name || null)
      if (!parsed.meals.length) {
        throw new Error(item.methodology === 'qualitative'
          ? 'Escreva o plano qualitativo antes de publicar.'
          : 'Adicione ao menos uma refeição ou linha de alimento antes de publicar.')
      }

      const result = await $fetch(`${apiBase.value}/patients/${user.value.id}/meal-plan/save`, authFetchInit({
        method: 'POST',
        body: { title: item.title, plan: parsed },
      }))

      if (result?.user) options.onUserUpdated?.(result.user)

      saveMessage.value = 'Plano publicado para o paciente.'
      return item
    } catch (err) {
      saveMessage.value = readError(err, 'Erro ao publicar.')
      saveError.value = true
      return null
    } finally {
      publishing.value = false
      saving.value = false
    }
  }

  return {
    saving,
    publishing,
    saveMessage,
    saveError,
    currentPlans,
    upsertPlanList,
    patchMealPlans,
    saveDraft,
    publish,
  }
}
