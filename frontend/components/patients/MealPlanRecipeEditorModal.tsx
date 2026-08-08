'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Trash2, X } from 'lucide-react'
import {
  apiImportRecipe,
  apiSaveRecipe,
  apiUploadRecipeCover,
  computeRecipeMacros,
  createEmptyMealPlanRecipe,
  createEmptyRecipeIngredient,
  ingredientMatchMeta,
  recipeIngredientsMissingData,
  type MealPlanRecipe,
  type RecipeIngredient,
} from '@/lib/meal-plan/recipes'
import { MealPlanFoodSearchPicker } from './MealPlanFoodSearchPicker'
import { MealPlanPortionMeasurePicker } from './MealPlanPortionMeasurePicker'
import type { FoodBankItem } from '@/lib/meal-plan/food-bank'
import styles from './MealPlanRecipeEditorModal.module.scss'

interface Props {
  recipe?: MealPlanRecipe | null
  onClose: () => void
  onSaved: (recipe: MealPlanRecipe) => void
}

function parseImagePos(pos: string | undefined): [number, number] {
  const m = String(pos || '50% 50%').match(/(\d+)%\s+(\d+)%/)
  return m ? [Number(m[1]), Number(m[2])] : [50, 50]
}

export function MealPlanRecipeEditorModal({ recipe, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<MealPlanRecipe>(() => ({
    ...createEmptyMealPlanRecipe(),
    ...(recipe ?? {}),
    ingredients:
      recipe?.ingredients?.length
        ? recipe.ingredients.map((i) => ({ ...i }))
        : [createEmptyRecipeIngredient()],
  }))

  const [[imagePosX, imagePosY], setImagePos] = useState<[number, number]>(() =>
    parseImagePos(recipe?.imagePosition),
  )

  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  const imageInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Update imagePosition in draft when sliders change
  useEffect(() => {
    setDraft((prev) => ({ ...prev, imagePosition: `${imagePosX}% ${imagePosY}%` }))
  }, [imagePosX, imagePosY])

  // Hydrate when recipe prop changes
  useEffect(() => {
    if (!recipe) return
    setDraft({
      ...createEmptyMealPlanRecipe(),
      ...recipe,
      ingredients: recipe.ingredients?.length
        ? recipe.ingredients.map((i) => ({ ...i }))
        : [createEmptyRecipeIngredient()],
    })
    setImagePos(parseImagePos(recipe.imagePosition))
  }, [recipe])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const patchDraft = useCallback(
    (patch: Partial<MealPlanRecipe>) => setDraft((prev) => ({ ...prev, ...patch })),
    [],
  )

  function patchIngredient(index: number, patch: Partial<RecipeIngredient>) {
    setDraft((prev) => {
      const ingredients = [...prev.ingredients]
      ingredients[index] = { ...ingredients[index], ...patch }
      return { ...prev, ingredients }
    })
  }

  function addIngredient() {
    setDraft((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, createEmptyRecipeIngredient()],
    }))
  }

  function removeIngredient(index: number) {
    setDraft((prev) => {
      if (prev.ingredients.length <= 1) return prev
      const ingredients = [...prev.ingredients]
      ingredients.splice(index, 1)
      return { ...prev, ingredients }
    })
  }

  function onIngredientSelect(index: number, food: FoodBankItem) {
    patchIngredient(index, {
      name: food.displayName || food.name,
      foodId: food.id,
      foodSource: food.source ?? null,
      per100g: food.per100g || null,
      matchedFoodName: food.displayName || food.name,
      matchStatus: 'matched',
    })
  }

  function onIngredientPortion(
    index: number,
    change: { measureId: string; amount: number; grams: number },
  ) {
    patchIngredient(index, {
      amount: String(change.amount || 1),
      unit: change.measureId === 'grams' ? 'g' : 'unidade',
      grams: change.grams,
    })
  }

  async function handleImportSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setErrorMessage('')
    setImportWarnings([])

    const isImage = file.type.startsWith('image/')

    try {
      const result = await apiImportRecipe(file)
      const imported = result.draft
      setDraft((prev) => ({
        ...createEmptyMealPlanRecipe(),
        ...prev,
        ...imported,
        ingredients: imported.ingredients?.length
          ? imported.ingredients.map((i: RecipeIngredient) => ({ ...i }))
          : [createEmptyRecipeIngredient()],
      }))
      setImagePos(parseImagePos(imported.imagePosition))
      setImportWarnings(result.warnings)

      if (isImage) {
        const url = await apiUploadRecipeCover(file)
        if (url) patchDraft({ imageUrl: url })
      }
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        'Falha ao importar receita.'
      setErrorMessage(message)
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    setErrorMessage('')
    try {
      const url = await apiUploadRecipeCover(file)
      patchDraft({ imageUrl: url })
    } catch (err: unknown) {
      setErrorMessage(
        (err as { message?: string })?.message || 'Erro ao enviar imagem.',
      )
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!String(draft.title ?? '').trim()) {
      setErrorMessage('Informe o nome da receita.')
      return
    }
    setSaving(true)
    setErrorMessage('')
    try {
      const payload: MealPlanRecipe = {
        ...draft,
        ingredients: draft.ingredients.filter((i) => String(i.name ?? '').trim()),
      }
      const saved = await apiSaveRecipe(payload)
      onSaved(saved)
    } catch (err: unknown) {
      setErrorMessage(
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        'Erro ao salvar receita.',
      )
    } finally {
      setSaving(false)
    }
  }

  const recipeMacros = computeRecipeMacros(draft)
  const missingIngredients = recipeIngredientsMissingData(draft)

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="mpr-title">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`${styles.card} admin-shell-card`}>
        {/* Header */}
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>Receita do plano</p>
            <h2 id="mpr-title">{draft.title || 'Nova receita'}</h2>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className={styles.body}>
          {/* AI import */}
          <section className={styles.importSection}>
            <div className={styles.importCopy}>
              <strong>Importar por IA</strong>
              <p>Envie PDF ou foto da receita — a IA extrai ingredientes e vincula à base TBCA/TACO.</p>
            </div>
            <div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/pdf,image/*"
                hidden
                onChange={handleImportSelected}
              />
              <button
                type="button"
                className={`btn-primary ${styles.importBtn}`}
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
              >
                <Sparkles size={15} />
                {importing ? 'Extraindo receita…' : 'Importar receita ✨'}
              </button>
            </div>
            {importWarnings.length > 0 && (
              <ul className={styles.importWarnings}>
                {importWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Basic fields */}
          <div className={styles.grid}>
            <div className="field field--float">
              <label htmlFor="mpr-title-input">Nome da receita</label>
              <input
                id="mpr-title-input"
                type="text"
                maxLength={160}
                placeholder="Ex.: Panqueca de banana"
                value={draft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
              />
            </div>
            <div className="field field--float">
              <label htmlFor="mpr-servings">Porção</label>
              <input
                id="mpr-servings"
                type="text"
                maxLength={80}
                placeholder="1 prato"
                value={draft.servingsLabel}
                onChange={(e) => patchDraft({ servingsLabel: e.target.value })}
              />
            </div>
            <div className="field field--float">
              <label htmlFor="mpr-prep">Tempo (min)</label>
              <input
                id="mpr-prep"
                type="number"
                min={0}
                max={600}
                placeholder="15"
                value={draft.prepMinutes ?? ''}
                onChange={(e) =>
                  patchDraft({ prepMinutes: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
          </div>

          {/* Image block */}
          <div className={styles.imageBlock}>
            <div
              className={styles.imagePreview}
              style={
                draft.imageUrl
                  ? {
                      backgroundImage: `url(${draft.imageUrl})`,
                      backgroundPosition: draft.imagePosition || '50% 50%',
                    }
                  : undefined
              }
            >
              {!draft.imageUrl && <span>Imagem da receita</span>}
            </div>
            <div className={styles.imageTools}>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageSelected}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
              >
                {uploadingImage ? 'Enviando…' : 'Adicionar imagem'}
              </button>
              <label className={styles.slider}>
                <span>Enquadramento horizontal</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={imagePosX}
                  onChange={(e) => setImagePos([Number(e.target.value), imagePosY])}
                />
              </label>
              <label className={styles.slider}>
                <span>Enquadramento vertical</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={imagePosY}
                  onChange={(e) => setImagePos([imagePosX, Number(e.target.value)])}
                />
              </label>
            </div>
          </div>

          {/* Ingredients */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3>Ingredientes</h3>
              {missingIngredients.length > 0 ? (
                <p className={styles.warn}>
                  {missingIngredients.length} ingrediente(s) sem dado nutricional
                </p>
              ) : recipeMacros.caloriesKcal > 0 ? (
                <div className={styles.macros}>
                  {recipeMacros.caloriesKcal} kcal · C {recipeMacros.carbsG}g · P{' '}
                  {recipeMacros.proteinG}g · G {recipeMacros.fatG}g
                </div>
              ) : null}
            </div>

            {draft.ingredients.map((ingredient, index) => {
              const meta = ingredientMatchMeta(ingredient)
              const portionMeasure = ingredient.unit === 'g' ? 'grams' : 'unidade'
              const portionAmount = Math.max(1, Number(ingredient.amount) || 1)

              return (
                <div key={ingredient.id} className={styles.ingredientWrap}>
                  {meta.label && (
                    <p
                      className={`${styles.match} ${
                        meta.status === 'matched'
                          ? styles.matchMatched
                          : meta.status === 'review'
                            ? styles.matchReview
                            : styles.matchUnmatched
                      }`}
                    >
                      {meta.label}
                    </p>
                  )}
                  <div className={styles.ingredient}>
                    <MealPlanFoodSearchPicker
                      value={ingredient.name}
                      placeholder="Ingrediente"
                      onChange={(v) => patchIngredient(index, { name: v })}
                      onSelect={(food) => onIngredientSelect(index, food)}
                    />
                    <MealPlanPortionMeasurePicker
                      foodName={ingredient.name}
                      per100g={ingredient.per100g}
                      amount={portionAmount}
                      measureId={portionMeasure}
                      onAmountChange={(v) => patchIngredient(index, { amount: String(v) })}
                      onMeasureChange={(m) =>
                        patchIngredient(index, { unit: m === 'grams' ? 'g' : 'unidade' })
                      }
                      onChange={(change) => onIngredientPortion(index, change)}
                    />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      title="Remover ingrediente"
                      onClick={() => removeIngredient(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}

            <button type="button" className={`btn-secondary ${styles.addBtn}`} onClick={addIngredient}>
              + Ingrediente
            </button>
          </section>

          {/* Preparation steps */}
          <div className="field field--float">
            <label htmlFor="mpr-steps">Modo de preparo</label>
            <textarea
              id="mpr-steps"
              rows={6}
              maxLength={12000}
              placeholder="Descreva o passo a passo…"
              value={draft.steps}
              onChange={(e) => patchDraft({ steps: e.target.value })}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.foot}>
          <div className={styles.footRight}>
            {errorMessage && <p className={styles.error}>{errorMessage}</p>}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Salvando…' : 'Salvar receita'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
