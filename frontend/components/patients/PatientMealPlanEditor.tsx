'use client'

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react'
import {
  ChefHat,
  ChevronDown,
  Copy,
  Droplets,
  Info,
  MessageSquarePlus,
  Plus,
  Replace,
  ShoppingCart,
  Target,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import {
  FOOD_EQUIVALENT_GROUPS,
  MEAL_PLAN_DIET_TYPES,
  computeLiveNutritionTotals,
  createEmptyMealItem,
  formatMacroGrams,
  formatMacroKcal,
  methodologyLabel,
  resolvedMealMacros,
  statusLabel,
} from '@/lib/meal-plan/prescription'
import type { MealEntry, MealItem, MealPlanFormData, PatientUser } from '@/lib/meal-plan/types'
import type { MacroGoalsSaveResult } from '@/lib/meal-plan/nutrition-goals'
import type { HydrationPrescription } from '@/lib/meal-plan/hydration'
import type { ShoppingList } from '@/lib/meal-plan/shopping-list'
import { MealPlanFoodSearchPicker } from './MealPlanFoodSearchPicker'
import { MealPlanPortionMeasurePicker, type MealPlanPortionMeasurePickerHandle } from './MealPlanPortionMeasurePicker'
import { MealPlanItemSubstitutionsPanel } from './MealPlanItemSubstitutionsPanel'
import { formatPortionLabel, parseMeasureFromUnit } from '@/lib/meal-plan/portion-measures'
import { PatientMealPlanNutritionGoalsModal } from './PatientMealPlanNutritionGoalsModal'
import { PatientMealPlanHydrationModal } from './PatientMealPlanHydrationModal'
import { PatientMealPlanShoppingListModal } from './PatientMealPlanShoppingListModal'
import { PatientMealPlanNutritionSummary } from './PatientMealPlanNutritionSummary'
import { PatientMealPlanNutritionFullModal } from './PatientMealPlanNutritionFullModal'
import { PatientMealPlanHydrationCard } from './PatientMealPlanHydrationCard'
import { PatientMealPlanShoppingListCard } from './PatientMealPlanShoppingListCard'
import type { FoodBankItem } from '@/lib/meal-plan/food-bank'
import {
  applyRecipeToMealItem,
  createEmptyRecipeMealItem,
  isRecipeMealItem,
  recipeDisplayLabel,
  type MealPlanRecipe,
} from '@/lib/meal-plan/recipes'
import { PatientAvatar } from './PatientAvatar'
import { PatientMealPlanDaySelectConfirmModal } from './PatientMealPlanDaySelectConfirmModal'
import { MealPlanRecipeEditorModal } from './MealPlanRecipeEditorModal'
import styles from './PatientMealPlanEditor.module.scss'

export interface PatientMealPlanEditorHandle {
  form: MealPlanFormData
  hasUnsavedChanges: boolean
  confirmLeave: () => boolean
}

interface Props {
  user: PatientUser
  prescription: MealPlanFormData
  saving: boolean
  publishing: boolean
  saveMessage: string
  saveError: boolean
  onSave: (form: MealPlanFormData) => void
  onPublish: (form: MealPlanFormData) => void
  onNewPlan: () => void
}

const WEEK_DAYS = [
  { id: 'all', label: 'Todos os dias' },
  { id: 'mon', label: 'Segunda' },
  { id: 'tue', label: 'Terça' },
  { id: 'wed', label: 'Quarta' },
  { id: 'thu', label: 'Quinta' },
  { id: 'fri', label: 'Sexta' },
  { id: 'sat', label: 'Sábado' },
  { id: 'sun', label: 'Domingo' },
]

const DRAFT_STORAGE_PREFIX = 'cf_mp_draft_'

function storageKey(userId: string, planId: string) {
  return `${DRAFT_STORAGE_PREFIX}${userId}_${planId}`
}

function saveDraftLocally(userId: string, planId: string, form: MealPlanFormData) {
  if (typeof window === 'undefined') return null
  try {
    const payload = { form, savedAt: new Date().toISOString() }
    localStorage.setItem(storageKey(userId, planId), JSON.stringify(payload))
    return payload.savedAt
  } catch {
    return null
  }
}

function loadDraftLocally(userId: string, planId: string): { form: MealPlanFormData; savedAt: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(userId, planId))
    if (!raw) return null
    return JSON.parse(raw) as { form: MealPlanFormData; savedAt: string }
  } catch {
    return null
  }
}

function clearDraftLocally(userId: string, planId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey(userId, planId))
  } catch {
    /* ignore */
  }
}

function formatLocalDraftDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export const PatientMealPlanEditor = forwardRef<PatientMealPlanEditorHandle, Props>(
  function PatientMealPlanEditor(
    { user, prescription, saving, publishing, saveMessage, saveError, onSave, onPublish, onNewPlan },
    ref,
  ) {
    const [form, setForm] = useState<MealPlanFormData>(() => ({ ...prescription }))
    const [expandedMeals, setExpandedMeals] = useState<Set<string>>(() =>
      new Set((prescription.meals ?? []).map((m) => m.id)),
    )
    const [openNotesMeals, setOpenNotesMeals] = useState<Set<string>>(new Set())
    const [expandAll, setExpandAll] = useState(true)
    const [localDraftSavedAt, setLocalDraftSavedAt] = useState('')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const baselineRef = useRef('')
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Day pills state
    const [activeDay, setActiveDay] = useState('all')
    const [pendingDayId, setPendingDayId] = useState('')
    const [daySelectConfirmOpen, setDaySelectConfirmOpen] = useState(false)

    // Modal state
    const [nutritionGoalsOpen, setNutritionGoalsOpen] = useState(false)
    const [nutritionFullOpen, setNutritionFullOpen] = useState(false)
    const [hydrationOpen, setHydrationOpen] = useState(false)
    const [shoppingListOpen, setShoppingListOpen] = useState(false)
    const [subsOpenItemId, setSubsOpenItemId] = useState<string | null>(null)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const portionPickerRef = useRef<MealPlanPortionMeasurePickerHandle>(null)

    // Recipe editor state
    const [recipeEditorOpen, setRecipeEditorOpen] = useState(false)
    const [recipeEditorMealIndex, setRecipeEditorMealIndex] = useState<number | null>(null)
    const [recipeEditorItemIndex, setRecipeEditorItemIndex] = useState<number | null>(null)
    const [recipeEditorInitial, setRecipeEditorInitial] = useState<MealPlanRecipe | null>(null)

    const planKey = prescription.id ?? 'novo'
    const userId = user.id

    // Serialize for baseline / change detection
    const serialize = useCallback((f: MealPlanFormData) => JSON.stringify(f), [])

    // Init from prescription + check local draft
    useEffect(() => {
      const server = prescription
      const local = loadDraftLocally(userId, planKey)
      if (local?.form && serialize(local.form) !== serialize(server)) {
        const when = formatLocalDraftDate(local.savedAt)
        const msg = when
          ? `Encontramos um rascunho local de ${when} com alterações não salvas. Deseja restaurar?`
          : 'Encontramos um rascunho local. Deseja restaurar?'
        if (window.confirm(msg)) {
          setForm({ ...local.form })
          setExpandedMeals(new Set((local.form.meals ?? []).map((m) => m.id)))
          setLocalDraftSavedAt(local.savedAt)
          baselineRef.current = serialize(server)
          setHasUnsavedChanges(serialize(local.form) !== serialize(server))
          return
        }
        clearDraftLocally(userId, planKey)
      } else if (local?.savedAt) {
        setLocalDraftSavedAt(local.savedAt)
      }
      setForm({ ...server })
      setExpandedMeals(new Set((server.meals ?? []).map((m) => m.id)))
      baselineRef.current = serialize(server)
      setHasUnsavedChanges(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planKey, userId])

    // Track unsaved changes + schedule local draft save
    useEffect(() => {
      const current = serialize(form)
      setHasUnsavedChanges(current !== baselineRef.current)
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => {
        const savedAt = saveDraftLocally(userId, planKey, form)
        if (savedAt) setLocalDraftSavedAt(savedAt)
      }, 1200)
      return () => {
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      }
    }, [form, userId, planKey, serialize])

    // Reset baseline after successful save/publish
    useEffect(() => {
      if (saveMessage && !saveError && /salvo|publicado/i.test(saveMessage)) {
        baselineRef.current = serialize(form)
        setHasUnsavedChanges(false)
        clearDraftLocally(userId, planKey)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveMessage, saveError])

    // Expand/collapse all
    useEffect(() => {
      if (expandAll) {
        setExpandedMeals(new Set((form.meals ?? []).map((m) => m.id)))
      } else {
        setExpandedMeals(new Set())
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expandAll])

    // Expose handle for confirmLeave
    useImperativeHandle(ref, () => ({
      form,
      hasUnsavedChanges,
      confirmLeave() {
        if (!hasUnsavedChanges) return true
        return window.confirm(
          'Você tem alterações não salvas neste plano. Deseja sair mesmo assim?\n\n' +
            'Seu progresso continua guardado como rascunho local neste dispositivo.',
        )
      },
    }))

    // ----- Day pill logic (matches Nuxt onDayPillClick/confirmDaySwitch/cancelDaySwitch) -----

    function onDayPillClick(dayId: string) {
      if (dayId === activeDay) return
      if (dayId === 'all') {
        setActiveDay('all')
        return
      }
      if (activeDay === 'all') {
        setPendingDayId(dayId)
        setDaySelectConfirmOpen(true)
        return
      }
      setActiveDay(dayId)
    }

    function confirmDaySwitch() {
      if (pendingDayId) setActiveDay(pendingDayId)
      setPendingDayId('')
      setDaySelectConfirmOpen(false)
    }

    function cancelDaySwitch() {
      setPendingDayId('')
      setDaySelectConfirmOpen(false)
    }

    // ----- Form field helpers -----

    function updateField<K extends keyof MealPlanFormData>(key: K, value: MealPlanFormData[K]) {
      setForm((prev) => ({ ...prev, [key]: value }))
    }

    function updateMeal(index: number, patch: Partial<MealEntry>) {
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        meals[index] = { ...meals[index], ...patch }
        return { ...prev, meals }
      })
    }

    function updateMealItem(mealIndex: number, itemIndex: number, patch: Partial<MealItem>) {
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        const items = [...(meals[mealIndex].items ?? [])]
        items[itemIndex] = { ...items[itemIndex], ...patch }
        meals[mealIndex] = { ...meals[mealIndex], items }
        return { ...prev, meals }
      })
    }

    function addMeal() {
      const meal: MealEntry = {
        id: crypto.randomUUID(),
        time: '15:00',
        label: 'Nova refeição',
        items: [],
        notes: '',
        macros: null,
      }
      setForm((prev) => ({ ...prev, meals: [...(prev.meals ?? []), meal] }))
      setExpandedMeals((prev) => new Set([...prev, meal.id]))
    }

    function duplicateMeal(index: number) {
      const source = form.meals?.[index]
      if (!source) return
      const copy: MealEntry = {
        ...source,
        id: crypto.randomUUID(),
        label: `${source.label} (cópia)`,
        items: (source.items ?? []).map((item) => ({ ...item, id: crypto.randomUUID() })),
      }
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        meals.splice(index + 1, 0, copy)
        return { ...prev, meals }
      })
      setExpandedMeals((prev) => new Set([...prev, copy.id]))
    }

    function removeMeal(index: number) {
      if (!window.confirm('Excluir esta refeição?')) return
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        meals.splice(index, 1)
        return { ...prev, meals }
      })
    }

    function addFood(mealIndex: number) {
      const item = createEmptyMealItem(form.methodology)
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        meals[mealIndex] = { ...meals[mealIndex], items: [...(meals[mealIndex].items ?? []), item] }
        return { ...prev, meals }
      })
      if (form.methodology === 'foods') {
        setEditingItemId(item.id)
      }
    }

    function addFoodFromSearch(mealIndex: number, food: FoodBankItem) {
      const item = createEmptyMealItem(form.methodology)
      const updated: MealItem = {
        ...item,
        name: food.displayName || food.name,
        foodId: food.id,
        per100g: food.per100g,
        grams: 100,
      }
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        meals[mealIndex] = { ...meals[mealIndex], items: [...(meals[mealIndex].items ?? []), updated] }
        return { ...prev, meals }
      })
    }

    function addRecipe(mealIndex: number) {
      setRecipeEditorMealIndex(mealIndex)
      setRecipeEditorItemIndex(null)
      setRecipeEditorInitial(null)
      setRecipeEditorOpen(true)
    }

    function openRecipeEditorForItem(mealIndex: number, itemIndex: number) {
      const item = form.meals?.[mealIndex]?.items?.[itemIndex]
      if (!item) return
      setRecipeEditorMealIndex(mealIndex)
      setRecipeEditorItemIndex(itemIndex)
      // Reconstruct a recipe-like object from the snapshot for editing
      const snap = item.recipeSnapshot
      setRecipeEditorInitial(snap ? (snap as unknown as MealPlanRecipe) : null)
      setRecipeEditorOpen(true)
    }

    function handleRecipeSaved(recipe: MealPlanRecipe) {
      const mealIndex = recipeEditorMealIndex
      if (mealIndex == null) return

      if (recipeEditorItemIndex == null) {
        // New recipe — append a new item
        const newItem = createEmptyRecipeMealItem(recipe)
        setForm((prev) => {
          const meals = [...(prev.meals ?? [])]
          meals[mealIndex] = {
            ...meals[mealIndex],
            items: [...(meals[mealIndex].items ?? []), newItem],
          }
          return { ...prev, meals }
        })
      } else {
        // Existing recipe item — update it
        const itemIndex = recipeEditorItemIndex
        setForm((prev) => {
          const meals = [...(prev.meals ?? [])]
          const items = [...(meals[mealIndex].items ?? [])]
          items[itemIndex] = applyRecipeToMealItem(items[itemIndex], recipe)
          meals[mealIndex] = { ...meals[mealIndex], items }
          return { ...prev, meals }
        })
      }
      setRecipeEditorOpen(false)
    }

    function handleNutritionGoalsSave(result: MacroGoalsSaveResult) {
      updateField('nutritionTotals', { ...result } as MealPlanFormData['nutritionTotals'])
    }

    function handleHydrationSave(p: HydrationPrescription) {
      updateField('hydrationPrescription', p as unknown)
    }

    function handleShoppingListSave(sl: ShoppingList) {
      updateField('shoppingList', sl as unknown)
    }

    function removeFood(mealIndex: number, itemIndex: number) {
      setForm((prev) => {
        const meals = [...(prev.meals ?? [])]
        const items = [...(meals[mealIndex].items ?? [])]
        items.splice(itemIndex, 1)
        meals[mealIndex] = { ...meals[mealIndex], items }
        return { ...prev, meals }
      })
    }

    function startEditItem(itemId: string) {
      setEditingItemId(itemId)
    }

    function commitAndAddNext(mealIndex: number, itemIndex: number) {
      const meal = form.meals?.[mealIndex]
      if (!meal) return
      const items = meal.items ?? []
      // If there's already a next item, edit it; otherwise add a new one
      if (itemIndex + 1 < items.length) {
        setEditingItemId(items[itemIndex + 1].id)
      } else {
        // Add new empty item and start editing it
        const newItem = createEmptyMealItem(form.methodology)
        setForm((prev) => {
          const meals = [...(prev.meals ?? [])]
          meals[mealIndex] = { ...meals[mealIndex], items: [...(meals[mealIndex].items ?? []), newItem] }
          return { ...prev, meals }
        })
        setEditingItemId(newItem.id)
      }
    }

    function cancelEditItem() {
      setEditingItemId(null)
    }

    function sortByTime() {
      setForm((prev) => ({
        ...prev,
        meals: [...(prev.meals ?? [])].sort((a, b) => String(a.time).localeCompare(String(b.time))),
      }))
    }

    function toggleMeal(id: string) {
      setExpandedMeals((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function openMealNotes(mealId: string) {
      setOpenNotesMeals((prev) => new Set([...prev, mealId]))
    }

    function isNotesOpen(meal: MealEntry): boolean {
      return openNotesMeals.has(meal.id) || Boolean(String(meal.notes ?? '').trim())
    }

    function prepareFormForSave(): MealPlanFormData {
      const prepared = { ...form }
      prepared.meals = (form.meals ?? []).map((meal) => {
        const items = (meal.items ?? []).filter((item) => String(item.name ?? '').trim())
        const macros = resolvedMealMacros({ ...meal, items })
        return { ...meal, items, macros, pdfMacros: meal.pdfMacros ?? (macros.caloriesKcal ? macros : null) }
      })
      if (form.methodology === 'foods' || form.methodology === 'equivalents') {
        const totals = computeLiveNutritionTotals(prepared)
        prepared.nutritionTotals = totals
        if (!prepared.pdfNutritionTotals && form.nutritionTotals?.caloriesKcal) {
          prepared.pdfNutritionTotals = { ...form.nutritionTotals }
        }
      }
      return prepared
    }

    function handleSave() {
      const prepared = prepareFormForSave()
      baselineRef.current = serialize(prepared)
      setHasUnsavedChanges(false)
      clearDraftLocally(userId, planKey)
      setForm(prepared)
      onSave(prepared)
    }

    function handlePublish() {
      const prepared = prepareFormForSave()
      baselineRef.current = serialize(prepared)
      setHasUnsavedChanges(false)
      clearDraftLocally(userId, planKey)
      setForm(prepared)
      onPublish(prepared)
    }

    const liveTotals = computeLiveNutritionTotals(form)
    const hasLiveMacros = liveTotals.caloriesKcal > 0
    const totalPct = hasLiveMacros
      ? {
          ptn: Math.round(((liveTotals.proteinG * 4) / liveTotals.caloriesKcal) * 100),
          cho: Math.round(((liveTotals.carbsG * 4) / liveTotals.caloriesKcal) * 100),
          fat: Math.round(((liveTotals.fatG * 9) / liveTotals.caloriesKcal) * 100),
        }
      : null

    const localDraftLabel = localDraftSavedAt
      ? `Rascunho local · ${formatLocalDraftDate(localDraftSavedAt)}`
      : ''

    return (
      <div className={styles.editor}>
        {/* Header */}
        <header className={styles.head}>
          <div className={styles.headCopy}>
            <div className={styles.patient}>
              <PatientAvatar src={user.avatar} name={user.name} size="sm" ring={false} />
              <div>
                <strong className={styles.patientName}>
                  {form.title?.trim() || 'Nova prescrição'}
                </strong>
                <p className={styles.patientMeta}>
                  {methodologyLabel(form.methodology)}
                  {form.status ? ` · ${statusLabel(form.status)}` : ''}
                </p>
              </div>
            </div>
          </div>
          <div className={styles.headActions}>
            <button type="button" className={`btn-secondary ${styles.headBtn}`} onClick={onNewPlan}>
              <Plus size={14} aria-hidden="true" />
              Nova prescrição
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          {/* Main content */}
          <section className={styles.main}>
            {/* Config row */}
            <div className={styles.config}>
              {/* Title */}
              <div className="field field--float">
                <label htmlFor="mped-title">Título do plano</label>
                <input
                  id="mped-title"
                  type="text"
                  value={form.title ?? ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  maxLength={200}
                  placeholder="Ex.: Plano de emagrecimento"
                />
              </div>

              {/* Diet type */}
              <div className="field field--float">
                <label htmlFor="mped-diet">Tipo de dieta</label>
                <select
                  id="mped-diet"
                  value={form.dietType ?? ''}
                  onChange={(e) => updateField('dietType', e.target.value || null)}
                >
                  <option value="">Selecione</option>
                  {MEAL_PLAN_DIET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Objective */}
              <div className="field field--float">
                <label htmlFor="mped-objective">Objetivo</label>
                <input
                  id="mped-objective"
                  type="text"
                  value={form.objective ?? ''}
                  onChange={(e) => updateField('objective', e.target.value)}
                  maxLength={200}
                  placeholder="Ex.: Emagrecimento"
                />
              </div>

              {/* Start date */}
              <div className="field field--float">
                <label htmlFor="mped-start">Início</label>
                <input
                  id="mped-start"
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>

              {/* End date */}
              <div className={styles.configEnd}>
                <div className={`field field--float ${form.indefinite ? styles.fieldDisabled : ''}`}>
                  <label htmlFor="mped-end">Término</label>
                  <input
                    id="mped-end"
                    type="date"
                    value={form.endDate ?? ''}
                    disabled={Boolean(form.indefinite)}
                    onChange={(e) => updateField('endDate', e.target.value)}
                  />
                </div>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.indefinite)}
                    onChange={(e) => updateField('indefinite', e.target.checked)}
                  />
                  <span>Sem data de término</span>
                </label>
              </div>
            </div>

            {/* Qualitative editor */}
            {form.methodology === 'qualitative' ? (
              <div className={styles.qualitative}>
                <div className={styles.qualLegend}>
                  <span><strong>!</strong> Suplementos</span>
                  <span><strong>@</strong> Grupo de alimentos</span>
                  <span><strong>$</strong> Receitas</span>
                  <span><strong>#</strong> Observação</span>
                  <small>Ctrl + Enter para salvar rascunho</small>
                </div>
                <div className="field field--float">
                  <label htmlFor="mped-qual-text">Prescrição qualitativa</label>
                  <textarea
                    id="mped-qual-text"
                    className={styles.qualTextarea}
                    value={form.editorText ?? ''}
                    onChange={(e) => {
                      updateField('editorText', e.target.value)
                      updateField('editorHtml', e.target.value)
                    }}
                    placeholder={
                      '08:30 - Café da Manhã\nBanana - 1 un\nAveia - 5 col. (sopa)\n\n12:30 - Almoço\nArroz integral - 4 col. (sopa)\nFeijão - 1 concha\nFrango grelhado - 120 g'
                    }
                    rows={18}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault()
                        handleSave()
                      }
                    }}
                  />
                </div>
                <div className="field field--float">
                  <label htmlFor="mped-notes">Anotações finais</label>
                  <textarea
                    id="mped-notes"
                    value={form.finalNotes ?? ''}
                    onChange={(e) => updateField('finalNotes', e.target.value)}
                    rows={3}
                    maxLength={8000}
                    placeholder="Orientações gerais para o paciente"
                  />
                </div>
              </div>
            ) : (
              /* Foods / Equivalents editor */
              <div className={styles.meals}>
                <div className={styles.toolbar}>
                  <div className={styles.toolbarDays}>
                    <span className={styles.toolbarLabel}>Dias</span>
                    <div className={styles.dayPills}>
                      {WEEK_DAYS.map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          className={`${styles.dayPill}${activeDay === day.id ? ` ${styles.dayPillActive}` : ''}`}
                          onClick={() => onDayPillClick(day.id)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.mealsTools}>
                    <button
                      type="button"
                      className={`btn-secondary ${styles.btnSm}`}
                      onClick={() => setExpandAll((v) => !v)}
                    >
                      {expandAll ? 'Recolher tudo' : 'Expandir tudo'}
                    </button>
                    <button type="button" className={`btn-secondary ${styles.btnSm}`} onClick={sortByTime}>
                      Reordenar por horário
                    </button>
                    <button
                      type="button"
                      className={`btn-secondary ${styles.btnSm}`}
                      title="Metas nutricionais"
                      onClick={() => setNutritionGoalsOpen(true)}
                    >
                      <Target size={13} aria-hidden="true" />
                      Metas
                    </button>
                    <button
                      type="button"
                      className={`btn-secondary ${styles.btnSm}`}
                      title="Hidratação"
                      onClick={() => setHydrationOpen(true)}
                    >
                      <Droplets size={13} aria-hidden="true" />
                      Hidratação
                    </button>
                    <button
                      type="button"
                      className={`btn-secondary ${styles.btnSm}`}
                      title="Lista de compras"
                      onClick={() => setShoppingListOpen(true)}
                    >
                      <ShoppingCart size={13} aria-hidden="true" />
                      Lista de compras
                    </button>
                  </div>
                </div>

                {form.methodology === 'equivalents' && (
                  <p className={styles.mealsHint}>
                    <Info size={14} className={styles.mealsHintIcon} aria-hidden="true" />
                    <span>Prescreva porções de grupos alimentares e liste as opções de substituição para o paciente escolher.</span>
                  </p>
                )}

                {/* Macro bar (mobile) */}
                {form.methodology === 'foods' && hasLiveMacros && (
                  <div className={styles.liveBar}>
                    <span className={`${styles.liveMacro} ${styles.liveMacroPtn}`}>PTN {formatMacroGrams(liveTotals.proteinG)}</span>
                    <span className={`${styles.liveMacro} ${styles.liveMacroCho}`}>CHO {formatMacroGrams(liveTotals.carbsG)}</span>
                    <span className={`${styles.liveMacro} ${styles.liveMacroFat}`}>LIP {formatMacroGrams(liveTotals.fatG)}</span>
                    <span className={`${styles.liveMacro} ${styles.liveMacroKcal}`}>{formatMacroKcal(liveTotals.caloriesKcal)}</span>
                  </div>
                )}

                <div className={styles.mealList}>
                  {(form.meals ?? []).map((meal, mealIndex) => {
                    const mealMacros = resolvedMealMacros(meal)
                    const mealHasMacros = (mealMacros.caloriesKcal || 0) > 0
                    const expanded = expandedMeals.has(meal.id)

                    return (
                      <article key={meal.id} className={styles.meal}>
                        <header className={styles.mealHeader}>
                          <button
                            type="button"
                            className={styles.mealChevron}
                            aria-expanded={expanded}
                            onClick={() => toggleMeal(meal.id)}
                          >
                            <ChevronDown size={16} className={expanded ? styles.chevronOpen : ''} />
                          </button>
                          <div className={styles.mealTitle}>
                            <input
                              type="time"
                              value={meal.time ?? '08:00'}
                              className={styles.mealTime}
                              onChange={(e) => updateMeal(mealIndex, { time: e.target.value })}
                            />
                            <span className={styles.mealSep}>·</span>
                            <input
                              type="text"
                              value={meal.label ?? ''}
                              className={styles.mealName}
                              placeholder="Nome da refeição"
                              maxLength={120}
                              onChange={(e) => updateMeal(mealIndex, { label: e.target.value })}
                            />
                          </div>
                          {form.methodology === 'foods' && mealHasMacros && (
                            <div className={styles.mealChips}>
                              <span className={`${styles.chip} ${styles.chipP}`}>PTN {formatMacroGrams(mealMacros.proteinG)}</span>
                              <span className={`${styles.chip} ${styles.chipC}`}>CHO {formatMacroGrams(mealMacros.carbsG)}</span>
                              <span className={`${styles.chip} ${styles.chipF}`}>LIP {formatMacroGrams(mealMacros.fatG)}</span>
                              <span className={`${styles.chip} ${styles.chipKcal}`}>{formatMacroKcal(mealMacros.caloriesKcal)}</span>
                            </div>
                          )}
                          <div className={styles.mealActions}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              title="Duplicar refeição"
                              onClick={() => duplicateMeal(mealIndex)}
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              title="Excluir refeição"
                              onClick={() => removeMeal(mealIndex)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </header>

                        {expanded && (
                          <div className={styles.mealBody}>
                            {form.methodology === 'equivalents' ? (
                              /* Equivalents grid */
                              <div className={styles.equivList}>
                                {(meal.items ?? []).map((item, itemIndex) => (
                                  <div key={item.id} className={styles.equivRow}>
                                    <select
                                      className={styles.equivGroup}
                                      value={item.groupId ?? ''}
                                      aria-label="Grupo alimentar"
                                      onChange={(e) => {
                                        const group = FOOD_EQUIVALENT_GROUPS.find((g) => g.id === e.target.value)
                                        updateMealItem(mealIndex, itemIndex, {
                                          groupId: group?.id ?? e.target.value,
                                          name: group?.label ?? e.target.value,
                                          options: item.options?.trim() || group?.examples || '',
                                        })
                                      }}
                                    >
                                      {FOOD_EQUIVALENT_GROUPS.map((g) => (
                                        <option key={g.id} value={g.id}>{g.label}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      className={styles.equivAmount}
                                      value={item.amount ?? '1'}
                                      placeholder="Qtd"
                                      onChange={(e) => updateMealItem(mealIndex, itemIndex, { amount: e.target.value })}
                                    />
                                    <span className={styles.equivUnit}>{item.unit || 'porção'}</span>
                                    <input
                                      type="text"
                                      className={styles.equivOptions}
                                      value={item.options ?? ''}
                                      placeholder="Opções (ex.: arroz, batata doce)"
                                      onChange={(e) => updateMealItem(mealIndex, itemIndex, { options: e.target.value })}
                                    />
                                    <button
                                      type="button"
                                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                      onClick={() => removeFood(mealIndex, itemIndex)}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              /* Foods grid */
                              <div className={styles.foodGrid}>
                                <div className={styles.foodGridHead}>
                                  <span>Alimento</span>
                                  <span>Medida</span>
                                  <span className={styles.macroCel}>CHO</span>
                                  <span className={styles.macroCel}>PTN</span>
                                  <span className={styles.macroCel}>LIP</span>
                                  <span className={styles.kcalCel}>Energia</span>
                                  <span aria-hidden="true" />
                                </div>
                                {(meal.items ?? []).map((item, itemIndex) => {
                                  const isRecipe = isRecipeMealItem(item)
                                  let cho = '—'; let ptn = '—'; let fat = '—'; let kcal = '—'

                                  if (isRecipe) {
                                    const m = item.recipeSnapshot?.macros
                                    const servings = Math.max(0.1, Number(item.portionAmount ?? item.amount) || 1)
                                    if (m?.caloriesKcal) {
                                      cho = `${((m.carbsG || 0) * servings).toFixed(1)}g`
                                      ptn = `${((m.proteinG || 0) * servings).toFixed(1)}g`
                                      fat = `${((m.fatG || 0) * servings).toFixed(1)}g`
                                      kcal = `${Math.round((m.caloriesKcal || 0) * servings)} kcal`
                                    }
                                  } else {
                                    const grams = item.grams ?? 100
                                    if (item.per100g?.caloriesKcal != null) {
                                      const r = grams / 100
                                      cho = `${((item.per100g.carbsG ?? 0) * r).toFixed(1)}g`
                                      ptn = `${((item.per100g.proteinG ?? 0) * r).toFixed(1)}g`
                                      fat = `${((item.per100g.fatG ?? 0) * r).toFixed(1)}g`
                                      kcal = `${Math.round((item.per100g.caloriesKcal ?? 0) * r)} kcal`
                                    }
                                  }

                                  const isSubsOpen = subsOpenItemId === item.id
                                  const isEditing = editingItemId === item.id && !isRecipe
                                  const hasTbca = Boolean(item.foodId)
                                  const portionMeasure = item.portionMeasure || parseMeasureFromUnit(item.unit ?? '')
                                  const portionAmount = Number(item.portionAmount ?? item.amount ?? 1) || 1
                                  const portionDisplay = isRecipe
                                    ? recipeDisplayLabel(item)
                                    : item.grams != null
                                      ? formatPortionLabel(portionAmount, portionMeasure)
                                      : (item.amount ? `${item.amount} ${item.unit ?? ''}`.trim() : '—')

                                  return (
                                    <div key={item.id} className={styles.foodRowWrap}>
                                      {isEditing ? (
                                        /* ── Edit mode ──────────────────────────────── */
                                        <div className={`${styles.foodRow} ${styles.foodRowEditing}`}>
                                          <div className={styles.foodEditCell}>
                                            <MealPlanFoodSearchPicker
                                              value={item.name ?? ''}
                                              placeholder="Alimento (ou $ para receita)"
                                              autofocus
                                              onChange={(v) => updateMealItem(mealIndex, itemIndex, { name: v })}
                                              onSelect={(food) => {
                                                updateMealItem(mealIndex, itemIndex, {
                                                  name: food.displayName || food.name,
                                                  foodId: food.id,
                                                  per100g: food.per100g,
                                                  grams: 100,
                                                  portionMeasure: 'grams',
                                                  portionAmount: 100,
                                                })
                                                setTimeout(() => portionPickerRef.current?.focus(), 80)
                                              }}
                                              onRecipeTrigger={() => {
                                                cancelEditItem()
                                                addRecipe(mealIndex)
                                              }}
                                            />
                                            {hasTbca ? (
                                              <span className={styles.tbcaBadge}>
                                                {item.linkedFoodName || item.name}
                                              </span>
                                            ) : item.name?.trim() ? (
                                              <span className={`${styles.tbcaBadge} ${styles.tbcaBadgeWarn}`}>
                                                Sem vínculo TBCA
                                              </span>
                                            ) : null}
                                          </div>
                                          <MealPlanPortionMeasurePicker
                                            ref={portionPickerRef}
                                            foodName={item.name ?? ''}
                                            per100g={item.per100g}
                                            amount={portionAmount}
                                            measureId={portionMeasure}
                                            onAmountChange={(v) => updateMealItem(mealIndex, itemIndex, { portionAmount: v })}
                                            onMeasureChange={(m) => updateMealItem(mealIndex, itemIndex, { portionMeasure: m })}
                                            onChange={({ grams: g }) => updateMealItem(mealIndex, itemIndex, { grams: g })}
                                            onSubmit={() => commitAndAddNext(mealIndex, itemIndex)}
                                            onCancel={cancelEditItem}
                                          />
                                          <span className={`${styles.macroCel} ${styles.macroCho}`}>{cho}</span>
                                          <span className={`${styles.macroCel} ${styles.macroPtn}`}>{ptn}</span>
                                          <span className={`${styles.macroCel} ${styles.macroFat}`}>{fat}</span>
                                          <span className={styles.kcalCel}>{kcal}</span>
                                          <div className={styles.foodRowActions}>
                                            <button
                                              type="button"
                                              className={`${styles.iconBtn} ${isSubsOpen ? styles.iconBtnActive : ''}`}
                                              title="Substituições"
                                              onClick={() => setSubsOpenItemId(isSubsOpen ? null : item.id)}
                                            >
                                              <Replace size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                              title="Excluir alimento"
                                              onClick={() => { cancelEditItem(); removeFood(mealIndex, itemIndex) }}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                          <div className={styles.editHint}>
                                            <span>Enter confirma · Esc cancela</span>
                                          </div>
                                        </div>
                                      ) : isRecipe ? (
                                        /* ── Recipe row ─────────────────────────────── */
                                        <div
                                          className={`${styles.foodRow} ${styles.foodRowDisplay} ${styles.recipeRow}`}
                                          onClick={() => openRecipeEditorForItem(mealIndex, itemIndex)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ')
                                              openRecipeEditorForItem(mealIndex, itemIndex)
                                          }}
                                          title="Clique para editar a receita"
                                        >
                                          <div className={styles.foodDisplayCell}>
                                            <span className={`${styles.foodDisplayName} ${styles.recipeItemName}`}>
                                              <ChefHat size={14} className={styles.chefIcon} aria-hidden="true" />
                                              {item.name || 'Nova receita'}
                                            </span>
                                            <span className={`${styles.tbcaBadge} ${styles.recipeBadge}`}>
                                              Receita
                                            </span>
                                          </div>
                                          <span className={styles.foodDisplayPortion}>{portionDisplay}</span>
                                          <span className={`${styles.macroCel} ${styles.macroCho}`}>{cho}</span>
                                          <span className={`${styles.macroCel} ${styles.macroPtn}`}>{ptn}</span>
                                          <span className={`${styles.macroCel} ${styles.macroFat}`}>{fat}</span>
                                          <span className={styles.kcalCel}>{kcal}</span>
                                          <div className={styles.foodRowActions}>
                                            <button
                                              type="button"
                                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                              title="Remover receita"
                                              onClick={(e) => { e.stopPropagation(); removeFood(mealIndex, itemIndex) }}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        /* ── Display mode ───────────────────────────── */
                                        <div
                                          className={`${styles.foodRow} ${styles.foodRowDisplay}`}
                                          onClick={() => startEditItem(item.id)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditItem(item.id) }}
                                        >
                                          <div className={styles.foodDisplayCell}>
                                            <span className={styles.foodDisplayName}>
                                              {item.name || <em className={styles.emptyHint}>Clique para adicionar</em>}
                                            </span>
                                            {!hasTbca && item.name?.trim() && (
                                              <span className={`${styles.tbcaBadge} ${styles.tbcaBadgeWarn}`}>
                                                Sem vínculo TBCA
                                              </span>
                                            )}
                                          </div>
                                          <span className={styles.foodDisplayPortion}>{portionDisplay}</span>
                                          <span className={`${styles.macroCel} ${styles.macroCho}`}>{cho}</span>
                                          <span className={`${styles.macroCel} ${styles.macroPtn}`}>{ptn}</span>
                                          <span className={`${styles.macroCel} ${styles.macroFat}`}>{fat}</span>
                                          <span className={styles.kcalCel}>{kcal}</span>
                                          <div className={styles.foodRowActions}>
                                            <button
                                              type="button"
                                              className={`${styles.iconBtn} ${isSubsOpen ? styles.iconBtnActive : ''}`}
                                              title="Substituições"
                                              onClick={(e) => { e.stopPropagation(); setSubsOpenItemId(isSubsOpen ? null : item.id) }}
                                            >
                                              <Replace size={13} />
                                            </button>
                                            <button
                                              type="button"
                                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                              title="Excluir alimento"
                                              onClick={(e) => { e.stopPropagation(); removeFood(mealIndex, itemIndex) }}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {isSubsOpen && (
                                        <div className={styles.subsPanel}>
                                          <MealPlanItemSubstitutionsPanel
                                            item={item}
                                            onChange={(patch) => updateMealItem(mealIndex, itemIndex, patch)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            <div className={styles.mealBodyActions}>
                              {(meal.items ?? []).length === 0 && (
                                <p className={styles.mealEmpty}>
                                  <UtensilsCrossed size={14} aria-hidden="true" />
                                  <span>
                                    {form.methodology === 'equivalents'
                                      ? 'Nenhum equivalente nesta refeição ainda.'
                                      : 'Nenhum alimento nesta refeição ainda.'}
                                  </span>
                                </p>
                              )}
                              <div className={styles.mealAdd}>
                                <button
                                  type="button"
                                  className={styles.addFoodBtn}
                                  onClick={() => addFood(mealIndex)}
                                >
                                  <Plus size={14} aria-hidden="true" />
                                  {form.methodology === 'equivalents' ? 'Adicionar equivalente' : 'Adicionar alimento'}
                                </button>
                                {form.methodology === 'foods' && (
                                  <button
                                    type="button"
                                    className={styles.addRecipeBtn}
                                    onClick={() => addRecipe(mealIndex)}
                                  >
                                    <ChefHat size={14} aria-hidden="true" />
                                    Inserir receita
                                  </button>
                                )}
                              </div>

                              {!isNotesOpen(meal) ? (
                                <button
                                  type="button"
                                  className={styles.notesToggle}
                                  onClick={() => openMealNotes(meal.id)}
                                >
                                  <MessageSquarePlus size={14} aria-hidden="true" />
                                  Adicionar observações da refeição
                                </button>
                              ) : (
                                <div className={`field field--float ${styles.mealNotes}`}>
                                  <label htmlFor={`mped-meal-notes-${meal.id}`}>Observações da refeição</label>
                                  <textarea
                                    id={`mped-meal-notes-${meal.id}`}
                                    value={meal.notes ?? ''}
                                    rows={2}
                                    placeholder="Orientações específicas desta refeição"
                                    onChange={(e) => updateMeal(mealIndex, { notes: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>

                <button type="button" className={styles.newMealBtn} onClick={addMeal}>
                  <Plus size={16} aria-hidden="true" />
                  Adicionar refeição
                </button>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Nutrition summary card (donut + macro rows) */}
            {(hasLiveMacros || (form.nutritionTotals?.caloriesKcal ?? 0) > 0) && (
              <PatientMealPlanNutritionSummary
                liveTotals={liveTotals}
                nutritionGoals={form.nutritionTotals}
                onOpenFull={() => setNutritionFullOpen(true)}
                onOpenGoals={() => setNutritionGoalsOpen(true)}
              />
            )}

            {/* Hydration card */}
            <PatientMealPlanHydrationCard
              prescription={form.hydrationPrescription as Partial<import('@/lib/meal-plan/hydration').HydrationPrescription> | null}
              onEdit={() => setHydrationOpen(true)}
            />

            {/* Shopping list card */}
            <PatientMealPlanShoppingListCard
              shoppingList={form.shoppingList as Partial<import('@/lib/meal-plan/shopping-list').ShoppingList> | null}
              meals={form.meals ?? []}
              methodology={form.methodology}
              onEdit={() => setShoppingListOpen(true)}
            />

            {/* Restrictions card */}
            {(() => {
              const anamneses = (user.patientProfileData?.anamneses ?? user.patientProfile?.anamneses) as Array<{ foodRestrictions?: string; formData?: { foodRestrictions?: string }; updatedAt?: string }> | undefined
              const sorted = [...(anamneses ?? [])].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
              const restrictions = String(sorted[0]?.foodRestrictions ?? sorted[0]?.formData?.foodRestrictions ?? '').trim()
              if (!restrictions) return null
              return (
                <div className={styles.restrictionsCard}>
                  <p className={styles.restrictionsTitle}>Restrições alimentares</p>
                  <p className={styles.restrictionsText}>{restrictions}</p>
                </div>
              )
            })()}

            {/* Footer actions */}
            <div className={styles.sidebarFooter}>
              {localDraftLabel && <p className={styles.localDraftLabel}>{localDraftLabel}</p>}
              {saveMessage && (
                <p className={`${styles.saveMsg} ${saveError ? styles.saveMsgError : ''}`}>
                  {saveMessage}
                </p>
              )}
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={`btn-secondary ${styles.sidebarBtn}`}
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? 'Salvando…' : 'Salvar rascunho'}
                </button>
                <button
                  type="button"
                  className={`btn-primary ${styles.sidebarBtn}`}
                  disabled={saving || publishing}
                  onClick={handlePublish}
                >
                  {publishing ? 'Publicando…' : 'Salvar e publicar'}
                </button>
              </div>
            </div>
          </aside>
        </div>


      {/* Day confirm modal */}
      <PatientMealPlanDaySelectConfirmModal
        open={daySelectConfirmOpen}
        onConfirm={confirmDaySwitch}
        onCancel={cancelDaySwitch}
      />

      {/* Nutrition full modal */}
      <PatientMealPlanNutritionFullModal
        open={nutritionFullOpen}
        form={form}
        onClose={() => setNutritionFullOpen(false)}
      />

      {/* Modals */}
      <PatientMealPlanNutritionGoalsModal
        open={nutritionGoalsOpen}
        goals={form.nutritionTotals}
        liveTotals={computeLiveNutritionTotals(form)}
        patientWeightKg={(user.patientProfileData?.weightKg ?? user.patientProfile?.weightKg) as number | null | undefined}
        onClose={() => setNutritionGoalsOpen(false)}
        onSave={handleNutritionGoalsSave}
      />

      <PatientMealPlanHydrationModal
        open={hydrationOpen}
        prescription={form.hydrationPrescription as Partial<HydrationPrescription> | null}
        planTitle={form.title}
        patientWeightKg={(user.patientProfileData?.weightKg ?? user.patientProfile?.weightKg) as number | null | undefined}
        patientHeightCm={(user.patientProfileData?.heightCm ?? user.patientProfile?.heightCm) as number | null | undefined}
        onClose={() => setHydrationOpen(false)}
        onSave={handleHydrationSave}
      />

      <PatientMealPlanShoppingListModal
        open={shoppingListOpen}
        shoppingList={form.shoppingList as Partial<ShoppingList> | null}
        meals={form.meals ?? []}
        methodology={form.methodology}
        planTitle={form.title}
        onClose={() => setShoppingListOpen(false)}
        onSave={handleShoppingListSave}
      />

      {recipeEditorOpen && (
        <MealPlanRecipeEditorModal
          recipe={recipeEditorInitial}
          onClose={() => setRecipeEditorOpen(false)}
          onSaved={handleRecipeSaved}
        />
      )}
    </div>
    )
  },
)
