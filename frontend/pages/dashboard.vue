<template>
  <NuxtLayout name="dashboard">
    <div class="admin-home admin-shell">
      <header class="admin-shell-header admin-home-header">
        <div>
          <p class="admin-home-kicker">Painel Clube Florescer</p>
          <h1>Olá, {{ greetingName }}</h1>
          <p>Resumo do portal — alunas, conteúdos e atalhos do dia a dia.</p>
        </div>
        <NuxtLink to="/whatsapp/chat" class="admin-home-cta">
          <WhatsAppIcon class="admin-home-cta-icon" />
          Abrir WhatsApp
        </NuxtLink>
      </header>

      <div class="admin-home-stats">
        <article v-for="card in statCards" :key="card.key" class="admin-home-stat admin-shell-card">
          <div class="admin-home-stat-icon" :class="`admin-home-stat-icon--${card.tone}`">
            <component :is="card.icon" />
          </div>
          <div>
            <span class="admin-home-stat-label">{{ card.label }}</span>
            <strong class="admin-home-stat-value">{{ card.value }}</strong>
            <span class="admin-home-stat-hint">{{ card.hint }}</span>
          </div>
        </article>
      </div>

      <div class="admin-home-grid">
        <section class="admin-home-panel admin-shell-card">
          <div class="admin-home-panel-head">
            <h2>Atalhos rápidos</h2>
          </div>
          <div class="admin-home-actions">
            <NuxtLink
              v-for="action in quickActions"
              :key="action.path"
              :to="action.path"
              class="admin-home-action"
            >
              <component :is="action.icon" class="admin-home-action-icon" />
              <span>{{ action.label }}</span>
              <ChevronRight class="admin-home-action-arrow" />
            </NuxtLink>
          </div>
        </section>

        <section class="admin-home-panel admin-shell-card">
          <div class="admin-home-panel-head">
            <h2>Cadastros pendentes</h2>
            <NuxtLink v-if="pendingRequests.length" to="/usuarios" class="admin-home-link">
              Ver todos
            </NuxtLink>
          </div>

          <div v-if="loading" class="admin-home-empty">
            <Loader2 class="admin-home-spinner" />
            <span>Carregando…</span>
          </div>
          <ul v-else-if="pendingRequests.length" class="admin-home-requests">
            <li v-for="req in pendingRequests.slice(0, 4)" :key="req.id">
              <div>
                <strong>{{ req.name || 'Sem nome' }}</strong>
                <span>{{ req.email || req.phone || 'Contato não informado' }}</span>
              </div>
              <NuxtLink to="/usuarios" class="admin-home-link">Revisar</NuxtLink>
            </li>
          </ul>
          <p v-else class="admin-home-empty">Nenhuma solicitação pendente no momento.</p>
        </section>
      </div>

      <section class="admin-home-panel admin-shell-card admin-home-tip">
        <Sparkles class="admin-home-tip-icon" />
        <div>
          <h2>Dica</h2>
          <p>
            Use <NuxtLink to="/check-in">Check-ins</NuxtLink> para acompanhar a evolução das alunas e
            <NuxtLink to="/personalizar">Personalizar</NuxtLink> para ajustar a identidade visual do app delas.
          </p>
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup>
import {
  Users,
  UserPlus,
  BookOpen,
  CalendarCheck,
  DollarSign,
  ChevronRight,
  Loader2,
  Sparkles,
  Palette,
  Send,
} from 'lucide-vue-next'
import { authHeaders, verifyAuthSession } from '~/composables/useAuthSession.js'
import {
  fetchWhatsappSessionConnected,
  getWhatsappApiBase,
  isWhatsappConnectedFromStatusPayload,
  whatsappFetchInit,
} from '~/composables/whatsapp/useWhatsappApi.js'
import WhatsAppIcon from '~/components/WhatsAppIcon.vue'

const apiBase = useApiBase()
const loading = ref(true)
const greetingName = ref('Nutricionista')
const stats = reactive({
  patients: 0,
  pendingRequests: 0,
  courses: 0,
  checkinTemplates: 0,
  revenue: 0,
  whatsappConnected: false,
})
const pendingRequests = ref([])

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

const statCards = computed(() => [
  {
    key: 'patients',
    label: 'Alunas ativas',
    value: stats.patients,
    hint: 'Cadastradas no portal',
    icon: Users,
    tone: 'green',
  },
  {
    key: 'pending',
    label: 'Cadastros pendentes',
    value: stats.pendingRequests,
    hint: stats.pendingRequests ? 'Aguardando aprovação' : 'Tudo em dia',
    icon: UserPlus,
    tone: 'amber',
  },
  {
    key: 'courses',
    label: 'Cursos publicados',
    value: stats.courses,
    hint: 'Conteúdos no catálogo',
    icon: BookOpen,
    tone: 'blue',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    value: stats.whatsappConnected ? 'Conectado' : 'Desconectado',
    hint: stats.whatsappConnected ? 'Pronto para atendimento' : 'Conecte em WhatsApp → Conexão',
    icon: WhatsAppIcon,
    tone: stats.whatsappConnected ? 'whatsapp-on' : 'whatsapp-off',
  },
  {
    key: 'checkins',
    label: 'Tipos de check-in',
    value: stats.checkinTemplates,
    hint: 'Modelos configurados',
    icon: CalendarCheck,
    tone: 'purple',
  },
  {
    key: 'revenue',
    label: 'Faturamento',
    value: formatCurrency(stats.revenue),
    hint: 'Total registrado no financeiro',
    icon: DollarSign,
    tone: 'teal',
  },
])

const quickActions = [
  { label: 'Gerenciar alunas', path: '/usuarios', icon: Users },
  { label: 'Cursos e aulas', path: '/cursos', icon: BookOpen },
  { label: 'Check-ins', path: '/check-in', icon: CalendarCheck },
  { label: 'Chat ao vivo', path: '/whatsapp/chat', icon: WhatsAppIcon },
  { label: 'Transmissões WhatsApp', path: '/whatsapp/disparos', icon: Send },
  { label: 'Financeiro', path: '/financeiro', icon: DollarSign },
  { label: 'Personalizar app', path: '/personalizar', icon: Palette },
]

const loadWhatsappStatus = async () => {
  const base = getWhatsappApiBase()
  if (!base) {
    stats.whatsappConnected = await fetchWhatsappSessionConnected()
    return
  }
  try {
    const res = await fetch(`${base}/status`, whatsappFetchInit())
    const data = await res.json().catch(() => ({}))
    stats.whatsappConnected = res.ok ? isWhatsappConnectedFromStatusPayload(data) : false
  } catch {
    stats.whatsappConnected = false
  }
}

const loadDashboard = async () => {
  loading.value = true
  try {
    const user = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
    if (user?.name) greetingName.value = String(user.name).split(' ')[0] || user.name

    const headers = authHeaders()
    const base = apiBase.value

    const [usersResult, requestsResult, coursesResult, checkinsResult, financeResult] = await Promise.allSettled([
      $fetch(`${base}/users`, { headers }),
      $fetch(`${base}/users/registration-requests`, { headers }),
      $fetch(`${base}/courses`, { headers }),
      $fetch(`${base}/checkin/templates`, { headers }),
      $fetch(`${base}/financial/summary`, { headers }),
    ])

    if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
      stats.patients = usersResult.value.filter((u) => u.role === 'PACIENTE').length
    }

    if (requestsResult.status === 'fulfilled') {
      pendingRequests.value = requestsResult.value?.requests || []
      stats.pendingRequests = pendingRequests.value.length
    }

    if (coursesResult.status === 'fulfilled' && Array.isArray(coursesResult.value)) {
      stats.courses = coursesResult.value.length
    }

    if (checkinsResult.status === 'fulfilled') {
      const templates = checkinsResult.value?.templates || checkinsResult.value
      stats.checkinTemplates = Array.isArray(templates) ? templates.length : 0
    }

    if (financeResult.status === 'fulfilled') {
      stats.revenue = Number(financeResult.value?.totalRevenue || 0)
    }

    await loadWhatsappStatus()
  } catch (err) {
    console.warn('Erro ao carregar dashboard admin:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.admin-home {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  padding: 0 0 1rem;
}

.admin-home-header {
  align-items: center;
}

.admin-home-kicker {
  margin: 0 0 0.35rem;
  font-size: var(--admin-font-label);
  font-weight: var(--admin-font-label-weight);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--admin-primary);
}

.admin-home-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  background: var(--admin-primary);
  color: #fff;
  font-size: var(--admin-font-btn);
  font-weight: var(--admin-font-btn-weight);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s ease, transform 0.2s ease;
}

.admin-home-cta:hover {
  background: #7a856c;
  transform: translateY(-1px);
}

.admin-home-cta-icon {
  width: 1rem;
  height: 1rem;
}

.admin-home-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.admin-home-stat {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.15rem 1.2rem;
  min-width: 0;
}

.admin-home-stat-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.admin-home-stat-icon :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
}

.admin-home-stat-icon--green { background: #ecfdf3; color: #15803d; }
.admin-home-stat-icon--amber { background: #fff7ed; color: #c2410c; }
.admin-home-stat-icon--blue { background: #eff6ff; color: #1d4ed8; }
.admin-home-stat-icon--purple { background: #faf5ff; color: #7e22ce; }
.admin-home-stat-icon--teal { background: #f0fdfa; color: #0f766e; }
.admin-home-stat-icon--whatsapp-on { background: #e8f5e9; color: #25d366; }
.admin-home-stat-icon--whatsapp-off { background: #f4f4f5; color: #25d366; }

.admin-home-stat-label {
  display: block;
  font-size: var(--admin-font-label);
  font-weight: var(--admin-font-label-weight);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--admin-muted);
}

.admin-home-stat-value {
  display: block;
  margin-top: 0.2rem;
  font-size: clamp(1rem, 1.4vw, 1.35rem);
  font-weight: 600;
  line-height: 1.1;
  color: var(--admin-ink);
  overflow-wrap: anywhere;
}

.admin-home-stat-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--admin-muted);
}

.admin-home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-home-panel {
  padding: 1.25rem 1.3rem;
}

.admin-home-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.admin-home-panel-head h2 {
  margin: 0;
  font-size: var(--admin-font-heading-2);
  font-weight: var(--admin-font-heading-2-weight);
  color: var(--admin-ink);
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

.admin-home-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.admin-home-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  color: var(--admin-ink);
  text-decoration: none;
  font-weight: 500;
  font-size: var(--admin-font-body);
  transition: background 0.18s ease;
}

.admin-home-action:hover {
  background: var(--admin-primary-soft);
}

.admin-home-action-icon {
  width: 1.05rem;
  height: 1.05rem;
  color: var(--admin-primary);
}

.admin-home-action-arrow {
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  color: #a1a1aa;
}

.admin-home-requests {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.admin-home-requests li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--admin-border);
}

.admin-home-requests li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.admin-home-requests strong {
  display: block;
  font-size: var(--admin-font-body);
  font-weight: 500;
  color: var(--admin-ink);
}

.admin-home-requests span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.82rem;
  color: var(--admin-muted);
}

.admin-home-empty {
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

.admin-home-spinner {
  width: 1.25rem;
  height: 1.25rem;
  animation: admin-home-spin 0.8s linear infinite;
}

@keyframes admin-home-spin {
  to { transform: rotate(360deg); }
}

.admin-home-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.admin-home-tip-icon {
  width: 1.35rem;
  height: 1.35rem;
  color: var(--admin-primary);
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.admin-home-tip h2 {
  margin: 0 0 0.35rem;
  font-size: var(--admin-font-heading-2);
  font-weight: var(--admin-font-heading-2-weight);
}

.admin-home-tip p {
  margin: 0;
  font-size: var(--admin-font-body);
  font-weight: var(--admin-font-body-weight);
  color: var(--admin-muted);
  line-height: 1.5;
}

.admin-home-tip a {
  color: var(--admin-primary);
  font-weight: var(--admin-font-nav-weight-active);
  text-decoration: none;
}

.admin-home-tip a:hover {
  text-decoration: underline;
}

@media (min-width: 1500px) {
  .admin-home-stats {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .admin-home-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .admin-home-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-home-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .admin-home-stats {
    grid-template-columns: 1fr;
  }

  .admin-home-header {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-home-cta {
    justify-content: center;
  }
}
</style>
