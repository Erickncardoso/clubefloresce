<template>
  <article class="mph-card mped-side-card admin-shell-card" @click="$emit('open-full')">
    <header class="mph-card__head">
      <h4 class="mph-card__title">
        <SharedCfHydrationBottleIcon :size="14" />
        Hidratação
      </h4>
      <button type="button" class="btn-secondary mph-card__edit" @click.stop="$emit('edit-prescription')">
        Prescrever
      </button>
    </header>

    <p v-if="!hasPrescription" class="mph-card__empty">
      Meta calculada a partir do peso, altura, atividade e clima.
    </p>

    <template v-else>
      <p class="mph-card__goal">
        {{ formattedGoal }}<span>/dia</span>
      </p>
      <p v-if="scheduleLabel" class="mph-card__meta">{{ scheduleLabel }}</p>
      <p v-if="intervalLine" class="mph-card__meta">{{ intervalLine }}</p>
      <p v-if="unreadFeedback" class="mph-card__feedback">
        {{ unreadFeedback }} feedback(s) da paciente
      </p>
    </template>

    <button type="button" class="btn-primary mph-card__btn" @click.stop="$emit('open-full')">
      Ver acompanhamento
    </button>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import {
  computeHydrationGoal,
  formatHydrationAmount,
  normalizeHydrationPrescription,
} from '~/utils/meal-plan-hydration.js'
import {
  formatHydrationCups,
  hydrationPerReminder,
  unreadHydrationFeedbackCount,
} from '~/utils/meal-plan-hydration-tracking.js'

const props = defineProps({
  prescription: { type: Object, default: null },
  feedback: { type: Array, default: () => [] },
})

defineEmits(['open-full', 'edit-prescription'])

const normalized = computed(() => normalizeHydrationPrescription(props.prescription))
const hasPrescription = computed(() => Boolean(
  props.prescription && (computeHydrationGoal(normalized.value) > 0 || normalized.value.notes),
))

const formattedGoal = computed(() => formatHydrationAmount(
  computeHydrationGoal(normalized.value),
  normalized.value.unit,
))

const scheduleLabel = computed(() => (
  normalized.value.scheduleMode === 'daily' ? 'Prescrição diária' : 'Prescrição semanal'
))

const intervalLine = computed(() => {
  if (!normalized.value.useConsumptionWindow) return ''
  const ml = hydrationPerReminder(
    computeHydrationGoal(normalized.value),
    normalized.value.wakeTime,
    normalized.value.bedTime,
    normalized.value.intervalHours,
  )
  if (!ml) return ''
  return `Lembretes: ${formatHydrationAmount(ml, normalized.value.unit)} · ${formatHydrationCups(ml)}`
})

const unreadFeedback = computed(() => unreadHydrationFeedbackCount(props.feedback))
</script>

<style scoped>
.mph-card {
  display: grid;
  gap: 0.55rem;
  padding: 0.85rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.mph-card:hover {
  border-color: #cfe3cb;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.mph-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mph-card__title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.84rem;
  color: #0099ad;
}

.mph-card__edit {
  min-height: 1.85rem !important;
  padding: 0.2rem 0.55rem !important;
  font-size: 0.72rem !important;
}

.mph-card__empty,
.mph-card__meta {
  margin: 0;
  font-size: 0.76rem;
  color: #6b7368;
  line-height: 1.4;
}

.mph-card__goal {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #0099ad;
}

.mph-card__goal span {
  font-size: 0.78rem;
  font-weight: 400;
  color: #9ca3af;
}

.mph-card__feedback {
  margin: 0;
  font-size: 0.74rem;
  color: #b45309;
}

.mph-card__btn {
  width: 100%;
  min-height: 2.35rem !important;
  font-size: 0.78rem !important;
}
</style>
