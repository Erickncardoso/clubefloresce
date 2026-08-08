<template>
  <div class="mpr-modal" role="dialog" aria-modal="true" aria-labelledby="mpr-title">
    <div class="mpr-backdrop" @click="$emit('close')" />
    <div class="mpr-card admin-shell-card">
      <header class="mpr-head">
        <div>
          <p class="mpr-kicker">Receita do plano</p>
          <h2 id="mpr-title">{{ draft.title || 'Nova receita' }}</h2>
        </div>
        <button type="button" class="mpr-close" aria-label="Fechar" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="mpr-body">
        <section class="mpr-import">
          <div class="mpr-import-copy">
            <strong>Importar por IA</strong>
            <p>Envie PDF ou foto da receita — a IA extrai ingredientes e vincula à base TBCA/TACO.</p>
          </div>
          <div class="mpr-import-actions">
            <input ref="importInputRef" type="file" accept="application/pdf,image/*" hidden @change="onImportSelected">
            <button type="button" class="btn-primary mpr-import-btn" :disabled="importing" @click="importInputRef?.click()">
              <Sparkles :size="15" />
              {{ importing ? 'Extraindo receita…' : 'Importar receita ✨' }}
            </button>
          </div>
          <ul v-if="importWarnings.length" class="mpr-import-warnings">
            <li v-for="(warning, index) in importWarnings" :key="index">{{ warning }}</li>
          </ul>
        </section>

        <div class="mpr-grid">
          <div class="field field--float">
            <label for="mpr-title-input">Nome da receita</label>
            <input id="mpr-title-input" v-model="draft.title" type="text" maxlength="160" placeholder="Ex.: Panqueca de banana">
          </div>
          <div class="field field--float">
            <label for="mpr-servings">Porção</label>
            <input id="mpr-servings" v-model="draft.servingsLabel" type="text" maxlength="80" placeholder="1 prato">
          </div>
          <div class="field field--float">
            <label for="mpr-prep">Tempo (min)</label>
            <input id="mpr-prep" v-model.number="draft.prepMinutes" type="number" min="0" max="600" placeholder="15">
          </div>
        </div>

        <div class="mpr-image-block">
          <div class="mpr-image-preview" :style="imagePreviewStyle">
            <img v-if="draft.imageUrl" :src="draft.imageUrl" alt="">
            <span v-else>Imagem da receita</span>
          </div>
          <div class="mpr-image-tools">
            <input ref="imageInputRef" type="file" accept="image/*" hidden @change="onImageSelected">
            <button type="button" class="btn-secondary" :disabled="uploadingImage" @click="imageInputRef?.click()">
              {{ uploadingImage ? 'Enviando…' : 'Adicionar imagem' }}
            </button>
            <label class="mpr-slider">
              <span>Enquadramento horizontal</span>
              <input v-model.number="imagePosX" type="range" min="0" max="100">
            </label>
            <label class="mpr-slider">
              <span>Enquadramento vertical</span>
              <input v-model.number="imagePosY" type="range" min="0" max="100">
            </label>
          </div>
        </div>

        <section class="mpr-section">
          <div class="mpr-section-head">
            <h3>Ingredientes</h3>
            <p v-if="missingIngredients.length" class="mpr-warn">
              {{ missingIngredients.length }} ingrediente(s) sem dado nutricional
            </p>
            <div v-else-if="recipeMacros.caloriesKcal" class="mpr-macros">
              {{ recipeMacros.caloriesKcal }} kcal · C {{ recipeMacros.carbsG }}g · P {{ recipeMacros.proteinG }}g · G {{ recipeMacros.fatG }}g
            </div>
          </div>

          <div v-for="(ingredient, index) in draft.ingredients" :key="ingredient.id" class="mpr-ingredient-wrap">
            <p v-if="ingredientMatchMeta(ingredient).label" class="mpr-match" :class="`mpr-match--${ingredientMatchMeta(ingredient).status}`">
              {{ ingredientMatchMeta(ingredient).label }}
            </p>
            <div class="mpr-ingredient">
            <MealPlanFoodSearchPicker
              v-model="ingredient.name"
              placeholder="Ingrediente"
              @select="onIngredientSelect(ingredient, $event)"
            />
            <MealPlanPortionMeasurePicker
              :food-name="ingredient.name"
              :per100g="ingredient.per100g"
              :amount="Number(ingredient.amount) || 1"
              :measure-id="ingredient.unit === 'g' ? 'grams' : 'unidade'"
              @change="onIngredientPortion(ingredient, $event)"
            />
            <button type="button" class="mpr-icon-btn" title="Remover" @click="removeIngredient(index)">
              <Trash2 :size="16" />
            </button>
            </div>
          </div>
          <button type="button" class="btn-secondary mpr-add-btn" @click="addIngredient">+ Ingrediente</button>
        </section>

        <div class="field field--float">
          <label for="mpr-steps">Modo de preparo</label>
          <textarea id="mpr-steps" v-model="draft.steps" rows="6" maxlength="12000" placeholder="Descreva o passo a passo…" />
        </div>

        <MealPlanRecipeSharePanel
          v-model:share-with-all="draft.shareWithAll"
          v-model:shared-patient-ids="draft.sharedPatientIds"
          :patients="patients"
        />
      </div>

      <footer class="mpr-foot">
        <button type="button" class="btn-secondary" @click="downloadPdf(false)">PDF (sem macros)</button>
        <button type="button" class="btn-secondary" @click="downloadPdf(true)">PDF (com macros)</button>
        <div class="mpr-foot-right">
          <p v-if="errorMessage" class="mpr-error">{{ errorMessage }}</p>
          <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
          <button type="button" class="btn-primary" :disabled="saving" @click="saveRecipe">
            {{ saving ? 'Salvando…' : 'Salvar receita' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Trash2, Sparkles, X } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { useMealPlanRecipes } from '~/composables/useMealPlanRecipes.js'
import MealPlanFoodSearchPicker from '~/components/patients/MealPlanFoodSearchPicker.vue'
import MealPlanPortionMeasurePicker from '~/components/patients/MealPlanPortionMeasurePicker.vue'
import MealPlanRecipeSharePanel from '~/components/patients/MealPlanRecipeSharePanel.vue'
import { downloadMealPlanRecipePdf } from '~/utils/meal-plan-recipe-pdf.js'
import {
  computeRecipeMacros,
  createEmptyMealPlanRecipe,
  createEmptyRecipeIngredient,
  ingredientMatchMeta,
  recipeIngredientsMissingData,
  snapshotRecipe,
} from '~/utils/meal-plan-recipes.js'
import { applyFoodItemMeasure } from '~/utils/meal-plan-prescription.js'

const props = defineProps({
  recipe: { type: Object, default: null },
  patients: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'saved', 'insert'])

const apiBase = useApiBase()
const { saveRecipe: persistRecipe, importRecipe } = useMealPlanRecipes()

const imageInputRef = ref(null)
const importInputRef = ref(null)
const saving = ref(false)
const importing = ref(false)
const uploadingImage = ref(false)
const errorMessage = ref('')
const importWarnings = ref([])
const pendingImportImageFile = ref(null)
const imagePosX = ref(50)
const imagePosY = ref(50)

const draft = reactive(createEmptyMealPlanRecipe())

function hydrateDraft(source) {
  const base = createEmptyMealPlanRecipe()
  Object.assign(draft, base, source || {})
  if (!draft.ingredients?.length) draft.ingredients = [createEmptyRecipeIngredient()]
  const pos = String(draft.imagePosition || '50% 50%').match(/(\d+)%\s+(\d+)%/)
  imagePosX.value = pos ? Number(pos[1]) : 50
  imagePosY.value = pos ? Number(pos[2]) : 50
}

watch(() => props.recipe, (value) => hydrateDraft(value), { immediate: true, deep: true })

watch([imagePosX, imagePosY], () => {
  draft.imagePosition = `${imagePosX.value}% ${imagePosY.value}%`
})

const imagePreviewStyle = computed(() => ({
  backgroundImage: draft.imageUrl ? `url(${draft.imageUrl})` : undefined,
  backgroundPosition: draft.imagePosition || '50% 50%',
}))

const recipeMacros = computed(() => computeRecipeMacros(draft))
const missingIngredients = computed(() => recipeIngredientsMissingData(draft))

function addIngredient() {
  draft.ingredients.push(createEmptyRecipeIngredient())
}

function removeIngredient(index) {
  if (draft.ingredients.length <= 1) return
  draft.ingredients.splice(index, 1)
}

function onIngredientSelect(ingredient, food) {
  ingredient.name = food.displayName || food.name
  ingredient.foodId = food.id
  ingredient.foodSource = food.source
  ingredient.per100g = food.per100g || null
  ingredient.matchedFoodName = food.displayName || food.name
  ingredient.matchStatus = 'matched'
}

async function applyImportedDraft(imported) {
  hydrateDraft({
    ...imported,
    ingredients: (imported.ingredients || []).map((item) => ({ ...item })),
  })
}

async function uploadRecipeCover(file) {
  if (!file) return
  uploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $fetch(`${apiBase.value}/upload`, authFetchInit({ method: 'POST', body: formData }))
    draft.imageUrl = res?.url || res?.secure_url || draft.imageUrl
  } catch {
    /* capa opcional */
  } finally {
    uploadingImage.value = false
  }
}

async function onImportSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  importing.value = true
  errorMessage.value = ''
  importWarnings.value = []
  pendingImportImageFile.value = file.type?.startsWith('image/') ? file : null

  try {
    const result = await importRecipe(file)
    await applyImportedDraft(result?.draft || {})
    importWarnings.value = Array.isArray(result?.warnings) ? result.warnings : []
    if (pendingImportImageFile.value) {
      await uploadRecipeCover(pendingImportImageFile.value)
    }
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Falha ao importar receita.'
  } finally {
    importing.value = false
    pendingImportImageFile.value = null
    if (importInputRef.value) importInputRef.value.value = ''
  }
}

function onIngredientPortion(ingredient, payload) {
  applyFoodItemMeasure(ingredient, payload)
  ingredient.amount = String(payload.amount || ingredient.amount || 1)
  ingredient.unit = payload.measureId === 'grams' ? 'g' : (ingredient.unit || 'unidade')
  ingredient.grams = payload.grams ?? ingredient.grams
}

async function onImageSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  uploadingImage.value = true
  errorMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $fetch(`${apiBase.value}/upload`, authFetchInit({ method: 'POST', body: formData }))
    draft.imageUrl = res?.url || res?.secure_url || ''
  } catch (err) {
    errorMessage.value = err?.data?.message || 'Erro ao enviar imagem.'
  } finally {
    uploadingImage.value = false
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}

async function saveRecipe() {
  if (!String(draft.title || '').trim()) {
    errorMessage.value = 'Informe o nome da receita.'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const saved = await persistRecipe({
      ...draft,
      ingredients: draft.ingredients.filter((item) => String(item.name || '').trim()),
    })
    emit('saved', saved)
    emit('insert', saved)
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Erro ao salvar receita.'
  } finally {
    saving.value = false
  }
}

async function downloadPdf(includeMacros) {
  try {
    await downloadMealPlanRecipePdf({
      recipe: { ...draft, macros: recipeMacros.value },
      includeMacros,
    })
  } catch {
    errorMessage.value = 'Erro ao gerar PDF da receita.'
  }
}
</script>

<style scoped>
.mpr-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.mpr-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.mpr-card {
  position: relative;
  width: min(960px, 100%);
  max-height: min(92dvh, 920px);
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.mpr-head,
.mpr-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid #ecefed;
}

.mpr-foot {
  border-bottom: none;
  border-top: 1px solid #ecefed;
}

.mpr-kicker {
  margin: 0 0 0.15rem;
  font-size: 0.75rem;
  color: #8a9288;
}

.mpr-head h2 {
  margin: 0;
  font-size: 1.15rem;
}

.mpr-close {
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.mpr-body {
  overflow: auto;
  padding: 1rem 1.15rem;
  display: grid;
  gap: 1rem;
}

.mpr-import {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  background: linear-gradient(135deg, #fffef8 0%, #f8f5ff 100%);
}

.mpr-import-copy strong {
  display: block;
  font-size: 0.92rem;
  color: #2c322c;
}

.mpr-import-copy p {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
  max-width: 34rem;
}

.mpr-import-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.mpr-import-warnings {
  width: 100%;
  margin: 0;
  padding-left: 1rem;
  font-size: 0.78rem;
  color: #b45309;
}

.mpr-ingredient-wrap {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.45rem;
}

.mpr-match {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 500;
}

.mpr-match--matched {
  color: #15803d;
}

.mpr-match--review {
  color: #b45309;
}

.mpr-match--unmatched {
  color: #b42318;
}

.mpr-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.mpr-image-block {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: 0.85rem;
}

.mpr-image-preview {
  aspect-ratio: 4 / 3;
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  background: #f5f6f5 center/cover no-repeat;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #9aa39a;
  font-size: 0.82rem;
}

.mpr-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: inherit;
}

.mpr-image-tools {
  display: grid;
  gap: 0.55rem;
  align-content: start;
}

.mpr-slider {
  display: grid;
  gap: 0.2rem;
  font-size: 0.78rem;
  color: #6b7368;
}

.mpr-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.55rem;
}

.mpr-section-head h3 {
  margin: 0;
  font-size: 0.95rem;
}

.mpr-warn {
  margin: 0;
  font-size: 0.78rem;
  color: #b45309;
}

.mpr-macros {
  font-size: 0.78rem;
  color: #15803d;
}

.mpr-ingredient {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  gap: 0.45rem;
  margin-bottom: 0.45rem;
}

.mpr-icon-btn {
  border: 1px solid #ecefed;
  border-radius: var(--cf-radius-control);
  background: #fff;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.mpr-add-btn {
  margin-top: 0.35rem;
}

.mpr-foot-right {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-left: auto;
}

.mpr-error {
  margin: 0;
  color: #b42318;
  font-size: 0.8125rem;
}

@media (max-width: 820px) {
  .mpr-grid,
  .mpr-image-block,
  .mpr-ingredient {
    grid-template-columns: 1fr;
  }
}
</style>
