<template>
  <div class="patient-page resumo-page">
    <PatientHeader title="Resumo da Semana" :subtitle="weekRange" show-back back-to="/check-in" />

    <div v-if="loading" class="resumo-loading">
      <PatientPageSkeleton layout="checkin" />
    </div>

    <template v-else-if="current">
      <div class="resumo-ring-wrap">
        <div class="resumo-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" stroke-width="10" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="#006437" stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="`${score} 264`"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div class="resumo-ring-text">
            <strong>{{ score }}%</strong>
            <span>{{ scoreLabel }}</span>
          </div>
        </div>
      </div>

      <p class="resumo-message">{{ summaryMessage }}</p>

      <ul class="resumo-list">
        <li v-for="item in summaryItems" :key="item.label">
          <span>{{ item.label }}</span>
          <span class="patient-tag" :class="item.tagClass">{{ item.value }}</span>
        </li>
      </ul>
    </template>

    <p v-else class="resumo-empty">Você ainda não respondeu o check-in desta semana.</p>

    <NuxtLink to="/check-in/historico" class="patient-btn">Ver histórico completo</NuxtLink>
  </div>
</template>

<script setup>
import {
  buildAnswerRows,
  formatCheckinPeriod,
  scoreFromTemplateAnswers,
} from '~/utils/checkin-answers'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const { patientTimeHeaders } = usePatientLocalTime()
const current = ref(null)
const weekRange = ref('')
const loading = ref(true)

const scoreLabels = [
  { min: 80, label: 'Muito bom!', msg: 'Você teve uma semana incrível! Pequenas escolhas diárias geram grandes transformações.' },
  { min: 60, label: 'Bom!', msg: 'Boa evolução! Continue cuidando dos seus hábitos.' },
  { min: 0, label: 'Regular', msg: 'Cada semana é uma nova chance. Vamos juntos na próxima!' },
]

const score = computed(() => {
  const value = scoreFromTemplateAnswers(current.value?.answers)
  return value ?? 0
})

const scoreLabel = computed(() => scoreLabels.find((s) => score.value >= s.min)?.label || 'Bom!')
const summaryMessage = computed(() => scoreLabels.find((s) => score.value >= s.min)?.msg || '')

const tagFromText = (text) => {
  const value = String(text || '')
  if (value.includes('Excelente') || value.includes('Boa') || value.includes('Sim')) {
    return 'patient-tag--ok'
  }
  if (value.includes('Regular') || value.includes('copos') || value.includes(' L')) {
    return 'patient-tag--warn'
  }
  if (value.includes('Ruim') || value.includes('Péssimo') || value.includes('Não')) {
    return 'patient-tag--bad'
  }
  return ''
}

const summaryItems = computed(() => {
  const steps = current.value?.template?.steps
  const answers = current.value?.answers
  if (!steps || !answers) return []

  return buildAnswerRows(steps, answers).map((row) => ({
    label: row.label,
    value: row.value,
    tagClass: tagFromText(row.value),
  }))
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await $fetch(`${config.public.apiBase}/checkin/me/responses`, {
      headers: patientTimeHeaders(),
    })
    const responses = data.responses || []
    current.value = responses[0] || null

    if (current.value) {
      weekRange.value = formatCheckinPeriod(
        current.value.periodKey,
        current.value.template?.frequency,
      )
    }
  } catch {
    navigateTo('/check-in')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.resumo-page {
  padding-top: 0;
}

.resumo-loading {
  margin: 1rem 0;
}

.resumo-empty {
  text-align: center;
  color: var(--pa-text-muted);
  margin: 2rem 0;
}

.resumo-ring-wrap {
  display: flex;
  justify-content: center;
  margin: 1rem 0 1.5rem;
}

.resumo-ring {
  position: relative;
  width: 9rem;
  height: 9rem;
}

.resumo-ring svg {
  width: 100%;
  height: 100%;
}

.resumo-ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.resumo-ring-text strong {
  font-size: 1.75rem;
  color: var(--pa-green);
}

.resumo-ring-text span {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--pa-text-muted);
}

.resumo-message {
  text-align: center;
  font-size: 0.92rem;
  color: var(--pa-text-muted);
  line-height: 1.55;
  margin: 0 0 1.5rem;
}

.resumo-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  border: 1px solid var(--pa-border);
  border-radius: var(--pa-radius);
  overflow: hidden;
}

.resumo-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid var(--pa-border);
  font-size: 0.92rem;
  font-weight: 600;
}

.resumo-list li:last-child {
  border-bottom: none;
}
</style>
