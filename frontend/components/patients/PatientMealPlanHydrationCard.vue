<template>
  <article class="mph-card mped-side-card admin-shell-card">
    <header class="mph-card__head">
      <h4 class="mph-card__title">
        <SharedCfHydrationBottleIcon :size="14" />
        Hidratação
      </h4>
      <button
        v-if="hasPrescription"
        type="button"
        class="btn-secondary mph-card__edit"
        @click="$emit('edit-prescription')"
      >
        Editar
      </button>
    </header>

    <template v-if="!hasPrescription">
      <p class="mph-card__empty">
        Sem meta de hidratação. Calculamos a partir do peso, altura, atividade e clima da paciente.
      </p>
      <button type="button" class="btn-secondary mph-card__btn" @click="$emit('edit-prescription')">
        <Droplets aria-hidden="true" />
        Prescrever hidratação
      </button>
    </template>

    <template v-else>
      <p class="mph-card__goal">
        {{ formattedGoal }}<span>por dia</span>
      </p>

      <ul class="mph-card__meta-list">
        <li v-if="scheduleLabel">{{ scheduleLabel }}</li>
        <li v-if="intervalLine">{{ intervalLine }}</li>
      </ul>

      <p v-if="unreadFeedback" class="mph-card__feedback">
        <MessageCircle aria-hidden="true" />
        {{ unreadFeedback }} {{ unreadFeedback === 1 ? 'feedback novo' : 'feedbacks novos' }} da paciente
      </p>

      <button type="button" class="btn-secondary mph-card__btn" @click="$emit('open-full')">
        Ver acompanhamento
      </button>
    </template>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { Droplets, MessageCircle } from 'lucide-vue-next'
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
}

.mph-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mph-card__title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0099ad;
}

.mph-card__edit {
  margin-left: auto;
  min-height: 1.9rem !important;
  padding: 0.25rem 0.6rem !important;
  font-size: 0.72rem !important;
  font-weight: 600 !important;
  flex-shrink: 0;
}

.mph-card__empty {
  margin: 0;
  font-size: 0.76rem;
  color: #6b7368;
  line-height: 1.45;
}

.mph-card__goal {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0099ad;
  letter-spacing: -0.01em;
}

.mph-card__goal span {
  font-size: 0.74rem;
  font-weight: 500;
  color: #9aa39a;
}

.mph-card__meta-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.2rem;
}

.mph-card__meta-list li {
  font-size: 0.74rem;
  color: #6b7368;
  line-height: 1.4;
}

.mph-card__feedback {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0.35rem 0.5rem;
  border-radius: var(--cf-radius-xs);
  background: #fef4e6;
  font-size: 0.72rem;
  font-weight: 600;
  color: #96450a;
}

.mph-card__feedback svg {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

/* Secundário de propósito: o verde cheio da coluna pertence a
   "Salvar e publicar", não a um atalho de leitura. */
.mph-card__btn {
  width: 100%;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.35rem !important;
  font-size: 0.78rem !important;
  font-weight: 600 !important;
}

.mph-card__btn svg {
  width: 0.9rem;
  height: 0.9rem;
}
</style>
