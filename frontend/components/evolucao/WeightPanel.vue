<template>
  <div class="evo-weight">
    <div v-if="!loading && latestEntry" class="evo-weight-hero">
      <p class="evo-weight-hero-label">Peso atual</p>
      <p class="evo-weight-hero-value">
        <strong>{{ formatWeight(latestEntry.weightKg) }}</strong>
        <span>kg</span>
      </p>
      <p v-if="latestEntry.delta != null" class="evo-weight-hero-delta" :class="deltaClass(latestEntry.delta)">
        {{ latestEntry.delta > 0 ? '+' : '' }}{{ latestEntry.delta.toFixed(1) }} kg vs. último registro
      </p>
    </div>

    <form class="evo-weight-form" @submit.prevent="saveWeight">
      <h3>Registrar peso</h3>
      <p class="evo-weight-hint">Deslize a régua até o peso de hoje.</p>
      <SharedWeightRulerPicker v-if="!loading" v-model="weightValue" />
      <div class="evo-weight-actions">
        <button type="submit" class="evo-weight-save" :disabled="saving || weightValue == null">
          {{ saving ? 'Salvando…' : 'Salvar peso' }}
        </button>
      </div>
      <p v-if="saveSuccess" class="evo-weight-success">Peso salvo com sucesso.</p>
      <p v-if="formError" class="evo-weight-error">{{ formError }}</p>
    </form>

    <div v-if="loading" class="evo-weight-loading">Carregando histórico…</div>

    <div v-else-if="!entries.length" class="evo-weight-empty">
      <p>Seus registros de peso aparecem aqui após o check-in semanal.</p>
    </div>

    <section v-else class="evo-weight-history">
      <h3 class="evo-weight-history-title">Histórico</h3>
      <ul class="evo-weight-list">
        <li v-for="entry in entries" :key="entry.id" class="evo-weight-item">
          <div class="evo-weight-item-main">
            <strong>{{ formatWeight(entry.weightKg) }} kg</strong>
            <span>{{ formatRecordedAt(entry) }}</span>
          </div>
          <span
            v-if="entry.delta != null"
            class="evo-weight-delta"
            :class="{ 'evo-weight-delta--down': entry.delta < 0, 'evo-weight-delta--up': entry.delta > 0 }"
          >
            {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta.toFixed(1) }}
          </span>
        </li>
      </ul>
    </section>

    <section class="evo-measures">
      <h3>Medidas corporais</h3>
      <p class="evo-measures-note">Em breve você poderá registrar cintura, quadril e outras medidas com a nutri.</p>
    </section>
  </div>
</template>

<script setup>
import { formatPatientDateLabel } from '~/utils/local-date'

const config = useRuntimeConfig()
const { patientFetchInit } = usePatientLocalTime()

const loading = ref(true)
const saving = ref(false)
const formError = ref('')
const saveSuccess = ref(false)
const weightValue = ref(null)
const entries = ref([])

let saveSuccessTimer = null

const latestEntry = computed(() => entries.value[0] || null)

function formatWeight(value) {
  return Number(value).toFixed(1).replace('.0', '')
}

function formatRecordedAt(entry) {
  const stamp = entry?.updatedAt || entry?.createdAt || entry?.weekStart
  return formatPatientDateLabel(stamp)
}

function deltaClass(delta) {
  if (delta < 0) return 'evo-weight-hero-delta--down'
  if (delta > 0) return 'evo-weight-hero-delta--up'
  return ''
}

async function loadHistory({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const data = await $fetch(`${config.public.apiBase}/checkin/me`, patientFetchInit())
    const seen = new Set()
    const rows = []

    const pushRow = (item) => {
      if (item?.weightKg == null) return
      const key = item.id || String(item.weekStart)
      if (seen.has(key)) return
      seen.add(key)
      rows.push(item)
    }

    if (data.current) pushRow(data.current)
    for (const item of data.history || []) pushRow(item)

    const sorted = rows
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || a.weekStart).getTime()
        const bTime = new Date(b.updatedAt || b.createdAt || b.weekStart).getTime()
        return bTime - aTime
      })
      .slice(0, 12)

    entries.value = sorted.map((row, index) => {
      const prev = sorted[index + 1]
      const delta = prev?.weightKg != null ? row.weightKg - prev.weightKg : null
      return { ...row, delta }
    })

    const latest = sorted[0]?.weightKg
    weightValue.value = latest != null ? latest : 70
  } catch {
    entries.value = []
    weightValue.value = 70
  } finally {
    if (!silent) loading.value = false
  }
}

async function saveWeight() {
  formError.value = ''
  saveSuccess.value = false
  const weight = Number(weightValue.value)
  if (!Number.isFinite(weight) || weight <= 0) {
    formError.value = 'Informe um peso válido.'
    return
  }

  saving.value = true
  try {
    const current = await $fetch(`${config.public.apiBase}/checkin/me`, patientFetchInit())
    await $fetch(`${config.public.apiBase}/checkin`, patientFetchInit({
      method: 'POST',
      body: {
        mood: current.current?.mood || 3,
        energy: current.current?.energy || 3,
        adherence: current.current?.adherence ?? 3,
        weightKg: weight,
        notes: current.current?.notes || '',
      },
    }))
    await loadHistory({ silent: true })
    saveSuccess.value = true
    if (saveSuccessTimer) clearTimeout(saveSuccessTimer)
    saveSuccessTimer = setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error) {
    formError.value = error?.data?.message || 'Não foi possível salvar o peso.'
  } finally {
    saving.value = false
  }
}

onMounted(loadHistory)

onBeforeUnmount(() => {
  if (saveSuccessTimer) clearTimeout(saveSuccessTimer)
})
</script>

<style scoped>
.evo-weight {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evo-weight-hero {
  padding: 1.05rem 1.1rem;
  border-radius: 1.35rem;
  border: none;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.evo-weight-hero-label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.evo-weight-hero-value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin: 0.25rem 0 0.35rem;
}

.evo-weight-hero-value strong {
  font-size: 2rem;
  line-height: 1;
  font-weight: 800;
  color: var(--cf-text);
}

.evo-weight-hero-value span {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.evo-weight-hero-delta {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.evo-weight-hero-delta--down {
  color: var(--cf-green-dark);
}

.evo-weight-hero-delta--up {
  color: #c4842e;
}

.evo-weight-form,
.evo-weight-empty,
.evo-measures {
  padding: 1.05rem 1.1rem;
  border-radius: 1.35rem;
  border: none;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.evo-weight-form h3,
.evo-measures h3,
.evo-weight-history-title {
  margin: 0 0 0.65rem;
  font-size: 0.92rem;
}

.evo-weight-hint {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.evo-weight-actions {
  margin-top: 0.85rem;
}

.evo-weight-save {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-green-dark);
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.evo-weight-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.evo-weight-error {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--pa-red, #d64545);
}

.evo-weight-success {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--cf-green-dark);
  font-weight: 600;
}

.evo-weight-loading {
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.evo-weight-history-title {
  margin-bottom: 0.55rem;
}

.evo-weight-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 1.35rem;
  border: none;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.evo-weight-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.95rem;
  border-bottom: 1px solid rgba(28, 24, 22, 0.06);
}

.evo-weight-item:last-child {
  border-bottom: none;
}

.evo-weight-item-main strong {
  display: block;
  font-size: 0.92rem;
}

.evo-weight-item-main span {
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.evo-weight-delta {
  min-width: 2.5rem;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: #f3f3f3;
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
  color: var(--cf-text-muted);
}

.evo-weight-delta--down {
  background: #eef5eb;
  color: var(--cf-green-dark);
}

.evo-weight-delta--up {
  background: #fdf4e8;
  color: #c4842e;
}

.evo-measures-note {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}
</style>
