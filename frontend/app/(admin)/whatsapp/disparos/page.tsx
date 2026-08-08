'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Eye,
  FileText,
  History,
  Loader,
  Megaphone,
  MoreVertical,
  Pause,
  Plus,
  RefreshCw,
  Square,
  X,
} from 'lucide-react'
import { getProxyBase, whatsappFetchInit, whatsappHasAuth } from '@/lib/whatsapp/api'
import {
  loadDispatchContacts,
  resolveDispatchRecipient,
  type BroadcastFormPayload,
  type DispatchContact,
} from '@/lib/whatsapp/dispatch-contacts'
import { WhatsappBroadcastCreateModal } from '@/components/whatsapp/WhatsappBroadcastCreateModal'
import styles from './disparos.module.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  info?: string
  status?: string
  flow?: string
  flowName?: string
  type?: string
  messageType?: string
  scheduled?: string
  scheduled_for?: string
  created?: string
  updated?: string
  completed?: string
  finished_at?: string
  log_total?: number
  log_sucess?: number
  log_failed?: number
  log_delivered?: number
  log_read?: number
}

interface LogMessage {
  id: string
  chatid?: string
  status?: string
}

type TabId = 'active' | 'drafts' | 'history'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(['scheduled', 'queued', 'sending', 'ativo', 'active', 'running', 'paused'])
const DRAFT_STATUSES = new Set(['draft', 'rascunho', 'drafts'])
const HISTORY_STATUSES = new Set(['done', 'completed', 'finished', 'failed', 'cancelled', 'stopped', 'deleted'])
const CAMPAIGN_POLL_MS = 3500

const HISTORY_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TABS: { id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'active',  label: 'Ativas e Agendadas', Icon: CalendarDays },
  { id: 'drafts',  label: 'Rascunhos',           Icon: FileText },
  { id: 'history', label: 'Histórico',            Icon: History },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categorizeCampaign(camp: Campaign): TabId {
  const status = String(camp.status || '').toLowerCase()
  if (DRAFT_STATUSES.has(status)) return 'drafts'
  if (HISTORY_STATUSES.has(status)) return 'history'
  if (ACTIVE_STATUSES.has(status)) return 'active'
  const total = Number(camp.log_total || 0)
  const done = Number(camp.log_sucess || 0) + Number(camp.log_failed || 0)
  if (total > 0 && done >= total) return 'history'
  return 'active'
}

function isCampaignActive(camp: Campaign): boolean {
  return ['sending', 'ativo', 'active', 'running', 'queued'].includes(
    String(camp?.status || '').toLowerCase(),
  )
}

function canPauseCampaign(camp: Campaign): boolean {
  return ['scheduled', 'queued', 'sending', 'ativo', 'active', 'running'].includes(
    String(camp?.status || '').toLowerCase(),
  )
}

function canStopCampaign(camp: Campaign): boolean {
  return !HISTORY_STATUSES.has(String(camp?.status || '').toLowerCase())
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}

function formatCompactDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getDate()
  const month = HISTORY_MONTHS[d.getMonth()] ?? ''
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${h}:${m}`
}

function campaignFlowLabel(camp: Campaign): string {
  const flow = String(camp?.flow ?? camp?.flowName ?? '').trim()
  const type = String(camp?.type ?? camp?.messageType ?? '').trim()
  if (flow && flow !== '0') return flow
  if (type && type !== '0' && type !== 'text') return type
  if (type === 'text') return 'Mensagem de texto'
  return '0 Fluxo sem conteúdo'
}

function scheduleColumnValue(camp: Campaign, activeTab: TabId): string {
  if (activeTab === 'history') {
    return formatCompactDate(camp.updated || camp.completed || camp.finished_at || camp.created)
  }
  if (activeTab === 'drafts') return formatCompactDate(camp.created)
  const status = String(camp?.status || '').toLowerCase()
  if (isCampaignActive(camp)) return 'Ativo...'
  if (status === 'paused') return 'Pausada'
  return formatDate(camp.scheduled || camp.scheduled_for || camp.created)
}

function campaignSentLabel(camp: Campaign): string {
  const done = Number(camp.log_sucess || 0) + Number(camp.log_failed || 0)
  return `${done}/${Number(camp.log_total || 0)}`
}

function statusClass(status?: string): string {
  const key = String(status || '').toLowerCase()
  const map: Record<string, string> = {
    scheduled: styles.broadcastStatusScheduled,
    queued: styles.broadcastStatusQueued,
    sending: styles.broadcastStatusSending,
    ativo: styles.broadcastStatusAtivo,
    active: styles.broadcastStatusActive,
    running: styles.broadcastStatusRunning,
    paused: styles.broadcastStatusPaused,
    done: styles.broadcastStatusDone,
    completed: styles.broadcastStatusCompleted,
    finished: styles.broadcastStatusFinished,
    failed: styles.broadcastStatusFailed,
    cancelled: styles.broadcastStatusCancelled,
    draft: styles.broadcastStatusDraft,
  }
  return `${styles.broadcastStatus} ${map[key] ?? ''}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DisparosPage() {
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [messages, setMessages] = useState<LogMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [contacts, setContacts] = useState<DispatchContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedCampaignRef = useRef<Campaign | null>(null)
  selectedCampaignRef.current = selectedCampaign

  const proxyBase = getProxyBase()

  // ── Campaign loading ──────────────────────────────────────────────────────

  const loadCampaigns = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingList(true)
      const res = await fetch(`${proxyBase}/sender/listfolders`, whatsappFetchInit())
      const data: unknown = await res.json().catch(() => [])
      const list: Campaign[] = Array.isArray(data) ? (data as Campaign[]) : []
      setCampaigns(list)
      if (selectedCampaignRef.current?.id) {
        const updated = list.find((item) => item.id === selectedCampaignRef.current?.id)
        if (updated) setSelectedCampaign(updated)
      }
    } catch (err) {
      console.error('Erro ao carregar transmissões', err)
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [proxyBase])

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    const camp = selectedCampaignRef.current
    if (!camp) return
    try {
      if (!silent) setLoadingMessages(true)
      const res = await fetch(`${proxyBase}/sender/listmessages`, whatsappFetchInit({
        method: 'POST',
        body: JSON.stringify({ folder_id: camp.id, limit: 50 }),
      }))
      const data = await res.json().catch(() => ({}))
      setMessages((data as { messages?: LogMessage[] }).messages || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens', err)
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [proxyBase])

  // ── Polling ───────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollTimerRef.current = setInterval(async () => {
      const hasRunning = campaigns.some((c) => isCampaignActive(c) || canPauseCampaign(c))
      const shouldPoll = activeTab === 'active' || hasRunning || showDetailModal
      if (!shouldPoll) { stopPolling(); return }
      await loadCampaigns({ silent: true })
      if (showDetailModal && selectedCampaignRef.current) {
        await loadMessages({ silent: true })
      }
    }, CAMPAIGN_POLL_MS)
  }, [activeTab, campaigns, showDetailModal, loadCampaigns, loadMessages, stopPolling])

  useEffect(() => {
    if (!whatsappHasAuth()) return
    loadCampaigns().then(() => startPolling())
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [activeTab, showDetailModal, startPolling, stopPolling])

  // ── Contacts ──────────────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    if (loadingContacts) return
    setLoadingContacts(true)
    const result = await loadDispatchContacts()
    setContacts(result)
    setLoadingContacts(false)
  }, [loadingContacts])

  // ── Campaign actions ──────────────────────────────────────────────────────

  const editCampaignAction = useCallback(async (camp: Campaign, action: string) => {
    if (!confirm(`Tem certeza que deseja aplicar a ação: ${action}?`)) return
    try {
      await fetch(`${proxyBase}/sender/edit`, whatsappFetchInit({
        method: 'POST',
        body: JSON.stringify({ folder_id: camp.id, action }),
      }))
      alert('Ação executada com sucesso!')
      await loadCampaigns()
      if (action === 'delete' && selectedCampaignRef.current?.id === camp.id) {
        setShowDetailModal(false)
        setSelectedCampaign(null)
        setMessages([])
      }
    } catch {
      alert('Falha ao executar ação.')
    }
  }, [proxyBase, loadCampaigns])

  const openCampaignDetail = useCallback((camp: Campaign) => {
    setSelectedCampaign(camp)
    setShowDetailModal(true)
    void loadMessages()
  }, [loadMessages])

  const closeCampaignDetail = useCallback(() => {
    setShowDetailModal(false)
    setSelectedCampaign(null)
    setMessages([])
  }, [])

  // ── Create modal ──────────────────────────────────────────────────────────

  const openNewCampaignModal = () => {
    setSelectedIds([])
    setSearchQuery('')
    setShowCreateModal(true)
    void fetchContacts()
  }

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const set = new Set(prev)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return Array.from(set)
    })
  }

  const submitCampaign = async (payload: BroadcastFormPayload) => {
    const nums = payload.recipientJids
    if (nums.length === 0) {
      alert('Selecione ao menos um contato para receber a transmissão.')
      return
    }

    const body: Record<string, unknown> = {
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
      setCreating(true)
      const res = await fetch(`${proxyBase}/sender/simple`, whatsappFetchInit({
        method: 'POST',
        body: JSON.stringify(body),
      }))
      if (res.ok) {
        setShowCreateModal(false)
        setActiveTab('active')
        setSelectedIds([])
        alert('Transmissão agendada com sucesso!')
        await loadCampaigns()
        startPolling()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Erro: ${(err as { message?: string }).message || 'Falha ao criar'}`)
      }
    } catch {
      alert('Erro interno.')
    } finally {
      setCreating(false)
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filteredCampaigns = campaigns
    .filter((c) => categorizeCampaign(c) === activeTab)
    .sort((a, b) => {
      if (activeTab !== 'history') return 0
      const aTime = new Date(a.updated || a.completed || a.created || 0).getTime()
      const bTime = new Date(b.updated || b.completed || b.created || 0).getTime()
      return bTime - aTime
    })

  const emptyMessage =
    activeTab === 'drafts'
      ? 'Não há Rascunhos'
      : activeTab === 'history'
      ? 'Não há Transmissões no Histórico'
      : 'Não há Transmissões Agendadas'

  const scheduleColumnLabel =
    activeTab === 'history' ? 'Concluído' : activeTab === 'drafts' ? 'Criado em' : 'Agendar para'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>Transmissão</h1>
          <nav className={styles.tabPills} role="tablist" aria-label="Filtrar transmissões">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                className={`${styles.tabPill} ${activeTab === id ? styles.tabPillActive : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon className={undefined} />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <button type="button" className={styles.createBtn} onClick={openNewCampaignModal}>
          Criar Nova Transmissão
          <Plus />
        </button>
      </header>

      <main className={styles.main}>
        {loadingList ? (
          <div className={styles.loading}>
            <Loader />
            <p>Carregando transmissões...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className={styles.empty}>
            <Megaphone className={styles.emptyIcon} />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className={`${styles.table} ${activeTab === 'history' ? styles.tableHistory : ''}`}>
            <div className={styles.tableHead}>
              <span>Nome</span>
              <span>Fluxo</span>
              <span>{scheduleColumnLabel}</span>
              <span>Enviado</span>
              <span />
            </div>
            {filteredCampaigns.map((camp) => (
              <article
                key={camp.id}
                className={styles.tableRow}
                onClick={() => openCampaignDetail(camp)}
              >
                <span className={styles.tableName}>{camp.info || 'Transmissão sem nome'}</span>
                <span className={styles.tableFlow}>{campaignFlowLabel(camp)}</span>
                <span
                  className={`${styles.tableSchedule} ${activeTab !== 'history' && isCampaignActive(camp) ? styles.tableScheduleActive : ''}`}
                >
                  {scheduleColumnValue(camp, activeTab)}
                </span>
                <span
                  className={`${styles.tableSent} ${activeTab !== 'history' && isCampaignActive(camp) ? styles.tableSentActive : ''}`}
                >
                  {campaignSentLabel(camp)}
                </span>
                <div className={styles.tableActions} onClick={(e) => e.stopPropagation()}>
                  {activeTab !== 'history' && canPauseCampaign(camp) && (
                    <button
                      type="button"
                      className={`${styles.rowAction} ${styles.rowActionPause}`}
                      title="Pausar"
                      onClick={() => editCampaignAction(camp, 'stop')}
                    >
                      <Pause />
                    </button>
                  )}
                  {activeTab !== 'history' && canStopCampaign(camp) && (
                    <button
                      type="button"
                      className={`${styles.rowAction} ${styles.rowActionStop}`}
                      title="Parar"
                      onClick={() => editCampaignAction(camp, 'delete')}
                    >
                      <Square />
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.rowActionMore}`}
                    title="Detalhes"
                    onClick={() => openCampaignDetail(camp)}
                  >
                    <MoreVertical />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ── Create modal ── */}
      <WhatsappBroadcastCreateModal
        open={showCreateModal}
        contacts={contacts}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
        loadingContacts={loadingContacts}
        submitting={creating}
        onClose={() => setShowCreateModal(false)}
        onToggleContact={toggleContact}
        onUpdateSearchQuery={setSearchQuery}
        onResetSelection={() => setSelectedIds([])}
        onSubmit={submitCampaign}
      />

      {/* ── Detail modal ── */}
      {showDetailModal && selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          messages={messages}
          loadingMessages={loadingMessages}
          contacts={contacts}
          onClose={closeCampaignDetail}
          onAction={editCampaignAction}
          onReload={() => void loadMessages()}
          styles={styles}
        />
      )}
    </div>
  )
}

// ─── CampaignDetailModal ──────────────────────────────────────────────────────

interface DetailModalProps {
  campaign: Campaign
  messages: LogMessage[]
  loadingMessages: boolean
  contacts: DispatchContact[]
  onClose: () => void
  onAction: (camp: Campaign, action: string) => void
  onReload: () => void
  styles: Record<string, string>
}

function CampaignDetailModal({
  campaign,
  messages,
  loadingMessages,
  contacts,
  onClose,
  onAction,
  onReload,
  styles,
}: DetailModalProps) {
  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <h2>{campaign.info || 'Transmissão'}</h2>
            <p className={styles.modalMeta}>Criada em: {formatDate(campaign.created)}</p>
          </div>
          <button type="button" className={styles.iconBtn} aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className={styles.campaignActions}>
          {canPauseCampaign(campaign) && (
            <button
              type="button"
              className={`${styles.btnOutline} ${styles.btnOutlineWarning}`}
              onClick={() => onAction(campaign, 'stop')}
            >
              Pausar
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              type="button"
              className={`${styles.btnOutline} ${styles.btnOutlineSuccess}`}
              onClick={() => onAction(campaign, 'continue')}
            >
              Retomar
            </button>
          )}
          <button
            type="button"
            className={`${styles.btnOutline} ${styles.btnOutlineDanger}`}
            onClick={() => onAction(campaign, 'delete')}
          >
            Excluir
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            title="Atualizar"
            onClick={onReload}
          >
            <RefreshCw style={{ width: 16, height: 16, color: '#94a3b8', animation: loadingMessages ? 'broadcastSpin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        <div className={styles.detailStats}>
          <div className={`${styles.detailStat} ${styles.detailStatSuccess}`}>
            <span>Entregues</span>
            <strong>{campaign.log_delivered || 0}</strong>
          </div>
          <div className={styles.detailStat}>
            <span>Lidas</span>
            <strong>{campaign.log_read || 0}</strong>
          </div>
          <div className={`${styles.detailStat} ${styles.detailStatDanger}`}>
            <span>Falhas</span>
            <strong>{campaign.log_failed || 0}</strong>
          </div>
        </div>

        <h4 className={styles.logsTitle}>Logs de envio</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.logsTable}>
            <thead>
              <tr>
                <th>Contato</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loadingMessages ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>
                    <Loader style={{ width: 16, height: 16, animation: 'broadcastSpin 1s linear infinite' }} />
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>
                    Nenhuma mensagem registrada.
                  </td>
                </tr>
              ) : (
                messages.map((msg) => {
                  const recipient = resolveDispatchRecipient(msg.chatid || '', contacts)
                  const initial = String(recipient.name || '?').charAt(0).toUpperCase()
                  return (
                    <tr key={msg.id}>
                      <td>
                        <div className={styles.recipient}>
                          <div className={styles.recipientAvatar}>
                            {recipient.avatarUrl ? (
                              <img src={recipient.avatarUrl} alt={recipient.name} />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <div className={styles.recipientMeta}>
                            <strong>{recipient.name}</strong>
                            <small>{recipient.displayNumber}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={statusClass(msg.status)}>{msg.status}</span>
                      </td>
                      <td>
                        <button type="button" className={styles.iconBtn} title="Ver mensagem">
                          <Eye style={{ width: 16, height: 16 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
