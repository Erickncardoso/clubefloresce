<template>
  <NuxtPage v-if="isDocumentoChildRoute" />

  <NuxtLayout v-else name="dashboard">
    <div class="patient-chart-page admin-shell">
      <PatientChartPageSkeleton v-if="loading || resolvingRoute" />

      <div v-else-if="routeError || error" class="pc-state pc-state--error">
        <p>{{ routeError || error }}</p>
        <NuxtLink to="/usuarios" class="btn-secondary">Voltar para pacientes</NuxtLink>
      </div>

      <template v-else-if="user">
        <PatientsPatientChartHeader
          :user="user"
          :profile="profile"
          :overview="overview"
          :section-label="activeTabLabel"
          @edit-patient="openEditPatientModal"
          @start-call="openVideoCall"
        />

        <section v-if="activeTab === 'visao'" class="pc-panel">
          <PatientsPatientChartOverview
            :patient-id="patientId"
            :profile="profile"
            :overview="overview"
            @navigate-evolucao="onNavigateEvolucao"
          />
        </section>

        <section v-else-if="activeTab === 'anamnese'" class="pc-panel">
          <PatientsPatientAnamneseWorkspace
            :user="user"
            :profile="profile"
            @saved="onAnamneseSaved"
          />
        </section>

        <section v-else-if="activeTab === 'planos'" class="pc-panel">
          <PatientsPatientMealPlanWorkspace
            :user="user"
            :profile="profile"
            :meal-plan="mealPlan"
            :uploading="uploadingPlan"
            @saved="onAnamneseSaved"
            @open-pdf="openMealPlanPdf"
            @upload="onMealPlanUpload"
          />
        </section>

        <section v-else-if="activeTab === 'orientacoes'" class="pc-panel">
          <PatientsPatientOrientacoesWorkspace
            :user="user"
            :profile="profile"
            @saved="onAnamneseSaved"
          />
        </section>

        <section v-else-if="activeTab === 'documentos'" class="pc-panel">
          <PatientsPatientDocumentosWorkspace
            :user="user"
            :profile="profile"
            @saved="onAnamneseSaved"
          />
        </section>

        <section v-else-if="activeTab === 'antropometria'" class="pc-panel">
          <PatientsPatientAntropometriaWorkspace
            :user="user"
            :profile="profile"
            @saved="onAnamneseSaved"
          />
        </section>

        <section v-else-if="activeTab === 'gastos'" class="pc-panel">
          <PatientsPatientChartEmptyState
            :icon="HeartPulse"
            title="Calcule o primeiro gasto energético"
            description="Registre o gasto energético do paciente para estimar suas necessidades calóricas, definir metas e elaborar planos alimentares mais precisos."
            action-label="+ Novo cálculo"
          />
        </section>

        <section v-else-if="activeTab === 'exames'" class="pc-panel">
          <PatientsPatientExamesWorkspace
            :user="user"
            :profile="profile"
            @saved="onAnamneseSaved"
          />
        </section>

        <section v-else-if="activeTab === 'prescricoes'" class="pc-panel">
          <PatientsPatientChartEmptyState
            :icon="Leaf"
            title="Nada prescrito por enquanto"
            description="Cadastre suplementações, orientações e protocolos para compartilhar com o paciente em poucos cliques."
            action-label="+ Nova prescrição"
          />
        </section>

        <section v-else-if="activeTab === 'pagamentos'" class="pc-panel">
          <PatientsPatientChartEmptyState
            :icon="Wallet"
            title="Controle financeiro em um só lugar"
            description="Registre cobranças, recibos e status de pagamento para acompanhar a jornada do paciente com transparência."
            action-label="+ Adicionar pagamento"
          />
        </section>

        <section v-else-if="activeTab === 'arquivos'" class="pc-panel">
          <PatientsPatientChartEmptyState
            :icon="Paperclip"
            title="Nenhum arquivo enviado ainda"
            description="Armazene documentos, fotos e relatórios importantes para acompanhar o paciente com segurança e praticidade."
            action-label="+ Adicionar arquivo"
          />
        </section>

        <section v-else-if="activeTab === 'questionarios'" class="pc-panel">
          <PatientsPatientChartEmptyState
            :icon="ListChecks"
            title="Crie questionários para seus pacientes"
            description="Monte questionários para conduzir o atendimento com contexto completo e acompanhar respostas ao longo do tempo."
            action-label="+ Novo questionário"
          />
        </section>

        <section v-else-if="activeTab === 'evolucao'" class="pc-panel">
          <div class="pc-subtabs">
            <NuxtLink
              v-for="sub in evolucaoSubs"
              :key="sub.id"
              :to="chartEvolucaoSubTo(sub.id)"
              class="pc-subtab"
              :class="{ 'pc-subtab--active': evolucaoSubTab === sub.id }"
            >
              {{ sub.label }}
            </NuxtLink>
          </div>

          <div v-if="evolucaoSubTab === 'checkins'" class="pc-card">
            <h3>Respostas do paciente</h3>
            <article
              v-for="item in templateResponses"
              :key="item.id"
              class="pc-response"
            >
              <div class="pc-response-head">
                <strong>{{ item.template?.title || 'Check-in' }}</strong>
                <p>{{ formatTemplatePeriod(item) }} · {{ formatDateTime(item.updatedAt) }}</p>
              </div>
              <ul>
                <li v-for="row in answerRowsFor(item)" :key="row.id">
                  <span>{{ row.label }}</span>
                  <strong>{{ row.value }}</strong>
                </li>
              </ul>
            </article>
            <p v-if="!templateResponses.length" class="pc-empty">Nenhuma resposta de check-in ainda.</p>

            <details class="pc-legacy">
              <summary>Registro manual (legado)</summary>
              <form class="pc-checkin-form" @submit.prevent="onSaveCheckIn">
                <label for="pc-week">Semana</label>
                <SharedCfSelect id="pc-week" v-model="checkInForm.weekStart" :options="weekSelectOptions" />

                <div class="pc-scores">
                  <label>Humor {{ checkInForm.mood }}
                    <input v-model.number="checkInForm.mood" type="range" min="1" max="5">
                  </label>
                  <label>Energia {{ checkInForm.energy }}
                    <input v-model.number="checkInForm.energy" type="range" min="1" max="5">
                  </label>
                  <label>Aderência {{ checkInForm.adherence }}
                    <input v-model.number="checkInForm.adherence" type="range" min="1" max="5">
                  </label>
                </div>

                <label for="pc-weight">Peso (kg)</label>
                <input id="pc-weight" v-model="checkInForm.weightKg" type="number" step="0.1" min="20" max="500">

                <label for="pc-notes">Observações</label>
                <textarea id="pc-notes" v-model="checkInForm.notes" rows="3" />

                <button type="submit" class="btn-primary" :disabled="savingCheckIn">
                  {{ savingCheckIn ? 'Salvando…' : 'Salvar check-in' }}
                </button>
                <p v-if="checkInMessage" class="pc-msg" :class="{ error: checkInError }">{{ checkInMessage }}</p>
              </form>

              <div class="pc-history">
                <article
                  v-for="item in checkInHistory"
                  :key="item.id"
                  class="pc-history-card"
                  @click="loadCheckInToForm(item)"
                >
                  <strong>{{ formatWeek(item.weekStart) }}</strong>
                  <div>
                    <span>Humor {{ item.mood }}/5</span>
                    <span>Energia {{ item.energy }}/5</span>
                    <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
                  </div>
                </article>
              </div>
            </details>
          </div>

          <div v-else-if="evolucaoSubTab === 'nutricao'" class="pc-card">
            <h3>Panorama nutricional</h3>
            <EvolucaoNutritionMonthView :patient-id="patientId" />
          </div>

          <div v-else-if="evolucaoSubTab === 'metas'" class="pc-card">
            <h3>Metas do paciente</h3>
            <PatientsPatientGoalsPanel
              :patient-id="patientId"
              :nutrition-target="overview?.nutritionTarget"
            />
          </div>

          <div v-else-if="evolucaoSubTab === 'fotos'" class="pc-card">
            <h3>Fotos de refeições</h3>
            <PatientsPatientPhotosPanel :patient-id="patientId" />
          </div>

          <div v-else-if="evolucaoSubTab === 'diario'" class="pc-card">
            <h3>Registros recentes do diário</h3>
            <div v-if="!foodDiary.length" class="pc-empty">Nenhuma refeição registrada.</div>
            <div v-for="entry in foodDiary" :key="entry.id" class="pc-diary">
              <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" loading="lazy">
              <div>
                <strong>{{ entry.mealLabel || entry.mealType }}</strong>
                <span>{{ formatDiaryDate(entry.entryDate) }}</span>
                <div class="pc-macros">
                  <span v-if="entry.caloriesKcal">{{ Math.round(entry.caloriesKcal) }} kcal</span>
                  <span v-if="entry.proteinG">P {{ Math.round(entry.proteinG) }}g</span>
                  <span v-if="entry.carbsG">C {{ Math.round(entry.carbsG) }}g</span>
                  <span v-if="entry.fatG">G {{ Math.round(entry.fatG) }}g</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>

      <PatientsQuickAddPatientModal
        :open="showEditPatientModal"
        mode="edit"
        :seed="editPatientSeed"
        :user-id="patientId"
        @close="showEditPatientModal = false"
        @updated="onEditPatientUpdated"
      />

      <PatientsPatientVideoCallModal
        :open="videoCallOpen"
        :patient-id="patientId"
        :patient-name="user?.name || ''"
        @close="videoCallOpen = false"
      />

      <PatientAnamneseEditorModal
        v-if="user && floatingAnamnese.isOpenForPatient(patientId)"
        v-model:sheet-open="floatingAnamnese.open"
        v-model:collapsed="floatingAnamnese.collapsed"
        :seed="floatingAnamnese.seed"
        :user="user"
        :profile="profile"
        @saved="onAnamneseSaved"
        @closed="floatingAnamnese.closeEditor()"
      />
    </div>
  </NuxtLayout>
</template>

<script setup>
import {
  HeartPulse,
  Leaf,
  ListChecks,
  Paperclip,
  Wallet,
} from 'lucide-vue-next'
import { buildAnswerRows, formatCheckinPeriod } from '~/utils/checkin-answers'
import { usePatientChart } from '~/composables/usePatientChart.js'
import { usePatientRoute } from '~/composables/usePatientRoute.js'
import { buildPatientChartTabLink } from '~/utils/patient-slug.js'
import { usePatientDocument } from '~/composables/usePatientDocument'
import { userToQuickAddSeed } from '~/composables/useQuickAddPatient.js'
import { authFetchInit } from '~/composables/useAuthSession.js'
import PatientChartPageSkeleton from '~/components/patients/PatientChartPageSkeleton.vue'
import PatientAnamneseEditorModal from '~/components/patients/PatientAnamneseEditorModal.vue'
import { useFloatingAnamnese } from '~/composables/useFloatingAnamnese.js'

definePageMeta({
  layout: false,
  middleware: 'nutri-only',
})

const route = useRoute()
const router = useRouter()
const {
  patientId,
  resolvingRoute,
  routeError,
  syncCanonicalPatientUrl,
  buildPatientPath: buildPatientUrl,
} = usePatientRoute()
const isDocumentoChildRoute = computed(() =>
  /\/documentos\/[^/]+$/.test(String(route.path || '').replace(/\/$/, '')),
)
const apiBase = useApiBase()
const { openDocument, resolveDocumentUrl } = usePatientDocument()

const {
  tabs,
  activeTab,
  evolucaoSubTab,
  loading,
  error,
  user,
  profile,
  overview,
  mealPlan,
  foodDiary,
  checkInHistory,
  templateResponses,
  currentWeekStart,
  loadAll,
  loadMealPlanDetail,
  uploadMealPlan,
  saveCheckIn,
} = usePatientChart(patientId)

const floatingAnamnese = useFloatingAnamnese()

watch(patientId, (nextId, prevId) => {
  if (!prevId || nextId === prevId) return
  if (floatingAnamnese.patientId.value && floatingAnamnese.patientId.value !== nextId) {
    floatingAnamnese.closeEditor()
  }
  if (!isDocumentoChildRoute.value && !resolvingRoute.value) loadAll()
})

const activeTabLabel = computed(() => {
  const tab = tabs.find((item) => item.id === activeTab.value)
  return tab?.label || ''
})

const isLegacyDocumentoRedirect = computed(() => Boolean(String(route.query.doc || '').trim()))

watch(
  () => route.query.doc,
  (doc) => {
    const id = String(doc || '').trim()
    if (!id || !patientId.value) return
    const patient = user.value || { id: patientId.value }
    void router.replace(buildPatientUrl(patient, { suffix: `/documentos/${id}` }))
  },
  { immediate: true },
)

watch(user, (nextUser) => {
  if (nextUser?.id) void syncCanonicalPatientUrl(nextUser)
})

const mealPlanPdfUrl = computed(() => resolveDocumentUrl(mealPlan.value?.pdfUrl || ''))

function openMealPlanPdf() {
  void openMealPlanPdfBlob()
}

async function openMealPlanPdfBlob() {
  if (!mealPlan.value?.pdfUrl) return

  try {
    const response = await fetch(
      `${apiBase.value}/patients/${patientId.value}/meal-plan/pdf`,
      authFetchInit(),
    )
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    const blob = new Blob([buffer], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(blob)
    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      const link = document.createElement('a')
      link.href = objectUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = mealPlan.value?.fileName || 'plano-alimentar.pdf'
      link.click()
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (err) {
    console.error('[meal-plan-pdf]', err)
    if (mealPlanPdfUrl.value) {
      openDocument(mealPlanPdfUrl.value, {
        title: mealPlan.value?.fileName || mealPlan.value?.title || 'Plano alimentar',
      })
    }
  }
}

function openEditPatientModal() {
  showEditPatientModal.value = true
}

function openVideoCall() {
  videoCallOpen.value = true
}

function onEditPatientUpdated(updated) {
  onAnamneseSaved(updated)
  showEditPatientModal.value = false
}

watch(
  [patientId, resolvingRoute, isDocumentoChildRoute],
  ([id, resolving, isDocRoute]) => {
    if (!id || resolving || isDocRoute) return
    loadAll()
  },
  { immediate: true },
)

const evolucaoSubs = [
  { id: 'checkins', label: 'Check-ins' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'metas', label: 'Metas' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'diario', label: 'Diário' },
]

const showEditPatientModal = ref(false)
const editPatientSeed = computed(() => userToQuickAddSeed(user.value))
const videoCallOpen = ref(false)
const savingCheckIn = ref(false)
const checkInMessage = ref('')
const checkInError = ref(false)
const uploadingPlan = ref(false)

const checkInForm = reactive({
  weekStart: '',
  mood: 3,
  energy: 3,
  adherence: 3,
  weightKg: '',
  notes: '',
})

const weekSelectOptions = computed(() => {
  const options = [{ value: currentWeekStart.value, label: 'Semana atual' }]
  for (const item of checkInHistory.value) {
    if (item.weekStart && item.weekStart !== currentWeekStart.value) {
      options.push({ value: item.weekStart, label: formatWeek(item.weekStart) })
    }
  }
  return options.filter((option) => option.value)
})

function chartTabTo(tabId) {
  return buildPatientChartTabLink(route.path, tabId, {
    sub: evolucaoSubTab.value,
    query: route.query,
  })
}

function chartEvolucaoSubTo(subId) {
  return buildPatientChartTabLink(route.path, 'evolucao', {
    sub: subId,
    query: route.query,
  })
}

function onNavigateEvolucao(sub) {
  void router.push(chartEvolucaoSubTo(sub))
}

function onAnamneseSaved(updated) {
  if (!updated) return
  user.value = updated
  if (overview.value?.patient) {
    overview.value.patient = {
      ...overview.value.patient,
      name: updated.name,
      phone: updated.phone,
      avatar: updated.avatar,
      patientProfileData: updated.patientProfileData,
    }
  }
}

function loadCheckInToForm(item) {
  checkInForm.weekStart = item.weekStart
  checkInForm.mood = item.mood
  checkInForm.energy = item.energy
  checkInForm.adherence = item.adherence ?? 3
  checkInForm.weightKg = item.weightKg ?? ''
  checkInForm.notes = item.notes ?? ''
}

watch(currentWeekStart, (week) => {
  if (week && !checkInForm.weekStart) checkInForm.weekStart = week
})

watch(checkInHistory, (history) => {
  if (history?.[0] && !checkInForm.weekStart) loadCheckInToForm(history[0])
}, { immediate: true })

const answerRowsFor = (item) => buildAnswerRows(item.template?.steps, item.answers)
const formatTemplatePeriod = (item) =>
  formatCheckinPeriod(item.periodKey, item.template?.frequency)

function formatWeek(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDiaryDate(value) {
  if (!value) return '—'
  const text = typeof value === 'string' ? value.slice(0, 10) : value
  return new Date(`${text}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

async function onSaveCheckIn() {
  savingCheckIn.value = true
  checkInMessage.value = ''
  checkInError.value = false
  try {
    await saveCheckIn({
      weekStart: checkInForm.weekStart,
      mood: checkInForm.mood,
      energy: checkInForm.energy,
      adherence: checkInForm.adherence,
      weightKg: checkInForm.weightKg || null,
      notes: checkInForm.notes,
    })
    checkInMessage.value = 'Check-in salvo com sucesso.'
  } catch (err) {
    checkInError.value = true
    checkInMessage.value = err?.data?.message || 'Erro ao salvar check-in.'
  } finally {
    savingCheckIn.value = false
  }
}

async function onMealPlanUpload({ file, onSuccess, onError }) {
  uploadingPlan.value = true
  try {
    await uploadMealPlan(file)
    await onSuccess?.('PDF importado com sucesso.')
  } catch (err) {
    onError?.(err?.data?.message || 'Não foi possível importar o PDF.')
  } finally {
    uploadingPlan.value = false
  }
}

watch(
  activeTab,
  async (tab) => {
    if (tab === 'planos') {
      try {
        await loadMealPlanDetail()
      } catch {
        /* ignore */
      }
    }
  },
)
</script>

<style scoped>
.patient-chart-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

.pc-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7368;
}

.pc-state--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  color: #c53030;
}

.pc-upload--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.pc-empty-state__btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.pc-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.pc-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pc-subtab {
  border: 1.5px solid #e8ece9;
  background: #fff;
  padding: 0.45rem 0.75rem;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  color: #6b7368;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.pc-subtab--active {
  border-color: #8b967c;
  background: rgba(139, 150, 124, 0.14);
  color: #2c322c;
}

.pc-card {
  background: #fff;
  border: 1.5px solid #e8ece9;
  padding: 1.1rem 1.2rem;
}

.pc-card h3 {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  color: #2c322c;
}

.pc-empty,
.pc-muted {
  color: #8a9288;
  font-size: 0.88rem;
}

.pc-response {
  border: 1px solid #eef1ee;
  padding: 0.85rem;
  margin-bottom: 0.65rem;
}

.pc-response-head p {
  margin: 0.2rem 0 0;
  color: #8a9288;
  font-size: 0.8rem;
}

.pc-response ul {
  list-style: none;
  margin: 0.65rem 0 0;
  padding: 0;
}

.pc-response li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f3f5f3;
  font-size: 0.86rem;
}

.pc-legacy {
  margin-top: 1rem;
}

.pc-checkin-form,
.pc-upload {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.pc-upload-label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: #5f675f;
}

.pc-upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.pc-upload-pick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  padding: 0.4rem 0.9rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #2c322c;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.pc-upload-pick:hover {
  background: rgba(139, 150, 124, 0.08);
  border-color: rgba(139, 150, 124, 0.35);
  color: #3f4a3a;
}

.pc-upload-pick--disabled {
  opacity: 0.65;
  cursor: wait;
  pointer-events: none;
}

.pc-upload-pick-icon {
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 1.7;
  color: #8b967c;
}

.pc-upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pc-upload-filename {
  min-width: 0;
  flex: 1 1 10rem;
  font-size: 0.78rem;
  font-weight: 400;
  color: #2c322c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-upload-filename--empty {
  color: #8a9288;
}

.pc-upload-hint {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 400;
  color: #8a9288;
  line-height: 1.4;
}

.pc-upload-submit {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.pc-scores {
  display: grid;
  gap: 0.55rem;
}

.pc-history {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.pc-history-card {
  border: 1px solid #eef1ee;
  padding: 0.7rem 0.85rem;
  cursor: pointer;
}

.pc-history-card div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.35rem;
  color: #6b7368;
  font-size: 0.82rem;
}

.pc-diary {
  display: flex;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #eef1ee;
}

.pc-diary img {
  width: 56px;
  height: 56px;
  object-fit: cover;
}

.pc-macros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: #6b7368;
  font-size: 0.8rem;
}

.pc-plan-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.pc-pdf-btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
  text-decoration: none !important;
  gap: 0.4rem !important;
}

.pc-pdf-btn-icon {
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 1.7;
  color: #8b967c;
}

.pc-meals {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0;
}

.pc-meal {
  border: 1px solid #eef1ee;
  padding: 0.75rem 0.85rem;
}

.pc-meal ul {
  margin: 0.45rem 0 0;
  padding-left: 1.1rem;
  color: #6b7368;
  font-size: 0.86rem;
}

.pc-docs p {
  margin: 0 0 0.55rem;
  color: #2c322c;
  line-height: 1.45;
}

.pc-msg {
  margin: 0;
  font-size: 0.86rem;
  color: #2f6b3a;
}

.pc-msg.error {
  color: #c53030;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.4);
}

.modal-card {
  width: min(440px, 100%);
  background: #fff;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.modal-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
}

.field-hint {
  margin: 0;
  color: #8a9288;
  font-size: 0.8rem;
}
</style>
