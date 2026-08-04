<template>
  <NuxtLayout name="dashboard">
    <div class="admin-home admin-shell">
      <p class="admin-home-greeting">Olá, {{ greetingName }}</p>

      <div class="bento-grid">
        <section class="bento-card bento-card--patients admin-shell-card">
          <div class="bento-card-head">
            <div>
              <h2>Últimos pacientes</h2>
              <p>Cadastros mais recentes no portal</p>
            </div>
            <button type="button" class="bento-cta" @click="showQuickAdd = true">
              <UserPlus class="bento-cta-icon" />
              Adicionar paciente
            </button>
          </div>

          <div v-if="loading" class="bento-empty">
            <Loader2 class="bento-spinner" />
            <span>Carregando…</span>
          </div>
          <ul v-else-if="recentPatients.length" class="patient-list">
            <li v-for="patient in recentPatients" :key="patient.id">
              <NuxtLink :to="patientChartUrl(patient)" class="patient-row">
                <PatientAvatar :src="patient.avatar" :name="patient.name" :user="patient" size="sm" :ring="false" />
                <div class="patient-copy">
                  <strong>{{ patient.name }}</strong>
                  <span>{{ patient.email || 'Sem e-mail' }}</span>
                </div>
                <time>{{ formatRelative(patient.createdAt) }}</time>
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="bento-empty">Nenhum paciente cadastrado ainda.</p>
        </section>

        <section class="bento-card bento-card--schedules admin-shell-card">
          <div class="bento-card-head">
            <div>
              <h2>Agendamentos</h2>
              <p>Check-ins programados</p>
            </div>
            <NuxtLink to="/check-in" class="admin-home-link">Ver todos</NuxtLink>
          </div>

          <div v-if="loading" class="bento-empty">
            <Loader2 class="bento-spinner" />
            <span>Carregando…</span>
          </div>
          <ul v-else-if="schedules.length" class="schedule-list">
            <li v-for="item in schedules" :key="item.id">
              <span class="schedule-dot" aria-hidden="true" />
              <div>
                <strong>{{ item.templateTitle || 'Check-in' }}</strong>
                <span>{{ formatScheduleWhen(item.scheduledAt) }}</span>
              </div>
              <small>{{ item.allPatients ? 'Todos' : `${(item.userIds || []).length} pac.` }}</small>
            </li>
          </ul>
          <p v-else class="bento-empty">Nenhum agendamento pendente.</p>
        </section>

        <section class="bento-card bento-card--engagement admin-shell-card">
          <div class="bento-card-head">
            <div>
              <h2>Status de engajamento</h2>
              <p>Diário, hidratação, chat e questionários</p>
            </div>
          </div>

          <div class="engagement-row">
            <article
              v-for="bucket in engagementBuckets"
              :key="bucket.key"
              class="engagement-pill"
              :class="`engagement-pill--${bucket.key}`"
            >
              <div class="engagement-pill-top">
                <span class="engagement-count">{{ bucket.count }}</span>
                <button
                  v-if="bucket.key === 'danger' && bucket.count > 0"
                  type="button"
                  class="danger-wa-btn"
                  :disabled="dangerWa.sending"
                  :title="dangerWa.sending ? 'Envio em andamento…' : 'Enviar WhatsApp para todas'"
                  @click="openDangerWaModal"
                >
                  <WhatsAppIcon class="danger-wa-btn-icon" />
                  <span>{{ dangerWa.sending ? 'Enviando…' : 'WhatsApp' }}</span>
                </button>
              </div>
              <div>
                <strong>{{ bucket.label }}</strong>
                <span>{{ bucket.hint }}</span>
              </div>
              <ul v-if="bucket.patients.length" class="engagement-names">
                <li v-for="patient in bucket.patients" :key="patient.id">
                  <NuxtLink
                    :to="patientChartUrl(patient)"
                    class="engagement-patient-btn"
                    :title="`Abrir ficha de ${patient.name}`"
                  >
                    <PatientAvatar
                      :src="patient.avatar"
                      :name="patient.name"
                      :user="patient"
                      size="sm"
                      :ring="false"
                    />
                    <span>{{ patient.name }}</span>
                    <ChevronRight class="engagement-patient-arrow" />
                  </NuxtLink>
                </li>
              </ul>
              <p v-else class="engagement-empty">Sem pacientes nesta faixa</p>
              <p v-if="bucket.key === 'danger' && dangerWa.statusText" class="danger-wa-status">
                {{ dangerWa.statusText }}
              </p>
            </article>
          </div>
        </section>

        <section class="bento-card bento-card--feed admin-shell-card">
          <div class="bento-card-head">
            <div>
              <h2>Feed do diário</h2>
              <p>Últimas refeições registradas</p>
            </div>
          </div>

          <div v-if="loading" class="bento-empty">
            <Loader2 class="bento-spinner" />
            <span>Carregando…</span>
          </div>
          <ul v-else-if="diaryFeed.length" class="feed-list">
            <li v-for="entry in diaryFeed" :key="entry.id">
              <NuxtLink :to="patientChartUrl(entry.patient)" class="feed-row">
                <div class="feed-thumb" :class="{ 'feed-thumb--empty': !entry.imageUrl }">
                  <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" loading="lazy" />
                  <UtensilsCrossed v-else class="feed-thumb-icon" />
                </div>
                <div class="feed-copy">
                  <strong>{{ entry.patient?.name || 'Paciente' }}</strong>
                  <span>{{ entry.mealLabel || entry.mealType || 'Refeição' }}</span>
                </div>
                <div class="feed-meta">
                  <strong>{{ Math.round(entry.caloriesKcal || 0) }} kcal</strong>
                  <time>{{ formatRelative(entry.createdAt) }}</time>
                </div>
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="bento-empty">Nenhuma refeição registrada recentemente.</p>
        </section>

        <section class="bento-card bento-card--consumption admin-shell-card">
          <div class="bento-card-head">
            <div>
              <h2>Consumo alimentar</h2>
              <p>Resumo de hoje · {{ consumption.date || '—' }}</p>
            </div>
          </div>

          <div class="consumption-stats">
            <div>
              <span>Pacientes</span>
              <strong>{{ consumption.totals.patients }}</strong>
            </div>
            <div>
              <span>Refeições</span>
              <strong>{{ consumption.totals.meals }}</strong>
            </div>
            <div>
              <span>Kcal total</span>
              <strong>{{ Math.round(consumption.totals.caloriesKcal) }}</strong>
            </div>
          </div>

          <div v-if="loading" class="bento-empty">
            <Loader2 class="bento-spinner" />
            <span>Carregando…</span>
          </div>
          <ul v-else-if="consumption.patients.length" class="consumption-list">
            <li v-for="item in consumption.patients" :key="item.patient.id">
              <NuxtLink :to="patientChartUrl(item.patient)" class="consumption-row">
                <PatientAvatar
                  :src="item.patient.avatar"
                  :name="item.patient.name"
                  :user="item.patient"
                  size="sm"
                  :ring="false"
                />
                <div class="consumption-copy">
                  <strong>{{ item.patient.name }}</strong>
                  <span>{{ item.meals }} refeição(ões)</span>
                </div>
                <div class="consumption-macros">
                  <strong>{{ Math.round(item.caloriesKcal) }} kcal</strong>
                  <span>P {{ Math.round(item.proteinG) }} · C {{ Math.round(item.carbsG) }} · G {{ Math.round(item.fatG) }}</span>
                </div>
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="bento-empty">Nenhum consumo registrado hoje.</p>
        </section>
      </div>

      <Teleport to="body">
        <div
          v-if="dangerWa.modalOpen"
          class="danger-wa-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="danger-wa-title"
          @click.self="closeDangerWaModal"
        >
          <div class="danger-wa-dialog">
            <h3 id="danger-wa-title">Confirmar envio no WhatsApp</h3>
            <p class="danger-wa-modal-hint">
              Confira a mensagem abaixo. Ao clicar em <strong>Enviar</strong>, ela vai para as
              <strong>{{ engagement.danger.length }}</strong> pacientes da zona de perigo,
              uma a uma, com <strong>20 segundos</strong> de intervalo.
            </p>
            <label class="danger-wa-label" for="danger-wa-message">Mensagem que será enviada</label>
            <textarea
              id="danger-wa-message"
              v-model="dangerWa.message"
              rows="9"
              class="danger-wa-textarea"
            />
            <p class="danger-wa-vars">{{ dangerWaVarsHint }}</p>
            <div class="danger-wa-actions">
              <button type="button" class="btn-secondary" :disabled="dangerWa.starting" @click="closeDangerWaModal">
                Cancelar
              </button>
              <button
                type="button"
                class="btn-primary danger-wa-confirm"
                :disabled="dangerWa.starting || !dangerWa.message.trim()"
                @click="confirmDangerWaSend"
              >
                {{ dangerWa.starting ? 'Iniciando…' : 'Enviar' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <PatientsQuickAddPatientModal
        :open="showQuickAdd"
        mode="create"
        @close="showQuickAdd = false"
        @created="onQuickPatientCreated"
      />

      <PatientsPostCreateConsultationModal
        :open="consultationPrompt.open"
        :patient="consultationPrompt.patient"
        @close="consultationPrompt.open = false"
        @done="onConsultationPromptDone"
      />
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ChevronRight, Loader2, UserPlus, UtensilsCrossed } from 'lucide-vue-next'
import { authHeaders, verifyAuthSession } from '~/composables/useAuthSession.js'
import { buildPatientPath } from '~/utils/patient-slug.js'
import WhatsAppIcon from '~/components/WhatsAppIcon.vue'

const apiBase = useApiBase()
const loading = ref(true)
const greetingName = ref('Nutricionista')
const recentPatients = ref([])
const showQuickAdd = ref(false)
const consultationPrompt = reactive({
  open: false,
  patient: null,
})
const { showToast } = useAppToast()
const schedules = ref([])
const diaryFeed = ref([])
const consumption = reactive({
  date: '',
  totals: { patients: 0, meals: 0, caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  patients: [],
})
const engagement = reactive({
  danger: [],
  attention: [],
  success: [],
})

const DEFAULT_DANGER_WA = `Olá, *{{primeiroNome}}*!

Notei que você está um pouco distante do acompanhamento esta semana.

Que tal registrar sua refeição no *diário alimentar* ou atualizar a *hidratação* no app? Isso me ajuda a cuidar melhor de você.

Se precisar de apoio, é só responder esta mensagem. Estou por aqui.`

const dangerWaVarsHint = 'Variáveis: {{primeiroNome}} · {{nome}}'

const dangerWa = reactive({
  modalOpen: false,
  message: DEFAULT_DANGER_WA,
  starting: false,
  sending: false,
  statusText: '',
})

let dangerWaPollTimer = null

const engagementBuckets = computed(() => [
  {
    key: 'danger',
    label: 'Zona de perigo',
    hint: 'Fora da atenção e do sucesso',
    count: engagement.danger.length,
    patients: engagement.danger.slice(0, 3),
  },
  {
    key: 'attention',
    label: 'Zona de atenção',
    hint: 'Pelo menos 1 registro em 7 dias ou chat parcial',
    count: engagement.attention.length,
    patients: engagement.attention.slice(0, 3),
  },
  {
    key: 'success',
    label: 'Zona de sucesso',
    hint: 'Pelo menos 4 postagens na semana ou chat completo',
    count: engagement.success.length,
    patients: engagement.success.slice(0, 3),
  },
])

function patientChartUrl(patient) {
  if (!patient?.id) return '/usuarios'
  return buildPatientPath(patient)
}

function openDangerWaModal() {
  if (dangerWa.sending) return
  dangerWa.modalOpen = true
}

function closeDangerWaModal() {
  if (dangerWa.starting) return
  dangerWa.modalOpen = false
}

function stopDangerWaPoll() {
  if (dangerWaPollTimer) {
    clearInterval(dangerWaPollTimer)
    dangerWaPollTimer = null
  }
}

async function pollDangerWaStatus() {
  try {
    const data = await $fetch(`${apiBase.value}/patients/engagement-zones/danger/whatsapp`, {
      headers: authHeaders(),
    })
    const job = data?.job
    if (!job) {
      dangerWa.sending = false
      stopDangerWaPoll()
      return
    }
    dangerWa.sending = !job.done
    if (job.done) {
      dangerWa.statusText = `Concluído: ${job.sent} enviada(s), ${job.failed} falha(s)${job.skipped ? `, ${job.skipped} sem telefone` : ''}.`
      stopDangerWaPoll()
      return
    }
    const current = job.currentName ? ` · ${job.currentName}` : ''
    dangerWa.statusText = `Enviando ${job.sent + job.failed}/${job.total}${current} (20s entre cada)`
  } catch {
    /* ignore poll errors */
  }
}

async function confirmDangerWaSend() {
  if (dangerWa.starting || dangerWa.sending) return
  dangerWa.starting = true
  try {
    const data = await $fetch(`${apiBase.value}/patients/engagement-zones/danger/whatsapp`, {
      method: 'POST',
      headers: authHeaders(),
      body: { message: dangerWa.message },
    })
    dangerWa.modalOpen = false
    if (data?.alreadyRunning) {
      dangerWa.sending = true
      dangerWa.statusText = 'Já existe um envio em andamento…'
    } else if (data?.started) {
      dangerWa.sending = true
      const mins = data.estimatedMinutes || Math.ceil((data.total * 20) / 60)
      dangerWa.statusText = `Iniciado: ${data.total} mensagem(ns), ~${mins} min (20s entre cada)`
    } else {
      dangerWa.statusText = data?.message || 'Nada a enviar.'
      dangerWa.sending = false
    }
    if (dangerWa.sending) {
      stopDangerWaPoll()
      dangerWaPollTimer = setInterval(pollDangerWaStatus, 4000)
      await pollDangerWaStatus()
    }
  } catch (err) {
    dangerWa.statusText = err?.data?.message || 'Não foi possível iniciar o envio.'
    dangerWa.sending = false
  } finally {
    dangerWa.starting = false
  }
}

function formatRelative(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

async function onQuickPatientCreated(user) {
  showQuickAdd.value = false
  showToast({
    type: 'success',
    title: 'Paciente cadastrado',
    message: user?.name ? `${user.name} foi adicionado.` : 'Cadastro concluído.',
  })
  if (user?.id) {
    recentPatients.value = [
      user,
      ...recentPatients.value.filter((p) => p.id !== user.id),
    ].slice(0, 6)
    consultationPrompt.patient = user
    consultationPrompt.open = true
  } else {
    await loadDashboard()
  }
}

function onConsultationPromptDone() {
  consultationPrompt.open = false
  consultationPrompt.patient = null
}

function formatScheduleWhen(value) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadDashboard = async () => {
  loading.value = true
  try {
    const user = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
    if (user?.name) greetingName.value = String(user.name).split(' ')[0] || user.name

    const headers = authHeaders()
    const base = apiBase.value

    const [usersResult, schedulesResult, feedResult, consumptionResult, engagementResult] =
      await Promise.allSettled([
        $fetch(`${base}/users`, { headers }),
        $fetch(`${base}/checkin/dispatch/schedules`, { headers }),
        $fetch(`${base}/food-diary/admin/feed?limit=8`, { headers }),
        $fetch(`${base}/food-diary/admin/consumption`, { headers }),
        $fetch(`${base}/patients/engagement-zones`, { headers }),
      ])

    if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
      recentPatients.value = usersResult.value
        .filter((u) => u.role === 'PACIENTE')
        .slice(0, 6)
    }

    if (schedulesResult.status === 'fulfilled') {
      schedules.value = (schedulesResult.value?.schedules || []).slice(0, 5)
    }

    if (feedResult.status === 'fulfilled') {
      diaryFeed.value = feedResult.value?.entries || []
    }

    if (consumptionResult.status === 'fulfilled') {
      const data = consumptionResult.value || {}
      consumption.date = data.date || ''
      consumption.totals = {
        patients: data.totals?.patients || 0,
        meals: data.totals?.meals || 0,
        caloriesKcal: data.totals?.caloriesKcal || 0,
        proteinG: data.totals?.proteinG || 0,
        carbsG: data.totals?.carbsG || 0,
        fatG: data.totals?.fatG || 0,
      }
      consumption.patients = data.patients || []
    }

    if (engagementResult.status === 'fulfilled') {
      const zones = engagementResult.value?.zones || {}
      engagement.danger = zones.danger || []
      engagement.attention = zones.attention || []
      engagement.success = zones.success || []
    }
  } catch (err) {
    console.warn('Erro ao carregar dashboard admin:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadDashboard()
  await pollDangerWaStatus()
  if (dangerWa.sending) {
    dangerWaPollTimer = setInterval(pollDangerWaStatus, 4000)
  }
})

onBeforeUnmount(() => {
  stopDangerWaPoll()
})
</script>

<style scoped>
.admin-home {
  --admin-primary: #8B967C;
  --admin-primary-soft: #eef0eb;
  --admin-ink: #141414;
  --admin-muted: #66706e;
  --admin-border: #e8ece9;
  --admin-surface: #ffffff;
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  padding: 0 0 1rem;
}

.admin-home-greeting {
  margin: 0 0 1.15rem;
  font-size: var(--admin-font-heading-1);
  font-weight: var(--admin-font-heading-1-weight);
  color: var(--admin-ink);
  letter-spacing: -0.02em;
}

.admin-home-link {
  font-size: var(--admin-font-nav);
  font-weight: var(--admin-font-nav-weight-active);
  color: var(--admin-primary);
  text-decoration: none;
}

.admin-home-link:hover {
  text-decoration: underline;
}

.bento-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  grid-template-areas:
    "patients schedules"
    "engagement engagement"
    "feed consumption";
  gap: 1rem;
}

.bento-card {
  padding: 1.15rem 1.2rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: var(--admin-surface, #ffffff);
  border: 1px solid var(--admin-border, #e8ece9);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.bento-card--patients { grid-area: patients; }
.bento-card--schedules { grid-area: schedules; }
.bento-card--engagement { grid-area: engagement; }
.bento-card--feed { grid-area: feed; min-height: 280px; }
.bento-card--consumption { grid-area: consumption; min-height: 280px; }

.bento-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.bento-card-head h2 {
  margin: 0;
  font-size: var(--admin-font-heading-2);
  font-weight: var(--admin-font-heading-2-weight);
  color: var(--admin-ink);
}

.bento-card-head p {
  margin: 0.2rem 0 0;
  font-size: 0.8125rem;
  color: var(--admin-muted);
}

.bento-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.8rem;
  border: none;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: var(--admin-primary);
  color: #fff;
  font-size: var(--admin-font-btn);
  font-weight: var(--admin-font-btn-weight);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease;
}

.bento-cta:hover {
  background: #7a856c;
}

.bento-cta-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.bento-empty {
  margin: 0;
  padding: 1.5rem 0;
  text-align: center;
  color: var(--admin-muted);
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.bento-spinner {
  width: 1.25rem;
  height: 1.25rem;
  animation: admin-home-spin 0.8s linear infinite;
}

@keyframes admin-home-spin {
  to { transform: rotate(360deg); }
}

.patient-list,
.schedule-list,
.feed-list,
.consumption-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.patient-row,
.feed-row,
.consumption-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.35rem;
  border-radius: var(--cf-radius-control, 1.625rem);
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
}

.patient-row:hover,
.feed-row:hover,
.consumption-row:hover {
  background: var(--admin-primary-soft);
}

.patient-copy,
.feed-copy,
.consumption-copy {
  min-width: 0;
  flex: 1;
}

.patient-copy strong,
.feed-copy strong,
.consumption-copy strong,
.schedule-list strong {
  display: block;
  font-size: var(--admin-font-body);
  font-weight: 500;
  color: var(--admin-ink);
}

.patient-copy span,
.feed-copy span,
.consumption-copy span,
.schedule-list span {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.78rem;
  color: var(--admin-muted);
}

.patient-row time,
.feed-meta time {
  font-size: 0.75rem;
  color: var(--admin-muted);
  white-space: nowrap;
}

.schedule-list li {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: start;
  padding: 0.55rem 0.2rem;
  border-bottom: 1px solid var(--admin-border);
}

.schedule-list li:last-child {
  border-bottom: none;
}

.schedule-dot {
  width: 8px;
  height: 8px;
  margin-top: 0.4rem;
  border-radius: 999px;
  background: var(--admin-primary);
}

.schedule-list small {
  font-size: 0.72rem;
  color: var(--admin-muted);
  white-space: nowrap;
}

.engagement-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.engagement-pill {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.9rem 1rem;
  border-radius: var(--cf-radius-control, 1.625rem);
  border: 1px solid var(--admin-border, #e8ece9);
  background: #fafbfa;
  min-width: 0;
}

.engagement-pill-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.danger-wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0.4rem 0.65rem;
  border: 1px solid #bbf7d0;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: #ecfdf3;
  color: #15803d;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.danger-wa-btn:hover:not(:disabled) {
  background: #dcfce7;
}

.danger-wa-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.danger-wa-btn-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.danger-wa-status {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: #991b1b;
}

.engagement-pill--danger {
  border-color: #fecaca;
  background: #fff5f5;
}

.engagement-pill--attention {
  border-color: #fde68a;
  background: #fffbeb;
}

.engagement-pill--success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.engagement-count {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  color: var(--admin-ink);
}

.engagement-pill strong {
  display: block;
  font-size: 0.875rem;
  color: var(--admin-ink);
}

.engagement-pill > div > span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--admin-muted);
}

.engagement-names {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.engagement-patient-btn {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.45rem;
  border: none;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: rgba(255, 255, 255, 0.55);
  color: var(--admin-ink);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.engagement-patient-btn:hover {
  background: #fff;
  transform: translateY(-1px);
}

.engagement-patient-btn:focus-visible {
  outline: 2px solid var(--admin-primary);
  outline-offset: 2px;
}

.engagement-patient-btn span {
  min-width: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.engagement-patient-btn :deep(.patient-avatar--sm) {
  width: 28px;
  flex-shrink: 0;
}

.engagement-patient-arrow {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
  color: var(--admin-muted);
  opacity: 0.7;
}

.engagement-empty {
  margin: 0;
  font-size: 0.75rem;
  color: var(--admin-muted);
}

.feed-thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--cf-radius-control, 1.625rem);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--admin-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.feed-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feed-thumb-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--admin-primary);
}

.feed-meta {
  text-align: right;
  flex-shrink: 0;
}

.feed-meta strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--admin-ink);
}

.consumption-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.consumption-stats > div {
  padding: 0.7rem 0.75rem;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: #f7f9f7;
  border: 1px solid var(--admin-border);
}

.consumption-stats span {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--admin-muted);
}

.consumption-stats strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--admin-ink);
}

.consumption-macros {
  text-align: right;
  flex-shrink: 0;
}

.consumption-macros strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--admin-ink);
}

.consumption-macros span {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: var(--admin-muted);
}

@media (max-width: 1100px) {
  .bento-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "patients patients"
      "schedules engagement"
      "feed consumption";
  }

  .engagement-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "patients"
      "schedules"
      "engagement"
      "feed"
      "consumption";
  }

  .engagement-row {
    grid-template-columns: 1fr;
  }

  .bento-card-head {
    flex-direction: column;
  }
}
</style>

<style>
.danger-wa-overlay {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.danger-wa-dialog {
  width: min(480px, 100%);
  max-height: min(90dvh, 720px);
  overflow: auto;
  padding: 1.35rem 1.4rem 1.25rem;
  border-radius: var(--cf-radius-control, 1.625rem);
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
}

.danger-wa-dialog h3 {
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
}

.danger-wa-modal-hint {
  margin: 0 0 1rem;
  font-size: var(--admin-font-body, 0.875rem);
  color: var(--admin-muted, #66706e);
  line-height: 1.5;
}

.danger-wa-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: var(--admin-font-label, 0.6875rem);
  font-weight: 500;
  color: var(--admin-muted, #66706e);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.danger-wa-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.85rem 1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control, 1.625rem);
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.45;
  resize: vertical;
  min-height: 180px;
  background: #fafbfa;
}

.danger-wa-textarea:focus {
  outline: 2px solid rgba(37, 211, 102, 0.35);
  outline-offset: 1px;
  background: #fff;
}

.danger-wa-vars {
  margin: 0.45rem 0 0;
  font-size: 0.75rem;
  color: var(--admin-muted, #66706e);
}

.danger-wa-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1.15rem;
}

.danger-wa-confirm {
  background: #25d366 !important;
}

.danger-wa-confirm:hover:not(:disabled) {
  background: #1ebe57 !important;
}
</style>
