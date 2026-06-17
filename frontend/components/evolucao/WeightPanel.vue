<template>
  <div class="evo-weight">
    <form class="evo-weight-form cf-squircle" @submit.prevent="saveWeight">
      <h3>Registrar peso</h3>
      <div class="evo-weight-row">
        <input v-model="weightInput" type="number" step="0.1" min="20" max="500" placeholder="Ex: 68.5" />
        <span>kg</span>
        <button type="submit" class="evo-weight-save" :disabled="saving">Salvar</button>
      </div>
      <p v-if="formError" class="evo-weight-error">{{ formError }}</p>
    </form>

    <div v-if="loading" class="evo-weight-loading">Carregando histórico…</div>

    <div v-else-if="!entries.length" class="evo-weight-empty cf-squircle">
      <p>Seus registros de peso aparecem aqui após o check-in semanal.</p>
    </div>

    <ul v-else class="evo-weight-list">
      <li v-for="entry in entries" :key="entry.id" class="evo-weight-item cf-squircle">
        <div>
          <strong>{{ formatWeight(entry.weightKg) }} kg</strong>
          <span>{{ formatWeek(entry.weekStart) }}</span>
        </div>
        <span v-if="entry.delta != null" class="evo-weight-delta" :class="{ 'evo-weight-delta--down': entry.delta < 0, 'evo-weight-delta--up': entry.delta > 0 }">
          {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta.toFixed(1) }} kg
        </span>
      </li>
    </ul>

    <section class="evo-measures cf-squircle">
      <h3>Medidas corporais</h3>
      <p class="evo-measures-note">Em breve você poderá registrar cintura, quadril e outras medidas com a nutri.</p>
    </section>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const { patientTimeHeaders } = usePatientLocalTime()

const loading = ref(true)
const saving = ref(false)
const formError = ref('')
const weightInput = ref('')
const entries = ref([])

function formatWeight(value) {
  return Number(value).toFixed(1).replace('.0', '')
}

function formatWeek(value) {
  const date = new Date(value)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadHistory() {
  loading.value = true
  try {
    const data = await $fetch(`${config.public.apiBase}/checkin/me`, { headers: patientTimeHeaders() })
    const rows = []
    if (data.current?.weightKg != null) rows.push(data.current)
    for (const item of data.history || []) {
      if (item.weightKg != null) rows.push(item)
    }

    const sorted = rows
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
      .slice(0, 12)

    entries.value = sorted.map((row, index) => {
      const prev = sorted[index + 1]
      const delta = prev?.weightKg != null ? row.weightKg - prev.weightKg : null
      return { ...row, delta }
    })
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
}

async function saveWeight() {
  formError.value = ''
  const weight = Number(weightInput.value)
  if (!Number.isFinite(weight) || weight <= 0) {
    formError.value = 'Informe um peso válido.'
    return
  }

  saving.value = true
  try {
    const current = await $fetch(`${config.public.apiBase}/checkin/me`, { headers: patientTimeHeaders() })
    await $fetch(`${config.public.apiBase}/checkin`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        mood: current.current?.mood || 3,
        energy: current.current?.energy || 3,
        adherence: current.current?.adherence ?? 3,
        weightKg: weight,
        notes: current.current?.notes || '',
      },
    })
    weightInput.value = ''
    await loadHistory()
  } catch (error) {
    formError.value = error?.data?.message || 'Não foi possível salvar o peso.'
  } finally {
    saving.value = false
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.evo-weight {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.evo-weight-form,
.evo-weight-empty,
.evo-measures {
  padding: 1rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
}

.evo-weight-form h3,
.evo-measures h3 {
  margin: 0 0 0.65rem;
  font-size: 0.92rem;
}

.evo-weight-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.evo-weight-row input {
  flex: 1;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  font-size: 0.9rem;
}

.evo-weight-save {
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: var(--cf-green);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.evo-weight-error {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--pa-red, #d64545);
}

.evo-weight-loading {
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.evo-weight-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.evo-weight-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
}

.evo-weight-item strong {
  display: block;
  font-size: 0.95rem;
}

.evo-weight-item span {
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.evo-weight-delta {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--cf-text-muted);
}

.evo-weight-delta--down {
  color: var(--cf-green-dark);
}

.evo-weight-delta--up {
  color: #c4842e;
}

.evo-measures-note {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}
</style>
