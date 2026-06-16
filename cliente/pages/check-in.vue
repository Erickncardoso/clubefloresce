<template>
  <div v-if="isPatientApp" class="patient-page checkin-page checkin-page--typeform">
    <PatientHeader v-if="view === 'list'" title="Check-ins" />

    <div v-if="loadingTemplates" class="checkin-loading">
      <PatientPageSkeleton layout="checkin" />
    </div>

    <div v-else-if="view === 'list'" class="checkin-picker">
      <p v-if="!activeTemplates.length" class="checkin-empty">
        Nenhum check-in disponível no momento.
      </p>
      <button
        v-for="tpl in activeTemplates"
        :key="tpl.id"
        type="button"
        class="checkin-picker-card"
        @click="startTemplate(tpl)"
      >
        <strong>{{ tpl.title }}</strong>
        <span v-if="tpl.description">{{ tpl.description }}</span>
        <small>{{ frequencyLabel(tpl.frequency) }}</small>
        <span v-if="tpl.completedThisPeriod" class="checkin-done-badge">Respondido</span>
      </button>
      <NuxtLink v-if="history.length" to="/check-in/historico" class="checkin-history-link">
        Ver histórico
      </NuxtLink>
    </div>

    <CheckinTypeformFlow
      v-else-if="selectedTemplate"
      :steps="selectedTemplate.steps"
      :saving="saving"
      :error="formError"
      :show-history-link="history.length > 0"
      @submit="submitPatientCheckIn"
    />
  </div>

  <NuxtLayout v-else name="dashboard">
    <div class="checkin-page admin-shell">
      <header class="admin-shell-header">
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
        <div v-if="patientCheckIns.length" class="nutri-toolbar">
          <div class="nutri-search">
            <Search class="nutri-search-icon" />
            <input
              v-model="nutriSearch"
              type="search"
              placeholder="Buscar paciente..."
              aria-label="Buscar paciente"
            >
          </div>
          <label class="nutri-filter">
            <input v-model="onlyAttention" type="checkbox">
            Só atenção
          </label>
          <span class="nutri-count">{{ filteredCheckIns.length }} check-in{{ filteredCheckIns.length === 1 ? '' : 's' }}</span>
        </div>

        <div v-if="!patientCheckIns.length" class="nutri-empty admin-shell-card">
          <p>Nenhum check-in registrado ainda.</p>
          <span>Quando as alunas responderem o check-in semanal, os dados aparecem aqui.</span>
        </div>

        <div v-else-if="!filteredCheckIns.length" class="nutri-empty admin-shell-card">
          <p>{{ emptyFilterMessage }}</p>
          <span>Tente outro filtro ou termo de busca.</span>
        </div>

        <div v-else class="checkin-table-card admin-shell-card">
          <div class="checkin-table-wrap">
            <table class="checkin-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Semana</th>
                  <th>Humor</th>
                  <th>Energia</th>
                  <th>Aderência</th>
                  <th>Água</th>
                  <th>Exercício</th>
                  <th class="th-actions" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredCheckIns"
                  :key="item.id"
                  class="checkin-row"
                  :class="{ 'checkin-row--alert': needsAttention(item) }"
                  @click="goToPatient(item)"
                >
                  <td>
                    <div class="checkin-patient">
                      <PatientAvatar
                        :src="item.user?.avatar"
                        :name="item.user?.name || 'Aluna'"
                        size="sm"
                        :ring="false"
                      />
                      <div class="checkin-patient-copy">
                        <span class="checkin-name">{{ item.user?.name || 'Aluna' }}</span>
                        <span v-if="item.extras.freeText" class="checkin-has-note" title="Tem observação">Observação</span>
                      </div>
                    </div>
                  </td>
                  <td class="checkin-date">{{ formatWeek(item.weekStart) }}</td>
                  <td class="checkin-score" :class="scoreTone(item.mood)">{{ item.mood }}/5</td>
                  <td class="checkin-score" :class="scoreTone(item.energy)">{{ item.energy }}/5</td>
                  <td class="checkin-score" :class="scoreTone(item.adherence)">
                    {{ item.adherence != null ? `${item.adherence}/5` : '—' }}
                  </td>
                  <td class="checkin-meta">
                    {{ item.extras.water != null ? `${item.extras.water} copos` : '—' }}
                  </td>
                  <td class="checkin-meta">
                    {{ item.extras.exercise != null ? (item.extras.exercise ? 'Sim' : 'Não') : '—' }}
                  </td>
                  <td class="td-actions" @click.stop>
                    <NuxtLink
                      v-if="item.user?.id"
                      :to="`/usuarios/${item.user.id}`"
                      class="checkin-link-btn"
                    >
                      Ver
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { Search } from 'lucide-vue-next'

const isPatientAppBuild = process.env.NUXT_PUBLIC_MOBILE_APP === 'true'

definePageMeta({
  layout: isPatientAppBuild ? 'patient' : 'dashboard',
  ...(isPatientAppBuild ? { middleware: 'patient-only' } : {}),
})

const config = useRuntimeConfig()
const isPatientApp = computed(() => Boolean(config.public.mobileApp))
const { patientTimeHeaders } = usePatientLocalTime()

const route = useRoute()
const apiBase = config.public.apiBase
const isNutri = ref(false)
const saving = ref(false)
const formError = ref('')
const formSuccess = ref('')
const current = ref(null)
const history = ref([])
const patientCheckIns = ref([])
const nutriSearch = ref('')
const onlyAttention = ref(false)
const weekLabel = ref('')
const loadingTemplates = ref(true)
const activeTemplates = ref([])
const selectedTemplate = ref(null)
const view = ref('list')

const filteredCheckIns = computed(() => {
  let list = patientCheckIns.value
  if (onlyAttention.value) {
    list = list.filter((item) => needsAttention(item))
  }
  const query = nutriSearch.value.trim().toLowerCase()
  if (!query) return list
  return list.filter((item) => item.user?.name?.toLowerCase().includes(query))
})

const emptyFilterMessage = computed(() => {
  if (onlyAttention.value && nutriSearch.value.trim()) {
    return 'Nenhum check-in com atenção para essa busca.'
  }
  if (onlyAttention.value) return 'Nenhum check-in precisa de atenção no momento.'
  return `Nenhum resultado para "${nutriSearch.value}".`
})

function scoreTone(value) {
  const score = Number(value)
  if (Number.isNaN(score)) return ''
  if (score <= 2) return 'checkin-score--low'
  if (score === 3) return 'checkin-score--mid'
  return ''
}

function needsAttention(item) {
  return [item.mood, item.energy, item.adherence].some(
    (score) => score != null && Number(score) <= 2,
  )
}

function goToPatient(item) {
  if (item.user?.id) navigateTo(`/usuarios/${item.user.id}`)
}

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

const AUTO_NOTES_RE = /^[\s\S]*?Água:\s*\d+\s*copos?\.?\s*Exercícios?:\s*(Sim|Não)\.?\s*$/i

function parseCheckInNotes(notes) {
  const text = String(notes || '').trim()
  if (!text) {
    return { water: null, exercise: null, freeText: null }
  }

  const waterMatch = text.match(/Água:\s*(\d+)\s*copos?/i)
  const exerciseMatch = text.match(/Exercícios?:\s*(Sim|Não)/i)

  const water = waterMatch ? Number(waterMatch[1]) : null
  const exercise = exerciseMatch
    ? exerciseMatch[1].toLowerCase() === 'sim'
    : null

  const stripped = text
    .replace(/Água:\s*\d+\s*copos?\.?\s*/gi, '')
    .replace(/Exercícios?:\s*(Sim|Não)\.?\s*/gi, '')
    .trim()

  const freeText = stripped || (AUTO_NOTES_RE.test(text) ? null : text)

  return { water, exercise, freeText: freeText || null }
}

function frequencyLabel(freq) {
  if (freq === 'daily') return 'Diário'
  if (freq === 'monthly') return 'Mensal'
  return 'Semanal'
}

const loadPatientTemplates = async () => {
  loadingTemplates.value = true
  try {
    const data = await $fetch(`${apiBase}/checkin/templates/active`, { headers: patientTimeHeaders() })
    const templates = data.templates || []
    const allHistory = []
    const enriched = await Promise.all(
      templates.map(async (tpl) => {
        try {
          const ctx = await $fetch(`${apiBase}/checkin/templates/${tpl.id}/context`, {
            headers: patientTimeHeaders(),
          })
          if (Array.isArray(ctx.history)) allHistory.push(...ctx.history)
          return {
            ...tpl,
            completedThisPeriod: Boolean(ctx.current),
          }
        } catch {
          return { ...tpl, completedThisPeriod: false }
        }
      }),
    )
    activeTemplates.value = enriched
    history.value = allHistory

    const queryId = route.query.template
    if (queryId) {
      const match = enriched.find((t) => t.id === queryId)
      if (match) startTemplate(match)
      return
    }
    if (enriched.length === 1 && !enriched[0].completedThisPeriod) {
      startTemplate(enriched[0])
    }
  } finally {
    loadingTemplates.value = false
  }
}

const startTemplate = (tpl) => {
  selectedTemplate.value = tpl
  view.value = 'flow'
  formError.value = ''
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
  const list = await $fetch(`${apiBase}/checkin/patients`, {
    headers: patientTimeHeaders(),
  })
  patientCheckIns.value = (Array.isArray(list) ? list : []).map((item) => ({
    ...item,
    extras: parseCheckInNotes(item.notes),
  }))
}

const submitPatientCheckIn = async (answers) => {
  if (!selectedTemplate.value) return
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`${apiBase}/checkin/responses`, {
      method: 'POST',
      headers: patientTimeHeaders(),
      body: {
        templateId: selectedTemplate.value.id,
        answers,
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
    else await loadPatientTemplates()
  } catch (err) {
    console.error(err)
  }
})
</script>

<style scoped>
.patient-page.checkin-page--typeform {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  background: var(--cf-bg);
}

.checkin-loading {
  padding: 0.25rem 0;
}

.checkin-empty {
  padding: 2rem 1.25rem;
  text-align: center;
  color: var(--cf-text-muted);
}

.checkin-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.checkin-picker-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
  padding: 1rem 1.1rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 12px;
  background: var(--cf-surface);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.checkin-picker-card strong {
  font-size: 1rem;
  color: var(--cf-text);
}

.checkin-picker-card span {
  font-size: 0.88rem;
  color: var(--cf-text-muted);
}

.checkin-picker-card small {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
}

.checkin-done-badge {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--cf-track);
  font-size: 0.7rem !important;
  font-weight: 700;
  color: var(--cf-text-muted) !important;
}

.checkin-history-link {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  text-decoration: none;
}

/* Portal web / nutri */
.checkin-page.admin-shell {
  --primary: #2d5a27;
}

.week-badge {
  background: #eef8f0;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
}

.checkin-form-card {
  background: #fff;
  border-radius: 14px;
  padding: 1.75rem;
  border: 1px solid var(--admin-border, #e8ece9);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.score-grid {
  display: grid;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

@media (min-width: 640px) {
  .score-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.score-field label {
  display: block;
  font-weight: 600;
  font-size: 0.88rem;
  margin-bottom: 0.45rem;
  color: #444;
}

.score-value {
  display: inline-block;
  margin-top: 0.35rem;
  font-weight: 800;
  color: var(--primary);
}

.form-row {
  margin-bottom: 1.1rem;
}

.form-row label {
  display: block;
  font-weight: 600;
  font-size: 0.88rem;
  margin-bottom: 0.45rem;
  color: #444;
}

.form-row input,
.form-row textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-family: inherit;
  font-size: 0.92rem;
  box-sizing: border-box;
}

.btn-primary {
  width: 100%;
  padding: 0.85rem 1rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.history-section {
  margin-top: 2rem;
}

.history-section h2 {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  font-weight: 800;
  color: #141414;
}

.history-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  align-items: center;
  background: #fff;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.65rem;
  font-size: 0.88rem;
  color: #555;
}

.history-week {
  font-weight: 700;
  color: #141414;
}

.nutri-list {
  margin-top: 0.25rem;
}

.nutri-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.nutri-search {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;
}

.nutri-search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #9ca3af;
  pointer-events: none;
}

.nutri-search input {
  width: 100%;
  padding: 0.65rem 0.9rem 0.65rem 2.4rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
}

.nutri-search input:focus {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.nutri-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  user-select: none;
}

.nutri-filter input {
  accent-color: var(--primary);
}

.nutri-count {
  margin-left: auto;
  font-size: 0.82rem;
  font-weight: 600;
  color: #888;
  white-space: nowrap;
}

.checkin-table-card {
  overflow: hidden;
}

.checkin-table-wrap {
  overflow-x: auto;
}

.checkin-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 760px;
}

.checkin-table th {
  padding: 0.75rem 0.85rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #888;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.checkin-table th:nth-child(1) { width: 24%; }
.checkin-table th:nth-child(2) { width: 14%; }
.checkin-table th:nth-child(3),
.checkin-table th:nth-child(4),
.checkin-table th:nth-child(5) { width: 9%; }
.checkin-table th:nth-child(6),
.checkin-table th:nth-child(7) { width: 11%; }

.checkin-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #f3f3f3;
  vertical-align: middle;
  font-size: 0.86rem;
  color: #444;
}

.checkin-table tbody tr:last-child td {
  border-bottom: none;
}

.checkin-row {
  cursor: pointer;
  transition: background 0.12s;
}

.checkin-row:hover td {
  background: #fafcfb;
}

.checkin-row--alert td {
  background: #fffcfc;
}

.checkin-row--alert:hover td {
  background: #fff5f5;
}

.checkin-patient {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.checkin-patient-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.checkin-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #141414;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkin-has-note {
  font-size: 0.72rem;
  font-weight: 600;
  color: #888;
}

.checkin-date {
  font-size: 0.82rem;
  color: #666;
  white-space: nowrap;
}

.checkin-score {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.checkin-score--low {
  color: #b91c1c;
}

.checkin-score--mid {
  color: #a16207;
}

.checkin-meta {
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}

.th-actions,
.td-actions {
  width: 64px;
  text-align: right;
}

.checkin-link-btn {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.checkin-link-btn:hover {
  text-decoration: underline;
}

.nutri-empty {
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.nutri-empty p {
  margin: 0 0 0.35rem;
  font-weight: 700;
  color: #141414;
}

.nutri-empty span {
  font-size: 0.88rem;
  color: #888;
}

@media (max-width: 768px) {
  .nutri-count {
    margin-left: 0;
    width: 100%;
    text-align: right;
  }

  .nutri-search {
    max-width: none;
    width: 100%;
  }
}

.error-text { color: #c53030; margin-top: 0.75rem; }
.success-text { color: #2d5a27; margin-top: 0.75rem; }
</style>