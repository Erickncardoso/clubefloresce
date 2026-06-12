<template>
  <div class="patient-page resumo-page">
    <PatientHeader title="Resumo da Semana" :subtitle="weekRange" show-back back-to="/check-in" />

    <div class="resumo-ring-wrap">
      <div class="resumo-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" stroke-width="10" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke="#006437" stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="`${score * 2.64} 264`"
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

    <NuxtLink to="/check-in/historico" class="patient-btn">Ver histórico completo</NuxtLink>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const current = ref(null)
const weekRange = ref('')

const scoreLabels = [
  { min: 80, label: 'Muito bom!', msg: 'Você teve uma semana incrível! Pequenas escolhas diárias geram grandes transformações.' },
  { min: 60, label: 'Bom!', msg: 'Boa evolução! Continue cuidando dos seus hábitos.' },
  { min: 0, label: 'Regular', msg: 'Cada semana é uma nova chance. Vamos juntos na próxima!' },
]

const score = computed(() => {
  if (!current.value) return 72
  const vals = [current.value.adherence, current.value.energy, current.value.mood].filter(Boolean)
  if (!vals.length) return 72
  return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 5)) * 100)
})

const scoreLabel = computed(() => scoreLabels.find((s) => score.value >= s.min)?.label || 'Bom!')
const summaryMessage = computed(() => scoreLabels.find((s) => score.value >= s.min)?.msg || '')

const labelFromScore = (v) => {
  if (v >= 5) return { value: 'Excelente', tagClass: 'patient-tag--ok' }
  if (v >= 4) return { value: 'Boa', tagClass: 'patient-tag--ok' }
  if (v >= 3) return { value: 'Regular', tagClass: 'patient-tag--warn' }
  return { value: 'Atenção', tagClass: 'patient-tag--bad' }
}

const summaryItems = computed(() => {
  const c = current.value
  if (!c) {
    return [
      { label: 'Alimentação', value: '—', tagClass: '' },
      { label: 'Atividade física', value: '—', tagClass: '' },
      { label: 'Hidratação', value: '—', tagClass: '' },
      { label: 'Sono', value: '—', tagClass: '' },
    ]
  }
  return [
    { label: 'Alimentação', ...labelFromScore(c.adherence || 3) },
    { label: 'Atividade física', ...labelFromScore(c.mood || 3) },
    { label: 'Hidratação', ...labelFromScore(c.energy || 3) },
    { label: 'Sono', ...labelFromScore(c.mood || 3) },
  ]
})

onMounted(async () => {
  try {
    const data = await $fetch(`${config.public.apiBase}/checkin/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    current.value = data.current
    if (data.current?.weekStart) {
      const start = new Date(data.current.weekStart)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const fmt = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
      weekRange.value = `${fmt(start)} a ${fmt(end)}`
    }
  } catch {
    navigateTo('/check-in/responder')
  }
})
</script>

<style scoped>
.resumo-page {
  padding-top: 0;
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
