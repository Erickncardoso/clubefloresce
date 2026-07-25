<template>
  <Teleport to="body">
    <div v-if="open" class="mpht-modal" role="dialog" aria-modal="true" aria-labelledby="mpht-title">
      <div class="mpht-modal__backdrop" aria-hidden="true" @click="close" />
      <div class="modal-card mpht-modal__panel admin-shell admin-shell-card" @click.stop>
        <header class="mpht-head">
          <div>
            <h2 id="mpht-title">Acompanhamento de hidratação</h2>
            <p>{{ weekRangeLabel }}</p>
          </div>
          <div class="mpht-head__actions">
            <button type="button" class="btn-secondary mpht-btn" @click="$emit('edit-prescription')">
              Editar prescrição
            </button>
            <button type="button" class="mpht-close" aria-label="Fechar" @click="close">
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <div class="mpht-week-nav">
          <button type="button" class="mpht-week-btn" @click="shiftWeek(-1)">‹</button>
          <span>Semana</span>
          <button type="button" class="mpht-week-btn" @click="shiftWeek(1)">›</button>
        </div>

        <div class="mpht-chart" aria-label="Consumo hídrico da semana">
          <div v-for="day in weekDays" :key="day.date" class="mpht-bar-col">
            <div class="mpht-bar-stack">
              <div
                v-if="day.surplusMl"
                class="mpht-bar mpht-bar--surplus"
                :style="{ height: barHeight(day.surplusMl) }"
                :title="`Acima da meta: ${formatMl(day.surplusMl)}`"
              />
              <div
                class="mpht-bar mpht-bar--consumed"
                :style="{ height: barHeight(Math.min(day.consumedMl, day.goalMl || day.consumedMl)) }"
                :title="`Consumido: ${formatMl(day.consumedMl)}`"
              />
              <div
                v-if="day.deficitMl && day.goalMl"
                class="mpht-bar mpht-bar--deficit"
                :style="{ height: barHeight(day.deficitMl) }"
                :title="`Faltou: ${formatMl(day.deficitMl)}`"
              />
            </div>
            <span class="mpht-bar-label">{{ day.label }}</span>
            <span v-if="day.prescriptionChanged" class="mpht-bar-flag" title="Meta diferente da prescrição atual">≠</span>
          </div>
        </div>

        <ul class="mpht-legend">
          <li><span class="mpht-dot mpht-dot--consumed" /> Consumido</li>
          <li><span class="mpht-dot mpht-dot--deficit" /> Faltou</li>
          <li><span class="mpht-dot mpht-dot--surplus" /> Acima da meta</li>
        </ul>

        <section class="mpht-feedback">
          <header class="mpht-feedback__head">
            <h3>Feedback da paciente</h3>
            <span v-if="unreadCount" class="mpht-feedback__badge">{{ unreadCount }} nova(s)</span>
          </header>
          <p v-if="!feedbackItems.length" class="mpht-feedback__empty">
            Nenhum feedback enviado pelo app ainda.
          </p>
          <ul v-else class="mpht-feedback__list">
            <li
              v-for="item in feedbackItems"
              :key="item.id"
              class="mpht-feedback__item"
              :class="{ 'mpht-feedback__item--unread': !item.readAt }"
            >
              <p>{{ item.message }}</p>
              <small>{{ formatDateTime(item.createdAt) }}</small>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { formatHydrationAmount, normalizeHydrationPrescription } from '~/utils/meal-plan-hydration.js'
import {
  addDays,
  buildHydrationWeekDays,
  formatWeekRangeLabel,
  markHydrationFeedbackRead,
  sortHydrationFeedback,
  startOfWeek,
  unreadHydrationFeedbackCount,
} from '~/utils/meal-plan-hydration-tracking.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  prescription: { type: Object, default: null },
  logs: { type: Array, default: () => [] },
  feedback: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'edit-prescription', 'mark-feedback-read'])

const weekStart = ref(startOfWeek())

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  weekStart.value = startOfWeek()
  if (props.feedback?.length) {
    emit('mark-feedback-read', markHydrationFeedbackRead(props.feedback))
  }
})

const normalizedPrescription = computed(() => normalizeHydrationPrescription(props.prescription))
const weekDays = computed(() => buildHydrationWeekDays(weekStart.value, normalizedPrescription.value, props.logs))
const weekRangeLabel = computed(() => formatWeekRangeLabel(weekStart.value))
const feedbackItems = computed(() => sortHydrationFeedback(props.feedback))
const unreadCount = computed(() => unreadHydrationFeedbackCount(props.feedback))

const maxBarMl = computed(() => {
  const values = weekDays.value.flatMap((day) => [day.consumedMl, day.goalMl, day.surplusMl])
  return Math.max(500, ...values, 1)
})

function barHeight(ml) {
  const ratio = Math.min(1, (Number(ml) || 0) / maxBarMl.value)
  return `${Math.max(ratio * 100, ml > 0 ? 6 : 0)}%`
}

function formatMl(ml) {
  return formatHydrationAmount(ml, normalizedPrescription.value.unit || 'ml')
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shiftWeek(delta) {
  weekStart.value = addDays(weekStart.value, delta * 7)
}

function close() {
  emit('update:open', false)
}
</script>

<style scoped>
.mpht-modal {
  position: fixed;
  inset: 0;
  z-index: 6150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mpht-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
}

.mpht-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 42rem);
  max-height: 90vh;
  overflow: auto;
  padding: 1.15rem;
}

.mpht-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.mpht-head h2 {
  margin: 0;
  font-size: 1rem;
  color: #2c322c;
}

.mpht-head p {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
}

.mpht-head__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.mpht-close {
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
  background: #fff;
  cursor: pointer;
}

.mpht-btn {
  min-height: 2.25rem !important;
  font-size: 0.78rem !important;
}

.mpht-week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  font-size: 0.82rem;
  color: #374151;
}

.mpht-week-btn {
  width: 2rem;
  height: 2rem;
  border: 1px solid #e2e8e4;
  background: #f8faf8;
  cursor: pointer;
}

.mpht-chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.45rem;
  min-height: 12rem;
  padding: 0.75rem;
  border: 1px solid #eef1ee;
  background: #fafbfa;
  border-radius: var(--cf-radius-control);
}

.mpht-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.mpht-bar-stack {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  height: 9rem;
  gap: 1px;
}

.mpht-bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  min-height: 2px;
}

.mpht-bar--consumed { background: #00b2ca; }
.mpht-bar--deficit { background: #dbeafe; }
.mpht-bar--surplus { background: #fcd34d; }

.mpht-bar-label {
  font-size: 0.62rem;
  color: #6b7368;
  text-align: center;
  line-height: 1.2;
}

.mpht-bar-flag {
  font-size: 0.62rem;
  color: #b45309;
  font-weight: 700;
}

.mpht-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.65rem 0 1rem;
  padding: 0;
  list-style: none;
  font-size: 0.72rem;
  color: #6b7368;
}

.mpht-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.mpht-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
}

.mpht-dot--consumed { background: #00b2ca; }
.mpht-dot--deficit { background: #dbeafe; }
.mpht-dot--surplus { background: #fcd34d; }

.mpht-feedback__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.mpht-feedback__head h3 {
  margin: 0;
  font-size: 0.88rem;
  color: #2c322c;
}

.mpht-feedback__badge {
  font-size: 0.68rem;
  color: #b45309;
  background: #fff7ed;
  padding: 0.15rem 0.45rem;
  border-radius: var(--cf-radius-pill);
}

.mpht-feedback__empty {
  margin: 0;
  font-size: 0.78rem;
  color: #6b7368;
}

.mpht-feedback__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.mpht-feedback__item {
  padding: 0.65rem 0.75rem;
  border: 1px solid #eef1ee;
  background: #fff;
  border-radius: var(--cf-radius-control);
}

.mpht-feedback__item--unread {
  border-color: #bae6fd;
  background: #f0f9ff;
}

.mpht-feedback__item p {
  margin: 0;
  font-size: 0.8rem;
  color: #374151;
}

.mpht-feedback__item small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.68rem;
  color: #9ca3af;
}
</style>
