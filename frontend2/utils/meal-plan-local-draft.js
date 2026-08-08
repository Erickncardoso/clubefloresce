import { hydratePrescriptionFromRecord } from '~/utils/meal-plan-prescription.js'

const STORAGE_PREFIX = 'cf-meal-plan-draft'

export function mealPlanDraftStorageKey(patientId, planId) {
  const pid = String(patientId || '').trim()
  if (!pid) return ''
  const lid = planId ? String(planId) : 'new'
  return `${STORAGE_PREFIX}:${pid}:${lid}`
}

export function serializeMealPlanForm(form) {
  return JSON.parse(JSON.stringify(form || {}))
}

export function loadMealPlanLocalDraft(patientId, planId) {
  if (!import.meta.client) return null
  const key = mealPlanDraftStorageKey(patientId, planId)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.form || typeof parsed.form !== 'object') return null
    return {
      form: parsed.form,
      savedAt: parsed.savedAt || null,
      serverUpdatedAt: parsed.serverUpdatedAt || null,
      planId: parsed.planId || planId || 'new',
    }
  } catch {
    return null
  }
}

export function saveMealPlanLocalDraft(patientId, planId, form, meta = {}) {
  if (!import.meta.client) return null
  const key = mealPlanDraftStorageKey(patientId, planId)
  if (!key) return null
  const payload = {
    form: serializeMealPlanForm(form),
    savedAt: new Date().toISOString(),
    serverUpdatedAt: meta.serverUpdatedAt || null,
    planId: planId || 'new',
  }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    return payload.savedAt
  } catch {
    return null
  }
}

export function clearMealPlanLocalDraft(patientId, planId) {
  if (!import.meta.client) return
  const key = mealPlanDraftStorageKey(patientId, planId)
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearMealPlanLocalDraftsForPlan(patientId, planId) {
  clearMealPlanLocalDraft(patientId, planId)
  if (!planId || planId === 'new') {
    clearMealPlanLocalDraft(patientId, 'new')
  }
}

export function mealPlanDraftFormsEqual(a, b) {
  try {
    return JSON.stringify(serializeMealPlanForm(a)) === JSON.stringify(serializeMealPlanForm(b))
  } catch {
    return false
  }
}

export function formatMealPlanDraftSavedAt(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function hasRecoverableMealPlanDraft(patientId, planId, prescription) {
  const draft = loadMealPlanLocalDraft(patientId, planId)
  if (!draft?.form) return null
  const serverForm = hydratePrescriptionFromRecord(prescription)
  if (mealPlanDraftFormsEqual(draft.form, serverForm)) return null
  return draft
}
