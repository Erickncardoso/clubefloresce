<template>
  <div class="evo-weight">
    <div v-if="!loading && (startWeight != null || targetWeight != null)" class="evo-weight-goal">
      <div class="evo-weight-goal-side">
        <span class="evo-weight-goal-label">Início</span>
        <span>{{ startWeight != null ? `${formatWeight(startWeight)} kg` : '—' }}</span>
      </div>
      <ArrowRight class="evo-weight-goal-arrow" aria-hidden="true" />
      <div class="evo-weight-goal-side">
        <span class="evo-weight-goal-label">Meta</span>
        <span class="is-target">{{ targetWeight != null ? `${formatWeight(targetWeight)} kg` : '—' }}</span>
      </div>
    </div>

    <section class="evo-weight-card">
      <p class="evo-weight-chart-title">Progresso do peso (kg)</p>
      <div class="evo-weight-segment" role="tablist" aria-label="Período do gráfico">
        <button
          type="button"
          class="evo-weight-segment-btn"
          :class="{ 'is-active': chartMode === 'days' }"
          role="tab"
          :aria-selected="chartMode === 'days'"
          @click="chartMode = 'days'"
        >
          Dias
        </button>
        <button
          type="button"
          class="evo-weight-segment-btn"
          :class="{ 'is-active': chartMode === 'months' }"
          role="tab"
          :aria-selected="chartMode === 'months'"
          @click="chartMode = 'months'"
        >
          Meses
        </button>
      </div>
      <div v-if="loading" class="evo-weight-loading">Carregando…</div>
      <EvolucaoWeightProgressChart v-else :points="chartPoints" :goal-kg="targetWeight" />
    </section>

    <section class="evo-weight-history">
      <h3>Histórico</h3>
      <div v-if="loading" class="evo-weight-loading">Carregando histórico…</div>
      <p v-else-if="!entries.length" class="evo-weight-empty">
        Seus registros de peso aparecem aqui após o check-in semanal.
      </p>
      <template v-else>
        <div class="evo-weight-history-head">
          <span>Peso</span>
          <span class="is-center">Alterar</span>
          <span class="is-right">Data</span>
        </div>
        <ul class="evo-weight-list">
          <li v-for="entry in entries" :key="entry.id || entry.weekStart" class="evo-weight-item">
            <div class="evo-weight-item-main">
              <span class="evo-weight-item-icon" aria-hidden="true">
                <Scale class="evo-weight-item-icon-svg" />
              </span>
              <strong>{{ formatWeight(entry.weightKg) }} kg</strong>
            </div>
            <span
              class="evo-weight-delta"
              :class="{
                'evo-weight-delta--down': entry.delta != null && entry.delta < 0,
                'evo-weight-delta--up': entry.delta != null && entry.delta > 0,
              }"
            >
              {{ entry.delta == null ? '—' : `${entry.delta > 0 ? '+' : ''}${entry.delta.toFixed(1)}` }}
            </span>
            <span class="evo-weight-date">{{ formatHistoryDate(entry) }}</span>
          </li>
        </ul>
      </template>
    </section>

    <button type="button" class="evo-weight-register" @click="openRegister">
      <Plus class="evo-weight-register-icon" aria-hidden="true" />
      Registrar peso
    </button>

    <Teleport to="body">
      <Transition name="weight-sheet-fade">
        <button
          v-if="sheetOpen"
          type="button"
          class="evo-weight-sheet-backdrop"
          aria-label="Fechar"
          @click="closeRegister"
        />
      </Transition>
      <Transition name="weight-sheet-slide">
        <section v-if="sheetOpen" class="evo-weight-sheet" role="dialog" aria-modal="true">
          <div class="evo-weight-sheet-handle" aria-hidden="true" />
          <h4>Registrar peso</h4>
          <p class="evo-weight-hint">Deslize a régua até o peso de hoje.</p>
          <SharedWeightRulerPicker v-if="!loading" v-model="weightValue" />
          <button type="button" class="evo-weight-save" :disabled="saving || weightValue == null" @click="saveWeight">
            {{ saving ? 'Salvando…' : weightValue != null ? `Salvar ${formatWeight(weightValue)} kg` : 'Salvar peso' }}
          </button>
          <button type="button" class="evo-weight-cancel" @click="closeRegister">Cancelar</button>
          <p v-if="formError" class="evo-weight-error" role="alert">{{ formError }}</p>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ArrowRight, Plus, Scale } from 'lucide-vue-next'
import {
  buildDaySeries,
  buildMonthSeries,
  entryDate,
  formatWeightDisplay,
  formatWeightHistoryDate,
} from '~/utils/weight-progress'

const config = useRuntimeConfig()
const { patientFetchInit } = usePatientLocalTime()

const loading = ref(true)
const saving = ref(false)
const sheetOpen = ref(false)
const formError = ref('')
const saveSuccess = ref(false)
const weightValue = ref(null)
const entries = ref([])
const chartMode = ref('days')
const profile = ref({ weightKg: null, targetWeightKg: null })

let saveSuccessTimer = null

const latestEntry = computed(() => entries.value[0] || null)
const targetWeight = computed(() => profile.value.targetWeightKg ?? null)
const startWeight = computed(() => {
  if (profile.value.weightKg != null) return profile.value.weightKg
  if (!entries.value.length) return latestEntry.value?.weightKg ?? null
  const oldest = [...entries.value].sort(
    (a, b) => entryDate(a).getTime() - entryDate(b).getTime(),
  )[0]
  return oldest?.weightKg ?? null
})
const chartPoints = computed(() => (
  chartMode.value === 'days' ? buildDaySeries(entries.value) : buildMonthSeries(entries.value)
))

function formatWeight(value) {
  return formatWeightDisplay(value)
}

function formatHistoryDate(entry) {
  return formatWeightHistoryDate(entry?.updatedAt || entry?.createdAt || entry?.weekStart)
}

async function loadProfile() {
  try {
    const data = await $fetch(`${config.public.apiBase}/patient-profile/me`, patientFetchInit())
    profile.value = {
      weightKg: data?.profile?.weightKg ?? null,
      targetWeightKg: data?.profile?.targetWeightKg ?? null,
    }
  } catch {
    profile.value = { weightKg: null, targetWeightKg: null }
  }
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
      .sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime())
      .slice(0, 12)

    entries.value = sorted.map((row, index) => {
      const prev = sorted[index + 1]
      const delta = prev?.weightKg != null ? row.weightKg - prev.weightKg : null
      return { ...row, delta }
    })

    const latest = sorted[0]?.weightKg
    weightValue.value = latest != null ? latest : profile.value.weightKg ?? 70
  } catch {
    entries.value = []
    weightValue.value = profile.value.weightKg ?? 70
  } finally {
    if (!silent) loading.value = false
  }
}

function openRegister() {
  formError.value = ''
  sheetOpen.value = true
}

function closeRegister() {
  sheetOpen.value = false
  formError.value = ''
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
    closeRegister()
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

onMounted(async () => {
  await loadProfile()
  await loadHistory()
})

onBeforeUnmount(() => {
  if (saveSuccessTimer) clearTimeout(saveSuccessTimer)
})
</script>

<style scoped>
.evo-weight {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding-bottom: 0.5rem;
}

.evo-weight-goal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.35rem;
  border-radius: 999px;
  background: var(--cf-green-dark);
  color: rgba(255, 255, 255, 0.72);
  font-size: 1.05rem;
  font-weight: 600;
}

.evo-weight-goal-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  text-align: center;
}

.evo-weight-goal-label {
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.evo-weight-goal-side .is-target {
  color: #fff;
}

.evo-weight-goal-arrow {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.55);
}

.evo-weight-card,
.evo-weight-history {
  padding: 1rem;
  border: 1px solid #ececee;
  border-radius: 1.25rem;
  background: #fff;
}

.evo-weight-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.evo-weight-chart-title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: #8a8a8e;
}

.evo-weight-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem;
  padding: 0.18rem;
  border-radius: 0.75rem;
  background: #f2f2f4;
}

.evo-weight-segment-btn {
  min-height: 2.1rem;
  border: none;
  border-radius: 0.55rem;
  background: transparent;
  color: #8a8a8e;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
}

.evo-weight-segment-btn.is-active {
  background: #fff;
  color: var(--cf-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.evo-weight-history h3 {
  margin: 0 0 0.75rem;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.evo-weight-history-head {
  display: grid;
  grid-template-columns: 1fr 4.5rem 4.5rem;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  padding-inline: 0.25rem;
  font-size: 0.75rem;
  color: #b0b0b4;
}

.evo-weight-history-head .is-center {
  text-align: center;
}

.evo-weight-history-head .is-right {
  text-align: right;
}

.evo-weight-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #ececee;
  border-radius: 1.1rem;
  overflow: hidden;
}

.evo-weight-item {
  display: grid;
  grid-template-columns: 1fr 4.5rem 4.5rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid #ececee;
}

.evo-weight-item:last-child {
  border-bottom: none;
}

.evo-weight-item-main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.evo-weight-item-icon {
  display: inline-flex;
  width: 2.1rem;
  height: 2.1rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: #f2f2f4;
}

.evo-weight-item-icon-svg {
  width: 1rem;
  height: 1rem;
  color: #8a8a8e;
}

.evo-weight-item-main strong {
  font-size: 1rem;
  font-weight: 700;
}

.evo-weight-delta {
  text-align: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: #8a8a8e;
}

.evo-weight-delta--down {
  color: var(--cf-green-dark);
}

.evo-weight-delta--up {
  color: #c4842e;
}

.evo-weight-date {
  text-align: right;
  font-size: 0.82rem;
  color: #8a8a8e;
}

.evo-weight-register {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 3.35rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-green-dark);
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.evo-weight-register-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.evo-weight-loading,
.evo-weight-empty,
.evo-weight-hint {
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.evo-weight-hint {
  margin: 0 0 0.75rem;
}

.evo-weight-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  border: none;
  background: rgba(20, 24, 28, 0.38);
}

.evo-weight-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1210;
  padding: 0.5rem 1.25rem calc(var(--cf-tab-clearance, 5.5rem) + 0.5rem);
  border-radius: 1.25rem 1.25rem 0 0;
  background: #fff;
}

.evo-weight-sheet-handle {
  width: 2.25rem;
  height: 0.25rem;
  margin: 0.35rem auto 1rem;
  border-radius: 999px;
  background: #d2d2d7;
}

.evo-weight-sheet h4 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 600;
  text-align: center;
}

.evo-weight-save {
  width: 100%;
  min-height: 3.25rem;
  margin-top: 0.85rem;
  border: none;
  border-radius: 1rem;
  background: var(--cf-green-dark);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.evo-weight-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.evo-weight-cancel {
  width: 100%;
  min-height: 2.75rem;
  margin-top: 0.35rem;
  border: none;
  background: transparent;
  color: var(--cf-text-muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.evo-weight-error {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--pa-red, #d64545);
  text-align: center;
}

.weight-sheet-fade-enter-active,
.weight-sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}

.weight-sheet-fade-enter-from,
.weight-sheet-fade-leave-to {
  opacity: 0;
}

.weight-sheet-slide-enter-active,
.weight-sheet-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.weight-sheet-slide-enter-from,
.weight-sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
