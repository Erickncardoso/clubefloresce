<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mpns-modal"
      :class="{ 'mpns-modal--goals-adjacent': goalsAdjacent }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpns-full-title"
    >
      <div v-if="!goalsAdjacent" class="mpns-modal__backdrop" aria-hidden="true" @click="close" />
      <div ref="panelRef" class="mpns-modal__panel admin-shell admin-shell-card">
        <header class="mpns-modal__head mpns-screen-only">
          <div>
            <p class="mpns-modal__kicker">Resumo nutricional</p>
            <h2 id="mpns-full-title">Resumo completo</h2>
          </div>
          <div class="mpns-modal__actions">
            <button type="button" class="btn-secondary" :disabled="printLoading" @click="printReport">
              {{ printLoading ? 'Gerando…' : 'Imprimir' }}
            </button>
            <button type="button" class="btn-secondary" aria-label="Fechar" @click="close">
              Fechar
            </button>
          </div>
        </header>

        <div class="mpns-print-only mpns-print-header">
          <div class="mpns-print-header__main">
            <p class="mpns-print-header__kicker">Plano Alimentar</p>
            <h1 class="mpns-print-header__title">{{ printContext.planTitle }}</h1>
            <dl class="mpns-print-header__meta">
              <div>
                <dt>Paciente</dt>
                <dd>{{ printContext.patientName }}</dd>
              </div>
              <div>
                <dt>Data de início</dt>
                <dd>{{ printContext.startDate }}</dd>
              </div>
              <div>
                <dt>Tipo de Dieta</dt>
                <dd>{{ printContext.dietType }}</dd>
              </div>
              <div>
                <dt>Período</dt>
                <dd>{{ printContext.period }}</dd>
              </div>
              <div>
                <dt>Objetivo</dt>
                <dd>{{ printContext.objective }}</dd>
              </div>
            </dl>
          </div>
          <div class="mpns-print-header__brand">
            <img
              :src="BRAND_LOGO_SRC"
              alt="Clube Florescer"
              class="mpns-print-header__logo"
              :width="headerLogoSize.width"
              :height="headerLogoSize.height"
            >
          </div>
        </div>

        <div class="mpns-modal__layout mpns-screen-only">
          <aside class="mpns-goals-rail" aria-label="Metas de nutrientes">
            <header class="mpns-goals-rail__head">
              <Target aria-hidden="true" />
              <span>Metas</span>
              <Info aria-hidden="true" class="mpns-goals-rail__info" />
            </header>

            <div v-if="!definedNutrientGoals.length" class="mpns-goals-rail__empty">
              <strong>Nenhuma meta definida</strong>
              <p>
                Passe o mouse sobre um nutriente ao lado e clique no botão
                <Plus aria-hidden="true" />
                para definir uma meta
              </p>
            </div>

            <ul v-else class="mpns-goals-rail__list">
              <li v-for="goal in definedNutrientGoals" :key="goal.key">
                <span>{{ goal.label }}</span>
                <strong>{{ goal.displayValue }}</strong>
              </li>
            </ul>
          </aside>

          <div class="mpns-modal__body">
          <div class="mpns-print-only mpns-print-intro">
            <h2 class="mpns-print-intro__title">Resumo Nutricional Completo</h2>
            <div class="mpns-print-intro__macros">
              <span class="mpns-print-intro__macro mpns-print-intro__macro--carb">
                Carboidratos: <strong>{{ formatMacroGrams(report.macros.carbsG) }}</strong>
              </span>
              <span class="mpns-print-intro__macro mpns-print-intro__macro--prot">
                Proteínas: <strong>{{ formatMacroGrams(report.macros.proteinG) }}</strong>
              </span>
              <span class="mpns-print-intro__macro mpns-print-intro__macro--fat">
                Lipídios: <strong>{{ formatMacroGrams(report.macros.fatG) }}</strong>
              </span>
              <span class="mpns-print-intro__macro mpns-print-intro__macro--kcal">
                Total: <strong>{{ formatMacroKcal(report.macros.caloriesKcal) }}</strong>
              </span>
            </div>
            <p class="mpns-print-intro__note">
              Valores de micronutrientes com % DRI baseados nas referências configuradas para o perfil do paciente.
            </p>
          </div>

          <section class="mpns-section mpns-section--overview mpns-screen-only">
            <h3>Resumo Nutricional</h3>
            <div class="mpns-overview-panel">
            <div class="mpns-overview">
              <div class="mpns-donut" aria-hidden="true">
                <svg viewBox="0 0 120 120" class="mpns-donut__svg">
                  <circle cx="60" cy="60" r="46" class="mpns-donut__track" />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    class="mpns-donut__seg mpns-donut__seg--carb"
                    :stroke-dasharray="`${donut.carbs} ${donut.circumference}`"
                    :stroke-dashoffset="donut.carbsOffset"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    class="mpns-donut__seg mpns-donut__seg--prot"
                    :stroke-dasharray="`${donut.protein} ${donut.circumference}`"
                    :stroke-dashoffset="donut.proteinOffset"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    class="mpns-donut__seg mpns-donut__seg--fat"
                    :stroke-dasharray="`${donut.fat} ${donut.circumference}`"
                    :stroke-dashoffset="donut.fatOffset"
                  />
                </svg>
                <div class="mpns-donut__center">
                  <strong>{{ formatMacroKcal(report.macros.caloriesKcal) }}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div class="mpns-macro-cards">
                <div class="mpns-macro-card mpns-macro-card--carb">
                  <span class="mpns-macro-card__dot mpns-macro-card__dot--carb" aria-hidden="true" />
                  <div class="mpns-macro-card__main">
                    <strong>{{ formatMacroGrams(report.macros.carbsG) }}</strong>
                    <span>Carboidratos</span>
                  </div>
                  <span class="mpns-macro-card__pct">{{ formatPct(report.percents.carbs) }}</span>
                </div>
                <div class="mpns-macro-card mpns-macro-card--prot">
                  <span class="mpns-macro-card__dot mpns-macro-card__dot--prot" aria-hidden="true" />
                  <div class="mpns-macro-card__main">
                    <strong>{{ formatMacroGrams(report.macros.proteinG) }}</strong>
                    <span>Proteínas</span>
                  </div>
                  <span class="mpns-macro-card__pct">{{ formatPct(report.percents.protein) }}</span>
                </div>
                <div class="mpns-macro-card mpns-macro-card--fat">
                  <span class="mpns-macro-card__dot mpns-macro-card__dot--fat" aria-hidden="true" />
                  <div class="mpns-macro-card__main">
                    <strong>{{ formatMacroGrams(report.macros.fatG) }}</strong>
                    <span>Lipídios</span>
                  </div>
                  <span class="mpns-macro-card__pct">{{ formatPct(report.percents.fat) }}</span>
                </div>
              </div>
            </div>
            </div>
          </section>

          <section
            v-for="section in enrichedSections"
            :key="section.id"
            class="mpns-section mpns-section--detail"
          >
            <h3>{{ section.title }}</h3>
            <div class="mpns-detail-list">
              <PatientMealPlanNutrientRowActions
                v-for="row in section.rows"
                :key="row.key"
                :ref="(el) => setRowRef(row.key, el)"
                :row="row"
                :meals="meals"
                :default-dri="defaultDriFor(row.key)"
                :custom-goal="nutrientGoals[row.key] ?? null"
                @update:custom-goal="(value) => setNutrientGoal(row.key, value)"
                @close-siblings="closeOtherRows(row.key)"
              />
            </div>
          </section>

          <section v-if="mealRows.length" class="mpns-section mpns-screen-only">
            <h3>Por refeição</h3>
            <div class="mpns-table-wrap">
              <div class="mpns-table-scroll">
              <table class="mpns-table">
                <thead>
                  <tr>
                    <th>Refeição</th>
                    <th>Kcal</th>
                    <th>Carb (g)</th>
                    <th>Prot (g)</th>
                    <th>Lip (g)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in mealRows" :key="row.id">
                    <td>{{ row.label }}</td>
                    <td>{{ formatMacroKcal(row.caloriesKcal) }}</td>
                    <td>{{ formatMacroGrams(row.carbsG) }}</td>
                    <td>{{ formatMacroGrams(row.proteinG) }}</td>
                    <td>{{ formatMacroGrams(row.fatG) }}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </section>

          <section v-if="foodComposition.length" class="mpns-section mpns-screen-only">
            <h3>Composição por alimento</h3>
            <div class="mpns-table-wrap">
              <div class="mpns-table-scroll">
              <table class="mpns-table">
                <thead>
                  <tr>
                    <th>Alimento</th>
                    <th>Qtd</th>
                    <th>Kcal</th>
                    <th>Carb</th>
                    <th>Prot</th>
                    <th>Lip</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in foodComposition" :key="row.id">
                    <td>{{ row.name }}</td>
                    <td>{{ row.portion || '—' }}</td>
                    <td>{{ formatMacroKcal(row.caloriesKcal) }}</td>
                    <td>{{ formatMacroGrams(row.carbsG) }}</td>
                    <td>{{ formatMacroGrams(row.proteinG) }}</td>
                    <td>{{ formatMacroGrams(row.fatG) }}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </section>

          <section v-if="pdfReport?.rows?.length" class="mpns-section mpns-screen-only">
            <h3>Macros do PDF importado</h3>
            <div class="mpns-table-wrap">
              <div class="mpns-table-scroll">
                <table class="mpns-table">
                  <thead>
                    <tr>
                      <th>Refeição</th>
                      <th>Kcal</th>
                      <th>Carb (g)</th>
                      <th>Prot (g)</th>
                      <th>Lip (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in pdfReport.rows" :key="row.id">
                      <td>{{ row.label }}</td>
                      <td>{{ formatMacroKcal(row.caloriesKcal) }}</td>
                      <td>{{ formatMacroGrams(row.carbsG) }}</td>
                      <td>{{ formatMacroGrams(row.proteinG) }}</td>
                      <td>{{ formatMacroGrams(row.fatG) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          </div>
        </div>

        <footer class="mpns-print-only mpns-print-foot">
          <div class="mpns-print-foot__rule" aria-hidden="true" />
          <div class="mpns-print-foot__row">
            <img
              :src="BRAND_LOGO_SRC"
              alt=""
              class="mpns-print-foot__logo"
              :width="footerLogoSize.width"
              :height="footerLogoSize.height"
              aria-hidden="true"
            >
            <span class="mpns-print-foot__name">{{ nutritionistName }}</span>
            <span class="mpns-print-foot__page" aria-hidden="true" />
          </div>
        </footer>
      </div>
    </div>

    <div
      v-if="printPreviewOpen"
      class="mpns-print-preview"
      role="dialog"
      aria-modal="true"
      aria-label="Pré-visualização de impressão"
    >
      <header class="mpns-print-preview__head">
        <div>
          <p class="mpns-print-preview__kicker">Impressão</p>
          <h3>Pré-visualização do resumo</h3>
        </div>
        <div class="mpns-print-preview__actions">
          <button type="button" class="btn-secondary" @click="closePrintPreview">
            Cancelar
          </button>
          <button type="button" class="btn-primary" @click="confirmPrint">
            Imprimir
          </button>
        </div>
      </header>
      <iframe
        ref="printFrameRef"
        class="mpns-print-preview__frame"
        title="Documento para impressão"
        :srcdoc="printPreviewHtml"
        @load="onPrintFrameLoad"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Info, Plus, Target } from 'lucide-vue-next'
import {
  buildMealPlanNutritionDonut,
  computeNutrientDriMeta,
  formatMacroGrams,
  formatMacroKcal,
} from '~/utils/meal-plan-nutrition-report.js'
import { MEAL_PLAN_NUTRIENT_DRI } from '~/config/meal-plan-nutrition-dri.js'
import { BRAND_LOGO_SRC, brandLogoSizeForHeight } from '~/config/brand-logo.js'
import { useAuthSession } from '~/composables/useAuthSession'
import PatientMealPlanNutrientRowActions from '~/components/patients/PatientMealPlanNutrientRowActions.vue'
import {
  buildMealPlanNutritionPrintHtml,
  openMealPlanNutritionInNewTab,
  printFromIframeElement,
} from '~/utils/meal-plan-nutrition-print.js'
import { openMealPlanNutritionPdfInNewTab } from '~/utils/meal-plan-nutrition-pdf.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  goalsAdjacent: { type: Boolean, default: false },
  report: { type: Object, required: true },
  meals: { type: Array, default: () => [] },
  mealRows: { type: Array, default: () => [] },
  foodComposition: { type: Array, default: () => [] },
  pdfReport: { type: Object, default: null },
  printContext: {
    type: Object,
    default: () => ({
      planTitle: 'Plano alimentar',
      patientName: '—',
      startDate: '—',
      endDate: '—',
      dietType: '—',
      objective: '—',
      period: 'Todos os dias da semana',
      methodology: '—',
    }),
  },
})

const emit = defineEmits(['update:open'])

const headerLogoSize = brandLogoSizeForHeight(34)
const footerLogoSize = brandLogoSizeForHeight(26)

const { verifiedUser } = useAuthSession()

const nutrientGoals = reactive({})
const rowRefs = new Map()
const panelRef = ref(null)
const printFrameRef = ref(null)
const printPreviewOpen = ref(false)
const printPreviewHtml = ref('')
const printFrameReady = ref(false)
const printLoading = ref(false)

const enrichedSections = computed(() => {
  const sections = props.report.sections || props.report.detailSections || []
  return sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => {
      const driRef = nutrientGoals[row.key] ?? MEAL_PLAN_NUTRIENT_DRI[row.key] ?? null
      const meta = computeNutrientDriMeta(row.value, driRef)
      return {
        ...row,
        ...meta,
        pctLabel: meta.pctLabel,
      }
    }),
  }))
})

const nutrientLabelMap = computed(() => {
  const map = new Map()
  for (const section of enrichedSections.value) {
    for (const row of section.rows) {
      map.set(row.key, row)
    }
  }
  return map
})

const definedNutrientGoals = computed(() => (
  Object.entries(nutrientGoals).map(([key, value]) => {
    const row = nutrientLabelMap.value.get(key)
    const unit = row?.unit || ''
    const formatted = Number.isFinite(Number(value))
      ? `${Number(value).toLocaleString('pt-BR')}${unit ? ` ${unit}` : ''}`
      : String(value)
    return {
      key,
      label: row?.label || key,
      displayValue: formatted,
    }
  })
))

function defaultDriFor(key) {
  return MEAL_PLAN_NUTRIENT_DRI[key] ?? null
}

function setNutrientGoal(key, value) {
  if (value == null || value === '') {
    delete nutrientGoals[key]
    return
  }
  nutrientGoals[key] = Number(value)
}

function setRowRef(key, el) {
  if (el) rowRefs.set(key, el)
  else rowRefs.delete(key)
}

function closeOtherRows(activeKey) {
  for (const [key, component] of rowRefs.entries()) {
    if (key !== activeKey) component?.closePanels?.()
  }
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    closePrintPreview()
    for (const component of rowRefs.values()) {
      component?.closePanels?.()
    }
  }
})

const nutritionistName = computed(() => {
  const name = String(verifiedUser.value?.name || verifiedUser.value?.fullName || '').trim()
  return name ? `Nutricionista ${name}` : 'Nutricionista'
})

const donut = computed(() => buildMealPlanNutritionDonut(props.report.percents))

function close() {
  emit('update:open', false)
}

function closePrintPreview() {
  printPreviewOpen.value = false
  printPreviewHtml.value = ''
  printFrameReady.value = false
}

function onPrintFrameLoad() {
  printFrameReady.value = true
}

async function confirmPrint() {
  if (!printFrameRef.value) return
  await printFromIframeElement(printFrameRef.value)
}

async function printReport() {
  if (!panelRef.value || printLoading.value) return

  const title = props.printContext?.planTitle
    ? `Resumo — ${props.printContext.planTitle}`
    : 'Resumo Nutricional'

  printLoading.value = true
  try {
    const openedPdf = await openMealPlanNutritionPdfInNewTab({
      printContext: props.printContext,
      sections: enrichedSections.value,
      macros: props.report.macros,
      nutritionistName: nutritionistName.value,
    })
    if (openedPdf) return
  } catch (error) {
    console.error('[mpns] Falha ao gerar PDF', error)
  } finally {
    printLoading.value = false
  }

  const openedHtml = openMealPlanNutritionInNewTab(panelRef.value, { title, autoPrint: false })
  if (openedHtml) return

  printPreviewHtml.value = buildMealPlanNutritionPrintHtml(panelRef.value, { title })
  printPreviewOpen.value = true
  printFrameReady.value = false

  nextTick(() => {
    if (printFrameRef.value?.contentDocument?.readyState === 'complete') {
      onPrintFrameLoad()
    }
  })
}

function formatPct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n)}%`
}
</script>

<style scoped>
.mpns-modal {
  position: fixed;
  inset: 0;
  z-index: 6100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mpns-modal--goals-adjacent {
  justify-content: flex-start;
  padding-left: max(1rem, calc(50vw - min(480px, 50vw - 1rem)));
  pointer-events: none;
}

.mpns-modal--goals-adjacent .mpns-modal__panel {
  pointer-events: auto;
  border-left: none;
  border-radius: 0 var(--cf-radius-control) var(--cf-radius-control) 0;
}

.mpns-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.mpns-modal__panel {
  position: relative;
  z-index: 1;
  width: min(960px, 100%);
  max-height: min(92vh, 920px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.09);
}

.mpns-modal__layout {
  display: grid;
  grid-template-columns: minmax(11rem, 13.5rem) minmax(0, 1fr);
  min-height: 0;
  flex: 1;
  border-top: 1px solid #f0f1f3;
}

.mpns-goals-rail {
  display: grid;
  align-content: start;
  gap: 0.65rem;
  padding: 0.85rem 0.75rem;
  border-right: 1px solid #f0f1f3;
  background: #fff;
  min-height: 0;
  overflow: auto;
}

.mpns-goals-rail__head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.mpns-goals-rail__head svg:first-child {
  width: 0.95rem;
  height: 0.95rem;
  color: #f97316;
}

.mpns-goals-rail__info {
  width: 0.8rem;
  height: 0.8rem;
  color: #9ca3af;
  margin-left: auto;
}

.mpns-goals-rail__empty {
  padding: 0.75rem 0.65rem;
  border: 1px solid #eef0f2;
  border-radius: var(--cf-radius-control);
  background: #fff;
}

.mpns-goals-rail__empty strong {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.mpns-goals-rail__empty p {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1.45;
  color: #9ca3af;
}

.mpns-goals-rail__empty p svg {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  vertical-align: -0.1rem;
  color: #9ca3af;
}

.mpns-goals-rail__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.mpns-goals-rail__list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid #eef0f2;
  border-radius: var(--cf-radius-control);
  font-size: 0.6875rem;
  color: #6b7280;
}

.mpns-goals-rail__list strong {
  font-size: 0.6875rem;
  font-weight: 500;
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.mpns-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.mpns-modal__kicker {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.45);
}

.mpns-modal__head h2 {
  margin: 0;
  font-size: 1.15rem;
}

.mpns-modal__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.mpns-modal__body {
  overflow: auto;
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.mpns-print-only {
  display: none;
}

.mpns-section h3 {
  margin: 0 0 0.55rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.82);
}

.mpns-section--overview h3 {
  margin-bottom: 0.65rem;
}

.mpns-overview-panel {
  padding: 0.9rem;
  background: linear-gradient(180deg, #fcfdfc 0%, #f8faf8 100%);
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mpns-overview {
  display: grid;
  grid-template-columns: 8.75rem minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.mpns-donut {
  position: relative;
  width: 8.75rem;
  height: 8.75rem;
  display: grid;
  place-items: center;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: inset 0 0 0 1px #e8ece9;
}

.mpns-donut__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.mpns-donut__track,
.mpns-donut__seg {
  fill: none;
  stroke-width: 14;
}

.mpns-donut__track {
  stroke: rgba(15, 23, 42, 0.08);
}

.mpns-donut__seg--carb { stroke: #3b82f6; }
.mpns-donut__seg--prot { stroke: #ef4444; }
.mpns-donut__seg--fat { stroke: #f59e0b; }

.mpns-donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.72rem;
  color: rgba(15, 23, 42, 0.55);
}

.mpns-donut__center strong {
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.88);
}

.mpns-macro-cards {
  display: grid;
  gap: 0.5rem;
}

.mpns-macro-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
  min-height: 3.2rem;
  padding: 0.72rem 0.85rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-sm);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.mpns-macro-card__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--cf-radius-full);
  flex-shrink: 0;
}

.mpns-macro-card__dot--carb { background: #3b82f6; }
.mpns-macro-card__dot--prot { background: #ef4444; }
.mpns-macro-card__dot--fat { background: #f59e0b; }

.mpns-macro-card__main {
  min-width: 0;
}

.mpns-macro-card strong {
  display: block;
  font-size: 0.9rem;
  line-height: 1.2;
  color: rgba(15, 23, 42, 0.9);
}

.mpns-macro-card span {
  display: block;
  font-size: 0.76rem;
  color: rgba(15, 23, 42, 0.55);
}

.mpns-macro-card__pct {
  flex-shrink: 0;
  padding: 0.22rem 0.55rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(15, 23, 42, 0.05);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgba(15, 23, 42, 0.52);
}

.mpns-macro-card--carb .mpns-macro-card__pct {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.1);
}

.mpns-macro-card--prot .mpns-macro-card__pct {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.mpns-macro-card--fat .mpns-macro-card__pct {
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
}

.mpns-detail-list {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mpns-detail-row {
  display: grid;
  grid-template-columns: minmax(8rem, 1.4fr) 5.5rem minmax(5rem, 1fr) 3rem;
  gap: 0.65rem;
  align-items: center;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  font-size: 0.82rem;
}

.mpns-detail-row:last-child {
  border-bottom: 0;
}

.mpns-detail-row__label {
  color: rgba(15, 23, 42, 0.78);
}

.mpns-detail-row__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: rgba(15, 23, 42, 0.88);
}

.mpns-detail-row__bar-wrap {
  height: 0.35rem;
  background: rgba(15, 23, 42, 0.08);
  border-radius: var(--cf-radius-pill);
  overflow: hidden;
}

.mpns-detail-row__bar {
  height: 100%;
  border-radius: var(--cf-radius-pill);
}

.mpns-detail-row__bar--neutral { background: rgba(15, 23, 42, 0.18); }
.mpns-detail-row__bar--low { background: #f59e0b; }
.mpns-detail-row__bar--ok { background: #22c55e; }
.mpns-detail-row__bar--high { background: #ef4444; }

.mpns-detail-row__pct {
  text-align: right;
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.55);
  font-variant-numeric: tabular-nums;
}

.mpns-table-wrap {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mpns-table-scroll {
  overflow-x: auto;
}

.mpns-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.mpns-table thead th {
  padding: 0.55rem 0.75rem;
  text-align: left;
  font-weight: 600;
  background: rgba(139, 150, 124, 0.16);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.mpns-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.mpns-pdf-block {
  padding: 0.75rem;
  background: #fff;
}

.mpns-pdf-block h4 {
  margin: 0 0 0.45rem;
  font-size: 0.85rem;
}

.mpns-pdf-block ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  color: rgba(15, 23, 42, 0.72);
}

.mpns-print-preview {
  position: fixed;
  inset: 0;
  z-index: 6300;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.55);
  padding: 1rem;
}

.mpns-print-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
}

.mpns-print-preview__kicker {
  margin: 0 0 0.15rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.45);
}

.mpns-print-preview__head h3 {
  margin: 0;
  font-size: 1rem;
  color: rgba(15, 23, 42, 0.9);
}

.mpns-print-preview__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.mpns-print-preview__frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
}

@media (max-width: 900px) {
  .mpns-modal__layout {
    grid-template-columns: 1fr;
  }

  .mpns-goals-rail {
    border-right: none;
    border-bottom: 1px solid #f0f1f3;
  }

  .mpns-modal--goals-adjacent {
    padding-left: 1rem;
    justify-content: center;
  }

  .mpns-modal--goals-adjacent .mpns-modal__panel {
    border-left: 1px solid #e5e7eb;
    border-radius: var(--cf-radius-control);
  }
}

@supports (corner-shape: squircle) {
  .mpns-overview-panel,
  .mpns-donut,
  .mpns-macro-card,
  .mpns-detail-list,
  .mpns-table-wrap,
  .mpns-print-preview__head,
  .mpns-print-preview__frame {
    corner-shape: squircle;
  }
}

@media print {
  .mpns-modal__backdrop,
  .mpns-screen-only,
  .mpns-nutrient-row__tools--screen {
    display: none !important;
  }

  .mpns-print-only {
    display: block !important;
  }

  .mpns-modal {
    position: static !important;
    inset: auto !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .mpns-modal__panel {
    width: 100% !important;
    max-height: none !important;
    overflow: visible !important;
    border: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  .mpns-nutrient-row {
    grid-template-columns: minmax(6rem, 1.35fr) 4.5rem minmax(4rem, 1fr) 2.5rem !important;
  }

  .mpns-nutrient-row__bar-wrap,
  .mpns-nutrient-row__bar {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

<style>
@media print {
  body > *:not(.mpns-modal):not(.mpns-print-preview) {
    display: none !important;
  }

  .mpns-print-preview {
    position: static !important;
    inset: auto !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .mpns-print-preview__head {
    display: none !important;
  }

  .mpns-print-preview__frame {
    position: static !important;
    width: 100% !important;
    height: auto !important;
    min-height: 100vh !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .mpns-nutrient-layer {
    display: none !important;
  }
}
</style>
