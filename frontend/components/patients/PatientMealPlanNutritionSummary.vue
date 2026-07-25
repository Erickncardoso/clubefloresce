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
      <div class="mpns-chart">
        <div class="mpns-donut" :style="report.ringStyle" aria-hidden="true">
          <div class="mpns-donut__hole">
            <span>{{ report.kcalLabel }}</span>
            <small>Kcal</small>
          </div>
        </div>
        <ul class="mpns-legend">
          <li v-for="item in report.legend" :key="item.id">
            <span class="mpns-legend__dot" :class="`mpns-legend__dot--${item.tone}`" />
            <span class="mpns-legend__label">{{ item.label }}</span>
            <strong>{{ item.percent }}%</strong>
          </li>
        </ul>
      </div>

      <ul class="mpns-macros">
        <li
          v-for="block in report.sidebarBlocks"
          :key="block.id"
          class="mpns-macro"
          :class="`mpns-macro--${block.tone}`"
        >
          <span class="mpns-macro__label">{{ block.label }}</span>
          <span class="mpns-macro__value">{{ formatMacroGrams(block.grams) }} · {{ block.kcal }} Kcal</span>
        </li>
      </ul>

      <button
        type="button"
        class="btn-secondary mpns-pdf-btn"
        :disabled="exportDisabled || pdfLoading"
        @click="$emit('export-pdf')"
      >
        <FileDown aria-hidden="true" />
        {{ pdfLoading ? 'Gerando PDF…' : 'PDF do resumo' }}
      </button>
      <button type="button" class="btn-primary mpns-full-btn" @click="$emit('open-full')">
        <ClipboardList aria-hidden="true" />
        Resumo completo
      </button>
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

const exportDisabled = computed(() => {
  if (!props.canExportPdf) return true
  return !hasLiveMealMacros(props.report?.macros || {})
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

.mpns-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: grid;
  gap: 0.3rem;
}

.mpns-legend li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: #5f675f;
}

.mpns-legend__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.mpns-legend__dot--c { background: #3b82f6; }
.mpns-legend__dot--p { background: #ef4444; }
.mpns-legend__dot--f { background: #eab308; }

.mpns-legend__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mpns-legend strong {
  font-size: 0.7rem;
  font-weight: 600;
  color: #2c322c;
}

.mpns-macros {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.mpns-macro {
  display: grid;
  gap: 0.15rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid #eef1ee;
  border-radius: var(--cf-radius-control);
  background: #fafbfa;
}

.mpns-macros .mpns-macro:last-child {
  padding-bottom: 0.45rem;
}

.mpns-macro__label {
  font-size: 0.68rem;
  font-weight: 500;
}

.mpns-macro--c .mpns-macro__label { color: #2563eb; }
.mpns-macro--p .mpns-macro__label { color: #dc2626; }
.mpns-macro--f .mpns-macro__label { color: #b45309; }

.mpns-macro__value {
  font-size: 0.72rem;
  font-weight: 500;
  color: #2c322c;
  line-height: 1.3;
  word-break: break-word;
}

.mpns-full-btn,
.mpns-pdf-btn {
  width: 100%;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.35rem !important;
  font-size: 0.8125rem !important;
}

.mpns-full-btn svg,
.mpns-pdf-btn svg {
  width: 0.95rem;
  height: 0.95rem;
}
</style>
