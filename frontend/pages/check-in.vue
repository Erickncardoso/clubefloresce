<template>
  <div v-if="isPatientApp" class="patient-page checkin-page checkin-page--typeform">
    <CheckinTypeformFlow
      :saving="saving"
      :error="formError"
      :show-history-link="history.length > 0"
      @submit="submitPatientCheckIn"
    />
  </div>

  <NuxtLayout v-else name="dashboard">
    <div class="checkin-page">
      <header class="page-header">
        <div>
          <h1>{{ isNutri ? 'Check-ins dos pacientes' : 'Check-in semanal' }}</h1>
          <p v-if="isNutri">Acompanhe o humor, energia e evolução reportados pelos pacientes.</p>
          <p v-else>Registre como você está nesta semana. Um check-in por semana.</p>
        </div>
        <span v-if="!isNutri && weekLabel" class="week-badge">{{ weekLabel }}</span>
      </header>

      <section v-if="!isNutri" class="checkin-form-card">
        <form @submit.prevent="submitCheckIn">
          <div class="score-grid">
            <div class="score-field">
              <label>Humor (1–5)</label>
              <input v-model.number="form.mood" type="range" min="1" max="5" step="1" />
              <span class="score-value">{{ form.mood }}</span>
            </div>
            <div class="score-field">
              <label>Energia (1–5)</label>
              <input v-model.number="form.energy" type="range" min="1" max="5" step="1" />
              <span class="score-value">{{ form.energy }}</span>
            </div>
            <div class="score-field">
              <label>Aderência ao plano (1–5)</label>
              <input v-model.number="form.adherence" type="range" min="1" max="5" step="1" />
              <span class="score-value">{{ form.adherence }}</span>
            </div>
          </div>
          <div class="form-row">
            <label>Peso (kg) — opcional</label>
            <input v-model="form.weightKg" type="number" step="0.1" min="20" max="500" placeholder="Ex: 68.5" />
          </div>
          <div class="form-row">
            <label>Como foi sua semana?</label>
            <textarea v-model="form.notes" rows="4" placeholder="Conquistas, dificuldades, sono, treinos..." />
          </div>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Salvando...' : (current ? 'Atualizar check-in' : 'Enviar check-in da semana') }}
          </button>
          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="formSuccess" class="success-text">{{ formSuccess }}</p>
        </form>
      </section>

      <section v-if="!isNutri && history.length" class="history-section">
        <h2>Semanas anteriores</h2>
        <div class="history-list">
          <article v-for="item in history" :key="item.id" class="history-item">
            <span class="history-week">{{ formatWeek(item.weekStart) }}</span>
            <span>Humor {{ item.mood }}</span>
            <span>Energia {{ item.energy }}</span>
            <span v-if="item.adherence">Plano {{ item.adherence }}</span>
            <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
          </article>
        </div>
      </section>

      <section v-if="isNutri" class="nutri-list">
        <p v-if="!patientCheckIns.length" class="empty-text">Nenhum check-in registrado ainda.</p>
        <article v-for="item in patientCheckIns" :key="item.id" class="nutri-card">
          <div class="nutri-card-head">
            <strong>{{ item.user?.name }}</strong>
            <span>{{ formatWeek(item.weekStart) }}</span>
          </div>
          <div class="nutri-scores">
            <span>Humor {{ item.mood }}/5</span>
            <span>Energia {{ item.energy }}/5</span>
            <span v-if="item.adherence">Aderência {{ item.adherence }}/5</span>
            <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
          </div>
          <p v-if="item.notes" class="nutri-notes">{{ item.notes }}</p>
        </article>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup>

const isPatientAppBuild = process.env.NUXT_PUBLIC_MOBILE_APP === 'true'

definePageMeta({
  layout: isPatientAppBuild ? 'patient' : 'dashboard',
  ...(isPatientAppBuild ? { middleware: 'patient-only' } : {}),
})

const config = useRuntimeConfig()
const isPatientApp = computed(() => Boolean(config.public.mobileApp))
const { patientTimeHeaders } = usePatientLocalTime()

const apiBase = config.public.apiBase
const isNutri = ref(false)
const saving = ref(false)
const formError = ref('')
const formSuccess = ref('')
const current = ref(null)
const history = ref([])
const patientCheckIns = ref([])
const weekLabel = ref('')

const form = reactive({
  mood: 3,
  energy: 3,
  adherence: 3,
  weightKg: '',
  notes: '',
})

const waterToEnergy = (glasses) => {
  if (glasses <= 2) return 1
  if (glasses <= 4) return 2
  if (glasses <= 6) return 3
  if (glasses <= 8) return 4
  return 5
}

const formatWeek = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const loadPatientData = async () => {
  const data = await $fetch(`${apiBase}/checkin/me`, { headers: patientTimeHeaders() })
  current.value = data.current
  history.value = data.history || []
  if (data.weekStart) weekLabel.value = `Semana de ${formatWeek(data.weekStart)}`
  if (data.current) {
    form.mood = data.current.mood
    form.energy = data.current.energy
    form.adherence = data.current.adherence ?? 3
    form.weightKg = data.current.weightKg ?? ''
    form.notes = data.current.notes ?? ''
  }
}

const loadNutriData = async () => {
  patientCheckIns.value = await $fetch(`${apiBase}/checkin/patients`, {
    headers: patientTimeHeaders(),
  })
}

const submitPatientCheckIn = async (typeformData) => {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`${apiBase}/checkin`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        mood: typeformData.sleep || 3,
        energy: waterToEnergy(typeformData.water),
        adherence: typeformData.food || 3,
        weightKg: null,
        notes: `Água: ${typeformData.water} copos. Exercício: ${typeformData.exercise ? 'Sim' : 'Não'}.`,
      },
    })
    navigateTo('/check-in/concluido')
  } catch (err) {
    formError.value = err.data?.message || 'Erro ao salvar check-in.'
  } finally {
    saving.value = false
  }
}

const submitCheckIn = async () => {
  formError.value = ''
  formSuccess.value = ''
  saving.value = true
  try {
    await $fetch(`${apiBase}/checkin`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        mood: form.mood,
        energy: form.energy,
        adherence: form.adherence,
        weightKg: form.weightKg || null,
        notes: form.notes,
      },
    })

    formSuccess.value = 'Check-in salvo com sucesso!'
    await loadPatientData()
  } catch (err) {
    formError.value = err.data?.message || 'Erro ao salvar check-in.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
  try {
    if (isNutri.value) await loadNutriData()
    else await loadPatientData()
  } catch (err) {
    console.error(err)
  }
})
</script>

<style scoped>
.patient-page.checkin-page--typeform {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 0;
  padding-bottom: calc(var(--cf-tab-h) + env(safe-area-inset-bottom, 0px) + 1.25rem);
  box-sizing: border-box;
  background: var(--cf-bg);
}

/* Portal web / nutri */
.checkin-page:not(.patient-page) {
  --primary: #2d5a27;
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem 1.35rem 3rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 0.35rem;
}

.week-badge {
  background: #f4f7f6;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
}

.checkin-form-card {
  background: #fff;
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid #eee;
}

.score-grid {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.score-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.score-value {
  font-weight: 800;
  color: var(--primary);
}

.form-row {
  margin-bottom: 1.25rem;
}

.form-row label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-row input,
.form-row textarea {
  width: 100%;
  border: 1.5px solid #eee;
  border-radius: 12px;
  padding: 0.85rem;
  font-family: inherit;
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}

.history-section h2,
.nutri-list {
  margin-top: 2rem;
}

.history-item,
.nutri-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.error-text { color: #c53030; }
.success-text { color: #2d5a27; }
.empty-text { color: #888; }
</style>