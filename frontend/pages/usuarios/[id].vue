<template>
  <NuxtLayout name="dashboard">
    <div class="patient-detail-page admin-shell">
      <div v-if="loading" class="loading-state">Carregando paciente...</div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <NuxtLink to="/usuarios" class="btn-back">Voltar para alunos</NuxtLink>
      </div>

      <template v-else-if="overview">
        <header class="page-header">
          <div class="header-main">
            <NuxtLink to="/usuarios" class="back-link">← Alunos</NuxtLink>
            <div class="patient-head">
              <PatientAvatar
                :src="overview.patient.avatar"
                :name="overview.patient.name"
                size="lg"
                :ring="false"
              />
              <div>
                <h1>{{ overview.patient.name }}</h1>
                <p>{{ overview.patient.email }}</p>
                <div class="meta-row">
                  <span class="user-tag user-tag--plan" :class="`user-tag--plan-${(overview.patient.plan || 'FREE').toLowerCase()}`">
                    {{ formatPlanLabel(overview.patient.plan) }}
                  </span>
                  <span class="user-tag user-tag--status" :class="`user-tag--status-${(overview.patient.status || 'ATIVO').toLowerCase()}`">
                    {{ formatStatusLabel(overview.patient.status) }}
                  </span>
                  <span class="muted">Desde {{ formatDate(overview.patient.createdAt) }}</span>
                  <span
                    v-if="isPatientAccessExpired(overview.patient.accessExpiresAt)"
                    class="user-tag user-tag--access-expired"
                  >
                    Acesso expirado
                  </span>
                  <span v-else class="muted">Acesso até {{ formatAccessDate(overview.patient.accessExpiresAt) }}</span>
                </div>
              </div>
            </div>
          </div>
          <button class="btn-secondary" @click="showEditModal = true">Editar cadastro</button>
        </header>

        <nav class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>

        <!-- Resumo -->
        <section v-if="activeTab === 'resumo'" class="tab-panel">
          <div class="stats-grid">
            <article class="stat-card">
              <span class="stat-label">Check-ins</span>
              <strong>{{ overview.checkIn.total }}</strong>
              <small v-if="overview.checkIn.missingThisWeek" class="warn">Sem check-in esta semana</small>
              <small v-else>Semana em dia</small>
            </article>
            <article class="stat-card">
              <span class="stat-label">Plano alimentar</span>
              <strong>{{ overview.mealPlan ? 'Ativo' : 'Pendente' }}</strong>
              <small>{{ overview.mealPlan?.mealCount || 0 }} refeições</small>
            </article>
            <article class="stat-card">
              <span class="stat-label">Cursos</span>
              <strong>{{ overview.courseProgress.percent }}%</strong>
              <small>{{ overview.courseProgress.watchedLessons }}/{{ overview.courseProgress.totalLessons }} aulas</small>
            </article>
            <article class="stat-card">
              <span class="stat-label">Último peso</span>
              <strong>{{ latestWeight || '—' }}</strong>
              <small v-if="overview.checkIn.latest">Semana {{ formatWeek(overview.checkIn.latest.weekStart) }}</small>
            </article>
            <article v-if="overview.foodDiary?.today" class="stat-card stat-card--nutrition">
              <span class="stat-label">Nutrição hoje</span>
              <strong>{{ Math.round(overview.foodDiary.today.consumed.caloriesKcal) }} kcal</strong>
              <small>
                Meta {{ overview.foodDiary.today.targets.caloriesKcal }} kcal
                · P {{ Math.round(overview.foodDiary.today.consumed.proteinG) }}g
                · C {{ Math.round(overview.foodDiary.today.consumed.carbsG) }}g
                · G {{ Math.round(overview.foodDiary.today.consumed.fatG) }}g
              </small>
            </article>
          </div>

          <section class="resumo-nutrition-panel">
            <PatientsPatientNutritionSection
              :patient-id="patientId"
              show-links
              @navigate="activeTab = $event"
            />
          </section>

          <div class="two-col">
            <article class="info-card">
              <h3>Últimos check-ins</h3>
              <div v-if="!overview.checkIn.recent.length" class="empty">Nenhum check-in ainda.</div>
              <div v-for="item in overview.checkIn.recent" :key="item.id" class="mini-row">
                <span>{{ formatWeek(item.weekStart) }}</span>
                <span>Humor {{ item.mood }}</span>
                <span>Energia {{ item.energy }}</span>
                <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
              </div>
            </article>

            <article class="info-card">
              <h3>Conversas com Bella</h3>
              <div v-if="!overview.bella.recentMessages.length" class="empty">Sem mensagens recentes.</div>
              <div v-for="msg in overview.bella.recentMessages" :key="msg.id" class="bella-row">
                <span class="bella-topic">{{ msg.topic || 'geral' }}</span>
                <p>{{ msg.preview }}</p>
                <small>{{ formatDateTime(msg.createdAt) }}</small>
              </div>
            </article>
          </div>
        </section>

        <!-- Check-ins -->
        <section v-if="activeTab === 'checkins'" class="tab-panel">
          <div class="template-responses-block">
            <h3>Respostas da aluna</h3>
            <article
              v-for="item in templateResponses"
              :key="item.id"
              class="template-response-card"
            >
              <div class="template-response-head">
                <div>
                  <strong>{{ item.template?.title || 'Check-in' }}</strong>
                  <p>{{ formatTemplatePeriod(item) }} · {{ formatDateTime(item.updatedAt) }}</p>
                </div>
              </div>
              <ul class="template-response-answers">
                <li v-for="row in answerRowsFor(item)" :key="row.id">
                  <span>{{ row.label }}</span>
                  <strong>{{ row.value }}</strong>
                </li>
              </ul>
            </article>
            <p v-if="!templateResponses.length" class="empty">Nenhuma resposta de check-in ainda.</p>
          </div>

          <details class="legacy-checkin-details">
            <summary>Registro manual (legado)</summary>
            <div class="checkin-layout">
              <form class="checkin-form-card" @submit.prevent="saveCheckIn">
                <h3>{{ editingCheckIn ? 'Editar check-in' : 'Registrar check-in' }}</h3>

                <label for="checkin-week">Semana</label>
                <SharedCfSelect
                  id="checkin-week"
                  v-model="checkInForm.weekStart"
                  :options="weekSelectOptions"
                />

                <div class="score-grid">
                  <div class="score-field">
                    <label>Humor (1–5)</label>
                    <input v-model.number="checkInForm.mood" type="range" min="1" max="5" step="1" />
                    <span>{{ checkInForm.mood }}</span>
                  </div>
                  <div class="score-field">
                    <label>Energia (1–5)</label>
                    <input v-model.number="checkInForm.energy" type="range" min="1" max="5" step="1" />
                    <span>{{ checkInForm.energy }}</span>
                  </div>
                  <div class="score-field">
                    <label>Aderência (1–5)</label>
                    <input v-model.number="checkInForm.adherence" type="range" min="1" max="5" step="1" />
                    <span>{{ checkInForm.adherence }}</span>
                  </div>
                </div>

                <label>Peso (kg)</label>
                <input v-model="checkInForm.weightKg" type="number" step="0.1" min="20" max="500" placeholder="Opcional" />

                <label>Observações</label>
                <textarea v-model="checkInForm.notes" rows="4" placeholder="Como foi a semana da paciente..." />

                <button type="submit" class="btn-primary" :disabled="savingCheckIn">
                  {{ savingCheckIn ? 'Salvando...' : 'Salvar check-in' }}
                </button>
                <p v-if="checkInMessage" class="form-msg" :class="{ error: checkInError }">{{ checkInMessage }}</p>
              </form>

              <div class="history-panel">
                <h3>Histórico manual</h3>
                <article v-for="item in checkInHistory" :key="item.id" class="history-card" @click="loadCheckInToForm(item)">
                  <div class="history-head">
                    <strong>{{ formatWeek(item.weekStart) }}</strong>
                    <button type="button" class="link-btn" @click.stop="loadCheckInToForm(item)">Editar</button>
                  </div>
                  <div class="history-scores">
                    <span>Humor {{ item.mood }}/5</span>
                    <span>Energia {{ item.energy }}/5</span>
                    <span v-if="item.adherence">Plano {{ item.adherence }}/5</span>
                    <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
                  </div>
                  <p v-if="item.notes" class="history-notes">{{ item.notes }}</p>
                </article>
                <p v-if="!checkInHistory.length" class="empty">Nenhum registro manual.</p>
              </div>
            </div>
          </details>
        </section>

        <!-- Plano alimentar -->
        <section v-if="activeTab === 'plano'" class="tab-panel">
          <article class="info-card plan-card">
            <div class="plan-head">
              <div>
                <h3>{{ mealPlan?.title || 'Plano alimentar' }}</h3>
                <p v-if="mealPlan" class="muted">
                  {{ mealPlan.fileName }} · Atualizado {{ formatDateTime(mealPlan.updatedAt) }}
                </p>
                <p v-else class="muted">Nenhum plano importado para esta paciente.</p>
              </div>
              <a v-if="mealPlan?.pdfUrl" :href="mealPlan.pdfUrl" target="_blank" rel="noopener" class="btn-secondary">
                Ver PDF
              </a>
            </div>

            <div v-if="mealPlan?.plan?.meals?.length" class="meals-list">
              <div v-for="(meal, idx) in mealPlan.plan.meals" :key="idx" class="meal-item">
                <strong>{{ meal.name || meal.label || `Refeição ${idx + 1}` }}</strong>
                <span v-if="meal.time">{{ meal.time }}</span>
                <ul>
                  <li v-for="(food, fIdx) in meal.items || []" :key="fIdx">
                    {{ food.name || food.food }} — {{ food.quantity || food.portion || '' }}
                  </li>
                </ul>
              </div>
            </div>

            <form class="upload-form" @submit.prevent="uploadMealPlan">
              <label>Enviar ou substituir PDF (Dietbox)</label>
              <input type="file" accept="application/pdf,.pdf" @change="onPlanFileChange" />
              <button type="submit" class="btn-primary" :disabled="!planFile || uploadingPlan">
                {{ uploadingPlan ? 'Processando PDF...' : 'Importar plano' }}
              </button>
              <p v-if="planMessage" class="form-msg" :class="{ error: planError }">{{ planMessage }}</p>
            </form>
          </article>
        </section>

        <!-- Diário -->
        <section v-if="activeTab === 'diario'" class="tab-panel">
          <article class="info-card">
            <h3>Registros recentes do diário</h3>
            <div v-if="!foodDiary.length" class="empty">Nenhuma refeição registrada.</div>
            <div v-for="entry in foodDiary" :key="entry.id" class="diary-row">
              <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" class="diary-thumb" loading="lazy" />
              <div class="diary-body">
                <div class="diary-head">
                  <strong>{{ entry.mealLabel || entry.mealType }}</strong>
                  <span>{{ formatDiaryDate(entry.entryDate) }}</span>
                </div>
                <div class="diary-macros">
                  <span v-if="entry.caloriesKcal">{{ Math.round(entry.caloriesKcal) }} kcal</span>
                  <span v-if="entry.proteinG">P {{ Math.round(entry.proteinG) }}g</span>
                  <span v-if="entry.carbsG">C {{ Math.round(entry.carbsG) }}g</span>
                  <span v-if="entry.fatG">G {{ Math.round(entry.fatG) }}g</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <!-- Nutrição -->
        <section v-if="activeTab === 'nutricao'" class="tab-panel">
          <article class="info-card">
            <h3>Panorama nutricional</h3>
            <EvolucaoNutritionMonthView :patient-id="patientId" />
          </article>
        </section>

        <!-- Metas -->
        <section v-if="activeTab === 'metas'" class="tab-panel">
          <article class="info-card">
            <h3>Metas da paciente</h3>
            <PatientsPatientGoalsPanel :patient-id="patientId" :nutrition-target="overview.nutritionTarget" />
          </article>
        </section>

        <!-- Fotos -->
        <section v-if="activeTab === 'fotos'" class="tab-panel">
          <article class="info-card">
            <h3>Fotos de refeições</h3>
            <PatientsPatientPhotosPanel :patient-id="patientId" />
          </article>
        </section>
      </template>

      <!-- Modal editar paciente -->
      <Teleport to="body">
        <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
          <form class="modal-card" @submit.prevent="savePatient">
            <h3>Editar cadastro</h3>

            <div class="modal-fields">
              <div class="field field--float">
                <label for="edit-name">Nome</label>
                <input id="edit-name" v-model="editForm.name" required />
              </div>

              <div class="field field--float">
                <label for="edit-plan">Plano</label>
                <SharedCfSelect
                  id="edit-plan"
                  v-model="editForm.plan"
                  :options="planOptions"
                />
              </div>

              <div class="field field--float">
                <label for="edit-status">Status</label>
                <SharedCfSelect
                  id="edit-status"
                  v-model="editForm.status"
                  :options="statusOptions"
                />
              </div>

              <div class="field field--float">
                <label for="edit-access-expires">Acesso válido até</label>
                <SharedCfDateInput
                  id="edit-access-expires"
                  v-model="editForm.accessExpiresAt"
                  :min="minAccessDate"
                />
              </div>
            </div>

            <p class="field-hint">Deixe em branco para acesso sem data limite.</p>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="showEditModal = false">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="savingPatient">Salvar</button>
            </div>
          </form>
        </div>
      </Teleport>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { resolveUploadApiUrl } from '~/utils/resolve-api-base.mjs'
import { isPatientAccessExpired } from '~/utils/patient-access'
import { buildAnswerRows, formatCheckinPeriod } from '~/utils/checkin-answers'

definePageMeta({
  layout: 'dashboard',
  middleware: 'nutri-only',
})

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = computed(() => config.public.apiBase)
const patientId = computed(() => route.params.id)

const loading = ref(true)
const error = ref('')
const overview = ref(null)
const mealPlan = ref(null)
const foodDiary = ref([])
const checkInHistory = ref([])
const templateResponses = ref([])
const currentWeekStart = ref('')
const activeTab = ref(normalizePatientTab(route.query.tab))

function normalizePatientTab(value) {
  const tab = String(value || 'resumo')
  if (['resumo', 'checkins', 'plano', 'diario', 'nutricao', 'metas', 'fotos'].includes(tab)) return tab
  return 'resumo'
}
const savingCheckIn = ref(false)
const checkInMessage = ref('')
const checkInError = ref(false)
const planFile = ref(null)
const uploadingPlan = ref(false)
const planMessage = ref('')
const planError = ref(false)
const showEditModal = ref(false)
const savingPatient = ref(false)

const tabs = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'metas', label: 'Metas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'plano', label: 'Plano alimentar' },
  { id: 'diario', label: 'Diário' },
]

const checkInForm = reactive({
  weekStart: '',
  mood: 3,
  energy: 3,
  adherence: 3,
  weightKg: '',
  notes: '',
})

const editForm = reactive({
  name: '',
  plan: 'FREE',
  status: 'ATIVO',
  accessExpiresAt: '',
})

const planOptions = [
  { value: 'FREE', label: 'Gratuito' },
  { value: 'PREMIUM', label: 'Essencial' },
  { value: 'PLATINUM', label: 'Completo' },
]

const statusOptions = [
  { value: 'ATIVO', label: 'Ativa' },
  { value: 'INATIVO', label: 'Inativa' },
  { value: 'PENDENTE', label: 'Pendente' },
]

const minAccessDate = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
})

const latestWeight = computed(() => {
  const w = overview.value?.checkIn?.latest?.weightKg
  return w ? `${w} kg` : null
})

const editingCheckIn = computed(() =>
  checkInHistory.value.some((item) => item.weekStart === checkInForm.weekStart),
)

const historyWeekOptions = computed(() =>
  checkInHistory.value
    .map((item) => item.weekStart)
    .filter((w) => w !== currentWeekStart.value),
)

const weekSelectOptions = computed(() => {
  const options = [
    { value: currentWeekStart.value, label: 'Semana atual' },
  ]

  for (const week of historyWeekOptions.value) {
    options.push({ value: week, label: formatWeek(week) })
  }

  return options.filter((option) => option.value)
})

const formatPlanLabel = (plan) => {
  const key = (plan || 'FREE').toUpperCase()
  if (key === 'PREMIUM') return 'Essencial'
  if (key === 'PLATINUM') return 'Completo'
  return 'Gratuito'
}

const formatStatusLabel = (status) => {
  const key = (status || 'ATIVO').toUpperCase()
  if (key === 'INATIVO') return 'Inativa'
  if (key === 'PENDENTE') return 'Pendente'
  return 'Ativa'
}

const formatDate = (date) =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

const formatAccessDate = (date) => {
  if (!date) return 'Sem limite'
  return formatDate(date)
}

const toDateInputValue = (value) => {
  if (!value) return ''
  const d = new Date(value)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDateTime = (date) =>
  new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const formatWeek = (dateStr) => formatDate(dateStr)

const formatDiaryDate = (value) => {
  if (!value) return '—'
  const text = typeof value === 'string' ? value.slice(0, 10) : value
  return new Date(`${text}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = normalizePatientTab(tab)
  },
)

const loadCheckInToForm = (item) => {
  checkInForm.weekStart = item.weekStart
  checkInForm.mood = item.mood
  checkInForm.energy = item.energy
  checkInForm.adherence = item.adherence ?? 3
  checkInForm.weightKg = item.weightKg ?? ''
  checkInForm.notes = item.notes ?? ''
}

const loadOverview = async () => {
  overview.value = await $fetch(`${apiBase.value}/patients/${patientId.value}/overview`, {
    headers: authHeaders(),
  })
  editForm.name = overview.value.patient.name
  editForm.plan = overview.value.patient.plan || 'FREE'
  editForm.status = overview.value.patient.status || 'ATIVO'
  editForm.accessExpiresAt = toDateInputValue(overview.value.patient.accessExpiresAt)
  mealPlan.value = overview.value.mealPlan
    ? { ...overview.value.mealPlan, plan: overview.value.mealPlan.plan }
    : null
}

const loadCheckIns = async () => {
  const [legacyData, responsesData] = await Promise.all([
    $fetch(`${apiBase.value}/checkin/patients/${patientId.value}`, { headers: authHeaders() }),
    $fetch(`${apiBase.value}/checkin/patients/${patientId.value}/responses`, { headers: authHeaders() }),
  ])

  currentWeekStart.value = legacyData.weekStart
  checkInForm.weekStart = legacyData.weekStart
  checkInHistory.value = legacyData.history || []
  templateResponses.value = responsesData.responses || []
  if (legacyData.current) loadCheckInToForm(legacyData.current)
}

const answerRowsFor = (item) => buildAnswerRows(item.template?.steps, item.answers)

const formatTemplatePeriod = (item) =>
  formatCheckinPeriod(item.periodKey, item.template?.frequency)

const loadFoodDiary = async () => {
  const data = await $fetch(`${apiBase.value}/patients/${patientId.value}/food-diary`, {
    headers: authHeaders(),
  })
  foodDiary.value = data.entries || []
}

const loadMealPlanDetail = async () => {
  const data = await $fetch(`${apiBase.value}/patients/${patientId.value}/meal-plan`, {
    headers: authHeaders(),
  })
  mealPlan.value = data.plan
}

const loadAll = async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadOverview(), loadCheckIns(), loadFoodDiary()])
    if (activeTab.value === 'plano' && !mealPlan.value?.plan?.meals) {
      await loadMealPlanDetail()
    }
  } catch (err) {
    error.value = err.data?.message || err.data?.error || 'Não foi possível carregar a paciente.'
  } finally {
    loading.value = false
  }
}

const saveCheckIn = async () => {
  savingCheckIn.value = true
  checkInMessage.value = ''
  checkInError.value = false
  try {
    await $fetch(`${apiBase.value}/checkin/patients/${patientId.value}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: {
        weekStart: checkInForm.weekStart,
        mood: checkInForm.mood,
        energy: checkInForm.energy,
        adherence: checkInForm.adherence,
        weightKg: checkInForm.weightKg || null,
        notes: checkInForm.notes,
      },
    })
    checkInMessage.value = 'Check-in salvo com sucesso.'
    await Promise.all([loadCheckIns(), loadOverview()])
  } catch (err) {
    checkInError.value = true
    checkInMessage.value = err.data?.message || 'Erro ao salvar check-in.'
  } finally {
    savingCheckIn.value = false
  }
}

const onPlanFileChange = (event) => {
  planFile.value = event.target.files?.[0] || null
}

const uploadMealPlan = async () => {
  if (!planFile.value) return
  uploadingPlan.value = true
  planMessage.value = ''
  planError.value = false
  try {
    const formData = new FormData()
    formData.append('file', planFile.value)
    await $fetch(resolveUploadApiUrl(`/patients/${patientId.value}/meal-plan/upload`, apiBase.value), {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    planMessage.value = 'Plano importado com sucesso.'
    planFile.value = null
    await Promise.all([loadMealPlanDetail(), loadOverview()])
  } catch (err) {
    planError.value = true
    planMessage.value = err.data?.message || 'Erro ao importar PDF.'
  } finally {
    uploadingPlan.value = false
  }
}

const savePatient = async () => {
  savingPatient.value = true
  try {
    const updated = await $fetch(`${apiBase.value}/users/${patientId.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        name: editForm.name,
        plan: editForm.plan,
        status: editForm.status,
        accessExpiresAt: editForm.accessExpiresAt || null,
      },
    })
    showEditModal.value = false
    if (overview.value?.patient) {
      overview.value.patient = { ...overview.value.patient, ...updated }
    }
    editForm.name = updated.name
    editForm.plan = updated.plan || 'FREE'
    editForm.status = updated.status || 'ATIVO'
    editForm.accessExpiresAt = toDateInputValue(updated.accessExpiresAt)
  } catch (err) {
    alert(err.data?.error || 'Erro ao salvar cadastro.')
  } finally {
    savingPatient.value = false
  }
}

watch(showEditModal, (open) => {
  if (!open || !overview.value?.patient) return
  const patient = overview.value.patient
  editForm.name = patient.name
  editForm.plan = patient.plan || 'FREE'
  editForm.status = patient.status || 'ATIVO'
  editForm.accessExpiresAt = toDateInputValue(patient.accessExpiresAt)
})

watch(activeTab, async (tab) => {
  if (tab === 'plano' && !mealPlan.value?.plan?.meals) {
    await loadMealPlanDetail().catch(() => {})
  }
})

onMounted(loadAll)
</script>

<style scoped>
.patient-detail-page {
  --primary: #8B967C;
}

.loading-state,
.error-state {
  padding: 4rem 0;
  text-align: center;
  color: #666;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.back-link {
  display: inline-block;
  color: #666;
  text-decoration: none;
  margin-bottom: 1rem;
  font-weight: 600;
}

.patient-head {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 0.25rem;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}

.user-tag {
  display: inline-block;
  padding: 0.22rem 0.55rem;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}

.user-tag--plan-free {
  background: #f3f4f6;
  color: #4b5563;
}

.user-tag--plan-premium {
  background: #eff6ff;
  color: #1d4ed8;
}

.user-tag--plan-platinum {
  background: #f5f3ff;
  color: #6d28d9;
}

.user-tag--status-ativo {
  background: #ecfdf3;
  color: #15803d;
}

.user-tag--status-inativo {
  background: #f3f4f6;
  color: #6b7280;
}

.user-tag--status-pendente {
  background: #fff7ed;
  color: #c2410c;
}

.user-tag--access-expired {
  background: #fef2f2;
  color: #b91c1c;
}

.muted { color: #888; font-size: 0.9rem; }

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
}

.tab-btn.active {
  background: #f0fdf4;
  color: var(--primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.resumo-nutrition-panel {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
}

.stat-card--nutrition small {
  line-height: 1.45;
}

.stat-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 1.25rem;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: #888;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.stat-card strong {
  display: block;
  font-size: 1.6rem;
  color: #111;
}

.stat-card small {
  color: #888;
}

.stat-card small.warn { color: #d97706; }

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 1.25rem;
}

.info-card h3 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.mini-row,
.bella-row {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f5f5f5;
}

.diary-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f5f5f5;
}

.diary-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f3f3;
}

.diary-body {
  flex: 1;
  min-width: 0;
}

.mini-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.bella-topic {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--primary);
  text-transform: uppercase;
}

.template-responses-block {
  margin-bottom: 1.5rem;
}

.template-responses-block h3 {
  margin: 0 0 1rem;
}

.template-response-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.template-response-head strong {
  display: block;
  font-size: 1rem;
}

.template-response-head p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: #737373;
}

.template-response-answers {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.65rem;
}

.template-response-answers li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  background: #f9fafb;
  font-size: 0.9rem;
}

.template-response-answers span {
  color: #6b7280;
  font-weight: 600;
}

.legacy-checkin-details {
  margin-top: 1rem;
}

.legacy-checkin-details summary {
  cursor: pointer;
  font-weight: 700;
  color: #4b5563;
  margin-bottom: 1rem;
}

.checkin-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.checkin-form-card,
.history-panel {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 1.5rem;
}

.checkin-form-card input:not(.cf-date-input-field),
.checkin-form-card textarea {
  width: 100%;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  padding: 0.75rem 0.9rem;
  font-family: inherit;
  font-size: 0.9rem;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.checkin-form-card input:not(.cf-date-input-field):focus,
.checkin-form-card textarea:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.checkin-form-card label {
  display: block;
  font-weight: 600;
  margin: 0.75rem 0 0.35rem;
  font-size: 0.85rem;
  color: #444;
}

.score-grid {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}

.score-field span {
  font-weight: 800;
  color: var(--primary);
}

.history-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.history-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.history-scores {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.history-notes {
  margin-top: 0.5rem;
  color: #555;
  font-size: 0.9rem;
}

.plan-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.meals-list {
  margin-bottom: 1.5rem;
}

.meal-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f5f5f5;
}

.meal-item ul {
  margin: 0.35rem 0 0 1rem;
  color: #555;
}

.upload-form {
  border-top: 1px solid #eee;
  padding-top: 1.25rem;
}

.btn-primary,
.btn-secondary,
.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  margin-top: 1rem;
}

.btn-secondary {
  background: #f4f7f6;
  color: #333;
  border: 1px solid #e5e5e5;
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
}

.form-msg { margin-top: 0.75rem; color: #8B967C; }
.form-msg.error { color: #c53030; }

.empty { color: #aaa; padding: 1rem 0; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  width: min(420px, 92vw);
}

.modal-card label {
  display: block;
  font-weight: 600;
  margin: 0.75rem 0 0.35rem;
}

.modal-card input:not(.field input),
.modal-card select:not(.field select) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #eee;
  border-radius: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #9ca3af;
}

@media (max-width: 900px) {
  .two-col,
  .checkin-layout {
    grid-template-columns: 1fr;
  }

  .patient-detail-page {
    padding: 1rem 1rem 3rem;
  }
}
</style>
