<template>
  <NuxtLayout name="dashboard">
    <div class="broadcast-page">
      <header class="broadcast-header">
        <div class="broadcast-header__main">
          <h1 class="broadcast-title">Transmissão</h1>

          <nav class="tab-pills" role="tablist" aria-label="Filtrar transmissões">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="tab-pill"
              :class="{ active: activeTab === tab.id }"
              role="tab"
              :aria-selected="activeTab === tab.id ? 'true' : 'false'"
              @click="activeTab = tab.id"
            >
              <component :is="tab.icon" aria-hidden="true" />
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <button type="button" class="btn btn-primary" @click="openNewCampaignModal">
          Criar Nova Transmissão
          <Plus class="icon-small" aria-hidden="true" />
        </button>
      </header>

      <main class="broadcast-main">
        <div v-if="loadingList" class="broadcast-loading">
          <Loader class="spin icon-medium text-primary" />
          <p>Carregando transmissões...</p>
        </div>

        <div v-else-if="filteredCampaigns.length === 0" class="broadcast-empty">
          <Megaphone class="broadcast-empty__icon" aria-hidden="true" />
          <p>{{ emptyMessage }}</p>
        </div>

        <div v-else class="broadcast-table" :class="{ 'broadcast-table--history': activeTab === 'history' }">
          <div class="broadcast-table__head">
            <span>Nome</span>
            <span>Fluxo</span>
            <span>{{ scheduleColumnLabel }}</span>
            <span>Enviado</span>
            <span />
          </div>

          <article
            v-for="camp in filteredCampaigns"
            :key="camp.id"
            class="broadcast-table__row"
            @click="openCampaignDetail(camp)"
          >
            <span class="broadcast-table__name">{{ camp.info || 'Transmissão sem nome' }}</span>
            <span class="broadcast-table__flow">{{ campaignFlowLabel(camp) }}</span>
            <span
              class="broadcast-table__schedule"
              :class="{ 'is-active': activeTab !== 'history' && isCampaignActive(camp) }"
            >
              {{ scheduleColumnValue(camp) }}
            </span>
            <span
              class="broadcast-table__sent"
              :class="{ 'is-sending': activeTab !== 'history' && isCampaignActive(camp) }"
            >
              {{ campaignSentLabel(camp) }}
            </span>
            <div class="broadcast-table__actions" @click.stop>
              <button
                v-if="activeTab !== 'history' && canPauseCampaign(camp)"
                type="button"
                class="broadcast-row-action broadcast-row-action--pause"
                title="Pausar"
                @click="editCampaignAction(camp, 'stop')"
              >
                <Pause class="broadcast-row-action__icon" />
              </button>
              <button
                v-if="activeTab !== 'history' && canStopCampaign(camp)"
                type="button"
                class="broadcast-row-action broadcast-row-action--stop"
                title="Parar"
                @click="editCampaignAction(camp, 'delete')"
              >
                <Square class="broadcast-row-action__icon" />
              </button>
              <button
                type="button"
                class="broadcast-row-action broadcast-row-action--more"
                title="Detalhes"
                @click="openCampaignDetail(camp)"
              >
                <MoreVertical class="broadcast-row-action__icon" />
              </button>
            </div>
          </article>
        </div>
      </main>

      <WhatsappBroadcastCreateModal
        v-model="showModal"
        :contacts="contacts"
        :selected-ids="selectedIds"
        :search-query="searchQuery"
        :loading-contacts="loadingContacts"
        :submitting="creating"
        @toggle-contact="toggleContact"
        @update:search-query="searchQuery = $event"
        @reset-selection="clearSelection"
        @submit="submitCampaign"
      />

      <div v-if="showDetailModal && selectedCampaign" class="modal-overlay broadcast-detail-modal" @click.self="closeCampaignDetail">
        <div class="modal-content glass-card animate-slide-up">
          <div class="modal-header flex-between mb-2">
            <div>
              <h2>{{ selectedCampaign.info || 'Transmissão' }}</h2>
              <p class="text-muted text-sm">Criada em: {{ formatDate(selectedCampaign.created) }}</p>
            </div>
            <button type="button" class="btn-icon" aria-label="Fechar" @click="closeCampaignDetail">
              <X class="icon-medium" />
            </button>
          </div>

          <div class="campaign-actions mb-3">
            <button
              v-if="canPauseCampaign(selectedCampaign)"
              type="button"
              class="btn btn-outline-warning"
              @click="editCampaignAction(selectedCampaign, 'stop')"
            >
              Pausar
            </button>
            <button
              v-if="selectedCampaign.status === 'paused'"
              type="button"
              class="btn btn-outline-success"
              @click="editCampaignAction(selectedCampaign, 'continue')"
            >
              Retomar
            </button>
            <button type="button" class="btn btn-outline-danger" @click="editCampaignAction(selectedCampaign, 'delete')">
              Excluir
            </button>
            <button type="button" class="btn-icon" title="Atualizar" @click="loadMessages">
              <RefreshCw class="icon-small text-muted" :class="{ spin: loadingMessages }" />
            </button>
          </div>

          <div class="broadcast-detail-stats">
            <div class="broadcast-detail-stat broadcast-detail-stat--success">
              <span>Entregues</span>
              <strong>{{ selectedCampaign.log_delivered || 0 }}</strong>
            </div>
            <div class="broadcast-detail-stat">
              <span>Lidas</span>
              <strong>{{ selectedCampaign.log_read || 0 }}</strong>
            </div>
            <div class="broadcast-detail-stat broadcast-detail-stat--danger">
              <span>Falhas</span>
              <strong>{{ selectedCampaign.log_failed || 0 }}</strong>
            </div>
          </div>

          <div class="messages-list mt-4">
            <h4 class="mb-2">Logs de envio</h4>
            <div class="table-responsive">
              <table class="broadcast-logs-table">
                <thead>
                  <tr>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingMessages">
                    <td colspan="3" class="text-center py-3"><Loader class="spin icon-small" /></td>
                  </tr>
                  <tr v-else-if="messages.length === 0">
                    <td colspan="3" class="text-center py-3 text-muted">Nenhuma mensagem registrada.</td>
                  </tr>
                  <tr v-for="msg in messages" :key="msg.id">
                    <td>
                      <div class="broadcast-recipient">
                        <span class="broadcast-recipient__avatar">
                          <img
                            v-if="resolveLogRecipient(msg).avatarUrl"
                            :src="resolveLogRecipient(msg).avatarUrl"
                            :alt="resolveLogRecipient(msg).name"
                          >
                          <span v-else>{{ recipientInitial(resolveLogRecipient(msg).name) }}</span>
                        </span>
                        <span class="broadcast-recipient__meta">
                          <strong>{{ resolveLogRecipient(msg).name }}</strong>
                          <small>{{ resolveLogRecipient(msg).displayNumber }}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="broadcast-status" :class="statusClass(msg.status)">{{ msg.status }}</span>
                    </td>
                    <td>
                      <button type="button" class="btn-icon" title="Ver mensagem">
                        <Eye class="icon-small" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Plus,
  RefreshCw,
  Eye,
  X,
  Loader,
  CalendarDays,
  FileText,
  History,
  Megaphone,
  Pause,
  Square,
  MoreVertical,
} from 'lucide-vue-next'
import WhatsappBroadcastCreateModal from '~/components/whatsapp/WhatsappBroadcastCreateModal.vue'
import { whatsappHasAuth, whatsappJsonHeaders, whatsappAuthHeaders } from '~/composables/whatsapp/useWhatsappApi.js'
import { useWhatsappDispatchContacts } from '~/composables/whatsapp/useWhatsappDispatchContacts.js'

const config = useRuntimeConfig()
const whatsappApiBase = config.public.whatsappApiBase
const PROXY_BASE = `${whatsappApiBase}/proxy`

const tabs = [
  { id: 'active', label: 'Ativas e Agendadas', icon: CalendarDays },
  { id: 'drafts', label: 'Rascunhos', icon: FileText },
  { id: 'history', label: 'Histórico', icon: History },
]

const ACTIVE_STATUSES = new Set(['scheduled', 'queued', 'sending', 'ativo', 'active', 'running', 'paused'])
const DRAFT_STATUSES = new Set(['draft', 'rascunho', 'drafts'])
const HISTORY_STATUSES = new Set(['done', 'completed', 'finished', 'failed', 'cancelled', 'stopped', 'deleted'])
const CAMPAIGN_POLL_MS = 3500

const activeTab = ref('active')
const campaigns = ref([])
const loadingList = ref(true)
const selectedCampaign = ref(null)
const showDetailModal = ref(false)

const messages = ref([])
const loadingMessages = ref(false)

const showModal = ref(false)
const creating = ref(false)

let campaignPollTimer = null

const {
  contacts,
  loading: loadingContacts,
  searchQuery,
  selectedIds,
  loadContacts,
  toggleContact,
  clearSelection,
  resolveRecipient,
} = useWhatsappDispatchContacts()

const categorizeCampaign = (camp = {}) => {
  const status = String(camp.status || '').toLowerCase()
  if (DRAFT_STATUSES.has(status)) return 'drafts'
  if (HISTORY_STATUSES.has(status)) return 'history'
  if (ACTIVE_STATUSES.has(status)) return 'active'

  const total = Number(camp.log_total || 0)
  const done = Number(camp.log_sucess || 0) + Number(camp.log_failed || 0)
  if (total > 0 && done >= total) return 'history'
  return 'active'
}

const filteredCampaigns = computed(() => {
  const items = campaigns.value.filter((camp) => categorizeCampaign(camp) === activeTab.value)
  if (activeTab.value !== 'history') return items
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updated || a.completed || a.created || 0).getTime()
    const bTime = new Date(b.updated || b.completed || b.created || 0).getTime()
    return bTime - aTime
  })
})

const emptyMessage = computed(() => {
  if (activeTab.value === 'drafts') return 'Não há Rascunhos'
  if (activeTab.value === 'history') return 'Não há Transmissões no Histórico'
  return 'Não há Transmissões Agendadas'
})

const scheduleColumnLabel = computed(() => {
  if (activeTab.value === 'history') return 'Concluído'
  if (activeTab.value === 'drafts') return 'Criado em'
  return 'Agendar para'
})

const HISTORY_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const statusClass = (status = '') => {
  const key = String(status || '').toLowerCase()
  if (DRAFT_STATUSES.has(key)) return 'broadcast-status--draft'
  if (HISTORY_STATUSES.has(key)) return `broadcast-status--${key}`
  return `broadcast-status--${key}`
}

const isCampaignActive = (camp) => {
  const status = String(camp?.status || '').toLowerCase()
  return ['sending', 'ativo', 'active', 'running', 'queued'].includes(status)
}

const campaignScheduleLabel = (camp) => {
  const status = String(camp?.status || '').toLowerCase()
  if (isCampaignActive(camp)) return 'Ativo...'
  if (status === 'scheduled') return formatDate(camp.scheduled || camp.scheduled_for || camp.created)
  if (status === 'paused') return 'Pausada'
  return formatDate(camp.scheduled || camp.scheduled_for || camp.created)
}

const formatCompactDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.getDate()
  const month = HISTORY_MONTHS[date.getMonth()] || ''
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${mins}`
}

const campaignCompletedLabel = (camp) =>
  formatCompactDate(camp.updated || camp.completed || camp.finished_at || camp.created)

const scheduleColumnValue = (camp) => {
  if (activeTab.value === 'history') return campaignCompletedLabel(camp)
  if (activeTab.value === 'drafts') return formatCompactDate(camp.created)
  return campaignScheduleLabel(camp)
}

const campaignFlowLabel = (camp) => {
  const flow = String(camp?.flow ?? camp?.flowName ?? '').trim()
  const type = String(camp?.type ?? camp?.messageType ?? '').trim()

  if (flow && flow !== '0') return flow
  if (type && type !== '0' && type !== 'text') return type
  if (flow === '0' || type === '0' || (!flow && !type)) return '0 Fluxo sem conteúdo'
  if (type === 'text') return 'Mensagem de texto'
  return flow || type || '0 Fluxo sem conteúdo'
}

const campaignProcessedCount = (camp = {}) =>
  Number(camp.log_sucess || 0) + Number(camp.log_failed || 0)

const campaignSentLabel = (camp = {}) =>
  `${campaignProcessedCount(camp)}/${Number(camp.log_total || 0)}`

const hasRunningCampaigns = computed(() =>
  campaigns.value.some((camp) => isCampaignActive(camp) || canPauseCampaign(camp)),
)

const shouldPollCampaigns = computed(() =>
  activeTab.value === 'active' || hasRunningCampaigns.value || showDetailModal.value,
)

const canPauseCampaign = (camp) => ['scheduled', 'queued', 'sending', 'ativo', 'active', 'running'].includes(
  String(camp?.status || '').toLowerCase(),
)

const canStopCampaign = (camp) => !HISTORY_STATUSES.has(String(camp?.status || '').toLowerCase())

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

const loadCampaigns = async ({ silent = false } = {}) => {
  try {
    if (!silent) loadingList.value = true
    const res = await fetch(`${PROXY_BASE}/sender/listfolders`, {
      headers: whatsappAuthHeaders(),
    })
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    campaigns.value = list

    if (selectedCampaign.value?.id) {
      const updated = list.find((item) => item.id === selectedCampaign.value.id)
      if (updated) selectedCampaign.value = updated
    }
  } catch (error) {
    console.error('Erro ao carregar transmissões', error)
  } finally {
    if (!silent) loadingList.value = false
  }
}

const syncActiveCampaigns = async () => {
  if (!whatsappHasAuth()) return
  await loadCampaigns({ silent: true })
  if (showDetailModal.value && selectedCampaign.value) {
    await loadMessages({ silent: true })
  }
}

const stopCampaignPolling = () => {
  if (campaignPollTimer) {
    clearInterval(campaignPollTimer)
    campaignPollTimer = null
  }
}

const startCampaignPolling = () => {
  stopCampaignPolling()
  if (!shouldPollCampaigns.value) return
  campaignPollTimer = setInterval(() => {
    if (shouldPollCampaigns.value) void syncActiveCampaigns()
    else stopCampaignPolling()
  }, CAMPAIGN_POLL_MS)
}

const openCampaignDetail = (camp) => {
  selectedCampaign.value = camp
  showDetailModal.value = true
  loadMessages()
}

const closeCampaignDetail = () => {
  showDetailModal.value = false
  selectedCampaign.value = null
  messages.value = []
}

const loadMessages = async ({ silent = false } = {}) => {
  if (!selectedCampaign.value) return
  try {
    if (!silent) loadingMessages.value = true
    const res = await fetch(`${PROXY_BASE}/sender/listmessages`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ folder_id: selectedCampaign.value.id, limit: 50 }),
    })
    const data = await res.json()
    messages.value = data.messages || []
  } catch (error) {
    console.error('Erro ao carregar mensagens', error)
  } finally {
    if (!silent) loadingMessages.value = false
  }
}

const editCampaignAction = async (camp, action) => {
  if (!confirm(`Tem certeza que deseja aplicar a ação: ${action}?`)) return
  try {
    await fetch(`${PROXY_BASE}/sender/edit`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify({ folder_id: camp.id, action }),
    })
    alert('Ação executada com sucesso!')
    await loadCampaigns()
    if (action === 'delete' && selectedCampaign.value?.id === camp.id) closeCampaignDetail()
  } catch (error) {
    console.error('Erro', error)
    alert('Falha ao executar ação.')
  }
}

const openNewCampaignModal = () => {
  clearSelection()
  searchQuery.value = ''
  showModal.value = true
  void loadContacts()
}

const submitCampaign = async (payload) => {
  const nums = payload.recipientJids || []
  if (nums.length === 0) {
    alert('Selecione ao menos um contato para receber a transmissão.')
    return
  }

  const body = {
    info: payload.info,
    folder: payload.info,
    text: payload.text,
    type: payload.flowId || 'text',
    numbers: nums,
    delayMin: Number(payload.delayMin),
    delayMax: Number(payload.delayMax),
  }

  if (payload.scheduleLater && payload.scheduledAt) {
    body.scheduled = payload.scheduledAt
  }

  try {
    creating.value = true
    const res = await fetch(`${PROXY_BASE}/sender/simple`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(body),
    })

    if (res.ok) {
      showModal.value = false
      activeTab.value = 'active'
      clearSelection()
      alert('Transmissão agendada com sucesso!')
      await loadCampaigns()
      startCampaignPolling()
    } else {
      const err = await res.json()
      alert(`Erro: ${err.message || 'Falha ao criar'}`)
    }
  } catch (error) {
    console.error('Erro ao criar', error)
    alert('Erro interno.')
  } finally {
    creating.value = false
  }
}

const resolveLogRecipient = (msg) => resolveRecipient(msg?.chatid || '')
const recipientInitial = (name) => String(name || '?').charAt(0).toUpperCase()

onMounted(() => {
  if (!whatsappHasAuth()) navigateTo('/')
  else {
    void loadCampaigns().finally(() => startCampaignPolling())
    void loadContacts()
  }
})

watch(shouldPollCampaigns, (enabled) => {
  if (enabled) startCampaignPolling()
  else stopCampaignPolling()
})

onUnmounted(() => {
  stopCampaignPolling()
})
</script>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.campaign-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.btn-outline-danger { background: transparent; color: #ef4444; border: 1px solid #fecaca; }
.btn-outline-warning { background: transparent; color: #f59e0b; border: 1px solid #fde68a; }
.btn-outline-success { background: transparent; color: #10b981; border: 1px solid #a7f3d0; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.75rem;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #111b21;
}

.text-muted { color: #94a3b8; }
.text-primary { color: #6366f1; }
.text-sm { font-size: 0.85rem; }
.icon-medium { width: 22px; height: 22px; }
.icon-small { width: 16px; height: 16px; }
.mt-4 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.py-3 { padding-top: 1rem; padding-bottom: 1rem; }
.text-center { text-align: center; }
.spin { animation: spin 1s linear infinite; }
.animate-slide-up { animation: slideUp 0.3s ease forwards; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
