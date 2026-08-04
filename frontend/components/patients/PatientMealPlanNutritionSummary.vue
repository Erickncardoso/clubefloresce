<template>
  <article class="mpns-card mped-side-card admin-shell-card">
    <header class="mpns-card__head">
      <h4 class="mpns-card__title">
        <ClipboardList aria-hidden="true" />
        Resumo nutricional
      </h4>
      <div class="mpns-card__actions">
        <button type="button" class="btn-secondary mpns-head-btn" @click="$emit('open-hydration')">
          <SharedCfHydrationBottleIcon :size="14" />
          Hidratação
        </button>
        <button type="button" class="btn-secondary mpns-head-btn" @click="$emit('open-goals')">
          <Target aria-hidden="true" />
          Metas
        </button>
      </div>
    </header>

    <p v-if="loading" class="mpns-empty">{{ loading }}</p>

    <div v-else class="mpns-body">
      <div class="mpns-chart" :class="{ 'mpns-chart--empty': isEmpty }">
        <div class="mpns-donut" :style="report.ringStyle" aria-hidden="true">
          <div class="mpns-donut__hole">
            <span>{{ report.kcalLabel }}</span>
            <small>Kcal</small>
          </div>
        </div>
        <p v-if="isEmpty" class="mpns-hint">
          Adicione alimentos às refeições para ver a distribuição de macros.
        </p>
      </div>

      <!-- Uma linha por macro: cor, nome, gramas·kcal e participação.
           Antes a legenda e os blocos repetiam os mesmos três valores. -->
      <ul v-if="!isEmpty" class="mpns-macros">
        <li
          v-for="row in macroRows"
          :key="row.id"
          class="mpns-macro"
        >
          <span class="mpns-macro__dot" :class="`mpns-macro__dot--${row.tone}`" aria-hidden="true" />
          <span class="mpns-macro__label">{{ row.label }}</span>
          <span class="mpns-macro__value">{{ row.value }}</span>
          <span class="mpns-macro__percent">{{ row.percent }}%</span>
        </li>
      </ul>

      <div class="mpns-actions">
        <button
          type="button"
          class="btn-secondary mpns-btn"
          :disabled="exportDisabled || pdfLoading"
          @click="$emit('export-pdf')"
        >
          <FileDown aria-hidden="true" />
          {{ pdfLoading ? 'Gerando…' : 'PDF' }}
        </button>
        <button type="button" class="btn-secondary mpns-btn" @click="$emit('open-full')">
          <ClipboardList aria-hidden="true" />
          Resumo completo
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { ClipboardList, FileDown, Target } from 'lucide-vue-next'
import { formatMacroGrams } from '~/utils/meal-plan-nutrition-report.js'
import { hasLiveMealMacros } from '~/utils/meal-plan-live-macros.js'

const props = defineProps({
  report: { type: Object, required: true },
  loading: { type: String, default: '' },
  pdfLoading: { type: Boolean, default: false },
  canExportPdf: { type: Boolean, default: true },
})

defineEmits(['open-full', 'open-goals', 'open-hydration', 'export-pdf'])

const isEmpty = computed(() => !hasLiveMealMacros(props.report?.macros || {}))

const macroRows = computed(() => {
  const blocks = props.report?.sidebarBlocks || []
  return (props.report?.legend || []).map((item) => {
    const block = blocks.find((entry) => entry.id === item.id)
    return {
      id: item.id,
      tone: item.tone,
      label: item.label,
      percent: item.percent,
      value: block
        ? `${formatMacroGrams(block.grams)} · ${block.kcal} kcal`
        : '—',
    }
  })
})

const exportDisabled = computed(() => {
  if (!props.canExportPdf) return true
  return isEmpty.value
})
</script>

<style scoped>
.mpns-card {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.mpns-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.mpns-card__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-left: auto;
}

.mpns-head-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.85rem !important;
  padding: 0.25rem 0.55rem !important;
  font-size: 0.68rem !important;
  white-space: nowrap;
}

.mpns-head-btn svg,
.mpns-head-btn .cf-hydration-bottle {
  width: 0.8rem;
  height: auto;
  flex-shrink: 0;
}

.mpns-card__title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #2c322c;
  min-width: 0;
}

.mpns-card__title svg {
  width: 0.95rem;
  height: 0.95rem;
  color: #6b7368;
  flex-shrink: 0;
}

.mpns-empty {
  margin: 0;
  font-size: 0.78rem;
  color: #8a9288;
}

.mpns-body {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.mpns-chart {
  display: grid;
  gap: 0.65rem;
  justify-items: center;
}

.mpns-chart--empty {
  padding: 0.35rem 0 0.15rem;
}

.mpns-chart--empty .mpns-donut {
  opacity: 0.55;
}

.mpns-donut {
  width: 6.5rem;
  height: 6.5rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.mpns-donut__hole {
  width: 4.75rem;
  height: 4.75rem;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px #eef1ee;
}

.mpns-donut__hole span {
  font-size: 0.92rem;
  font-weight: 600;
  color: #2c322c;
  line-height: 1.1;
}

.mpns-donut__hole small {
  font-size: 0.62rem;
  color: #8a9288;
}

.mpns-hint {
  margin: 0;
  max-width: 15rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: #8a9288;
  text-align: center;
}

.mpns-macros {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.1rem;
}

.mpns-macro {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 0.15rem 0.45rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f1f3f2;
}

.mpns-macro:last-child {
  border-bottom: none;
}

.mpns-macro__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  align-self: center;
  flex-shrink: 0;
}

.mpns-macro__dot--c { background: #3b82f6; }
.mpns-macro__dot--p { background: #ef4444; }
.mpns-macro__dot--f { background: #eab308; }

.mpns-macro__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #2c322c;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mpns-macro__percent {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2c322c;
  font-variant-numeric: tabular-nums;
}

.mpns-macro__value {
  grid-column: 2 / -1;
  font-size: 0.7rem;
  color: #6b7368;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.mpns-actions {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.4rem;
}

.mpns-btn {
  width: 100%;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.35rem !important;
  padding-inline: 0.7rem !important;
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
}

.mpns-btn svg {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}
</style>
