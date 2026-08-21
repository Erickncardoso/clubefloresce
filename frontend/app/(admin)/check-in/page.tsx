'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Eye,
  Image as ImageIcon,
  LineChart,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Pencil,
  Power,
} from 'lucide-react'
import { ApiError } from '@/lib/api'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { CheckinResponseMockup } from '@/components/patients/CheckinResponseMockup'
import {
  PatientNutritionModal,
  type NutritionModalTab,
} from '@/components/patients/PatientNutritionModal'
import { FloatField } from '@/components/ui/FloatField'
import { CfDateInput } from '@/components/ui/CfDateInput'
import { CfSelect } from '@/components/ui/CfSelect'
import { ConfirmDialog } from '@/components/overlays'
import { TileActionsMenu } from '@/components/courses/TileActionsMenu'
import {
  CheckinTemplateEditorModal,
} from '@/components/checkin/CheckinTemplateEditorModal'
import {
  formatCheckinPeriod,
  summarizeCheckinAnswers,
} from '@/lib/checkin-answers'
import {
  type CheckinResponseItem,
  type CheckinTemplate,
  type DispatchPatient,
  type TemplatePayload,
  cancelDispatchSchedule,
  createCheckinTemplate,
  deleteCheckinTemplate,
  dispatchCustom,
  dispatchWeeklyCheckIn,
  formatResponseUpdatedAt,
  formatScheduleWhen,
  frequencyLabel,
  getDispatchStatus,
  listCheckinResponses,
  listCheckinTemplates,
  listDispatchSchedules,
  listPatientsForDispatch,
  updateCheckinTemplate,
} from '@/lib/checkin'
import {
  countNewCheckinResponses,
  formatCheckinUnreadBadge,
  getCheckinResponsesLastSeenAt,
  markCheckinResponsesSeen,
  sortCheckinResponsesNewestFirst,
} from '@/lib/checkin-unread'
import type { CheckinSchedule } from '@/lib/types'
import { buildPatientPath } from '@/lib/patient-slug'
import styles from './check-in.module.scss'

const DISPATCH_PATIENT_SEARCH_MIN = 2
const DISPATCH_PATIENT_VISIBLE_LIMIT = 80

type Tab = 'dispatch' | 'responses' | 'templates'

function FrequencyIcon({ freq }: { freq?: string | null }) {
  if (freq === 'daily') return <CalendarDays size={14} aria-hidden />
  if (freq === 'monthly') return <CalendarRange size={14} aria-hidden />
  return <Calendar size={14} aria-hidden />
}

export default function CheckInPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dispatch')
  const [loadingResponses, setLoadingResponses] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [responses, setResponses] = useState<CheckinResponseItem[]>([])
  const [responsesError, setResponsesError] = useState('')
  const [templates, setTemplates] = useState<CheckinTemplate[]>([])
  const [responseSearch, setResponseSearch] = useState('')
  const [responseTypeFilter, setResponseTypeFilter] = useState('')
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const [seenBaseline, setSeenBaseline] = useState<string | null>(null)
  const responsesRequestId = useRef(0)

  const [dispatching, setDispatching] = useState(false)
  const [dispatchMessage, setDispatchMessage] = useState('')
  const [dispatchStatus, setDispatchStatus] = useState({ dispatched: false, periodKey: '' })
  const [customDispatching, setCustomDispatching] = useState(false)
  const [customDispatchMessage, setCustomDispatchMessage] = useState('')
  const [dispatchSchedules, setDispatchSchedules] = useState<CheckinSchedule[]>([])
  const [dispatchPatients, setDispatchPatients] = useState<DispatchPatient[]>([])
  const [dispatchPatientSearch, setDispatchPatientSearch] = useState('')

  const [customDispatch, setCustomDispatch] = useState({
    templateId: '',
    allPatients: false,
    userIds: [] as string[],
    periodDate: '',
    mode: 'now' as 'now' | 'schedule',
    scheduledAt: '',
    title: '',
    body: '',
  })

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingTemplate, setEditingTemplate] = useState<CheckinTemplate | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CheckinTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  const [viewOpen, setViewOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<CheckinResponseItem | null>(null)
  const [modalNutritionTab, setModalNutritionTab] = useState<NutritionModalTab>('fotos')

  const loadResponses = useCallback(async () => {
    const requestId = ++responsesRequestId.current
    setLoadingResponses(true)
    setResponsesError('')
    try {
      const data = await listCheckinResponses()
      if (requestId !== responsesRequestId.current) return
      setResponses(sortCheckinResponsesNewestFirst(data.responses || []))
    } catch (err) {
      if (requestId !== responsesRequestId.current) return
      // Não zera a lista: em Strict Mode / proxy instável um request falho
      // sobrescrevia outro que já tinha trazido as respostas.
      setResponsesError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as respostas.',
      )
    } finally {
      if (requestId === responsesRequestId.current) {
        setLoadingResponses(false)
      }
    }
  }, [])

  useEffect(() => {
    setLastSeenAt(getCheckinResponsesLastSeenAt())
  }, [])

  useEffect(() => {
    if (activeTab !== 'responses') return
    if (loadingResponses) return
    if (!responses.length && responsesError) return
    const previous = getCheckinResponsesLastSeenAt()
    setSeenBaseline(previous)
    const stamp = new Date().toISOString()
    markCheckinResponsesSeen(stamp)
    setLastSeenAt(stamp)
  }, [activeTab, loadingResponses, responses.length, responsesError])

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const data = await listCheckinTemplates()
      setTemplates(data.templates || [])
    } catch {
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  const loadDispatch = useCallback(async () => {
    try {
      const [status, schedules, patients] = await Promise.all([
        getDispatchStatus().catch(() => ({ dispatched: false, periodKey: '' })),
        listDispatchSchedules().catch(() => ({ schedules: [] as CheckinSchedule[] })),
        listPatientsForDispatch().catch(() => [] as DispatchPatient[]),
      ])
      setDispatchStatus({
        dispatched: Boolean(status.dispatched),
        periodKey: status.periodKey || '',
      })
      setDispatchSchedules(schedules.schedules || [])
      setDispatchPatients(patients)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadResponses(), loadTemplates(), loadDispatch()])
  }, [loadResponses, loadTemplates, loadDispatch])

  const responseTypeOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of responses) {
      const id = item.template?.id
      if (!id) continue
      if (!map.has(id)) map.set(id, item.template?.title || 'Check-in')
    }
    for (const tpl of templates) {
      if (!map.has(tpl.id)) map.set(tpl.id, tpl.title || 'Check-in')
    }
    return [
      { value: '', label: 'Todos os tipos' },
      ...[...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
        .map(([value, label]) => ({ value, label })),
    ]
  }, [responses, templates])

  const filteredResponses = useMemo(() => {
    const q = responseSearch.trim().toLowerCase()
    const sorted = sortCheckinResponsesNewestFirst(responses)
    return sorted.filter((item) => {
      if (responseTypeFilter && item.template?.id !== responseTypeFilter) return false
      if (!q) return true
      const name = item.user?.name?.toLowerCase() || ''
      const title = item.template?.title?.toLowerCase() || ''
      const summary = summarizeCheckinAnswers(item.template?.steps, item.answers).toLowerCase()
      return name.includes(q) || title.includes(q) || summary.includes(q)
    })
  }, [responses, responseSearch, responseTypeFilter])

  const newResponsesCount = useMemo(
    () => countNewCheckinResponses(responses, lastSeenAt),
    [responses, lastSeenAt],
  )

  const newResponsesBadge = formatCheckinUnreadBadge(newResponsesCount)

  function isNewResponse(item: CheckinResponseItem) {
    if (activeTab !== 'responses' || !seenBaseline) return false
    return countNewCheckinResponses([item], seenBaseline) > 0
  }

  const sortedTemplates = useMemo(
    () =>
      [...templates].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        const freqOrder: Record<string, number> = { weekly: 0, daily: 1, monthly: 2 }
        const fa = freqOrder[a.frequency || 'weekly'] ?? 0
        const fb = freqOrder[b.frequency || 'weekly'] ?? 0
        if (fa !== fb) return fa - fb
        return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR')
      }),
    [templates],
  )

  const dispatchPeriodHint = useMemo(() => {
    const tpl = templates.find((t) => t.id === customDispatch.templateId)
    if (!tpl) return 'Define a semana, dia ou mês da resposta. Vazio = período atual.'
    if (tpl.frequency === 'daily') return 'Dia da resposta (ex.: hoje). Vazio = hoje.'
    if (tpl.frequency === 'monthly') return 'Mês da resposta. Vazio = mês atual.'
    return 'Semana da resposta. Vazio = semana atual.'
  }, [templates, customDispatch.templateId])

  const templateSelectOptions = useMemo(
    () =>
      templates
        .filter((tpl) => tpl.active)
        .map((tpl) => ({
          value: tpl.id,
          label: `${tpl.title} (${frequencyLabel(tpl.frequency)})`,
        })),
    [templates],
  )

  const scheduleModeOptions = useMemo(
    () => [
      { value: 'now', label: 'Enviar agora' },
      { value: 'schedule', label: 'Agendar data e hora' },
    ],
    [],
  )

  const filteredDispatchPatients = useMemo(() => {
    const q = dispatchPatientSearch.trim().toLowerCase()
    const all = dispatchPatients
    const needsSearch = all.length > DISPATCH_PATIENT_VISIBLE_LIMIT
    if (!q) return needsSearch ? [] : all
    const minLen = needsSearch ? DISPATCH_PATIENT_SEARCH_MIN : 1
    if (q.length < minLen) return []
    return all.filter((p) => {
      const name = p.name.toLowerCase()
      const email = (p.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [dispatchPatients, dispatchPatientSearch])

  const visibleDispatchPatients = useMemo(
    () => filteredDispatchPatients.slice(0, DISPATCH_PATIENT_VISIBLE_LIMIT),
    [filteredDispatchPatients],
  )

  const dispatchPatientListHint = useMemo(() => {
    const total = dispatchPatients.length
    const q = dispatchPatientSearch.trim()
    const needsSearch = total > DISPATCH_PATIENT_VISIBLE_LIMIT
    if (!total) return 'Nenhum paciente cadastrado no sistema.'
    if (!q && needsSearch) {
      return `Há ${total} pacientes. Digite pelo menos ${DISPATCH_PATIENT_SEARCH_MIN} caracteres para buscar e selecionar.`
    }
    if (q) {
      const minLen = needsSearch ? DISPATCH_PATIENT_SEARCH_MIN : 1
      if (q.length < minLen) {
        return needsSearch
          ? `Digite pelo menos ${DISPATCH_PATIENT_SEARCH_MIN} caracteres para buscar.`
          : ''
      }
    }
    if (q && !filteredDispatchPatients.length) return ''
    if (filteredDispatchPatients.length > DISPATCH_PATIENT_VISIBLE_LIMIT) {
      return `Mostrando ${DISPATCH_PATIENT_VISIBLE_LIMIT} de ${filteredDispatchPatients.length} resultados. Refine a busca.`
    }
    return ''
  }, [dispatchPatients.length, dispatchPatientSearch, filteredDispatchPatients])

  const selectedDispatchPatients = useMemo(() => {
    const selected = new Set(customDispatch.userIds)
    return dispatchPatients.filter((p) => selected.has(p.id))
  }, [customDispatch.userIds, dispatchPatients])

  async function handleWeeklyDispatch() {
    setDispatchMessage('')
    setDispatching(true)
    try {
      const result = await dispatchWeeklyCheckIn(true)
      setDispatchMessage(result.message || 'Disparo concluído.')
      const status = await getDispatchStatus()
      setDispatchStatus({
        dispatched: Boolean(status.dispatched),
        periodKey: status.periodKey || '',
      })
    } catch (err) {
      setDispatchMessage(
        err instanceof ApiError ? err.message : 'Não foi possível disparar o check-in.',
      )
    } finally {
      setDispatching(false)
    }
  }

  async function handleCustomDispatch(e: FormEvent) {
    e.preventDefault()
    setCustomDispatchMessage('')
    if (!customDispatch.templateId) {
      setCustomDispatchMessage('Selecione um tipo de check-in.')
      return
    }
    if (!customDispatch.allPatients && !customDispatch.userIds.length) {
      setCustomDispatchMessage('Selecione pelo menos um paciente ou marque todos.')
      return
    }

    setCustomDispatching(true)
    try {
      const body: Parameters<typeof dispatchCustom>[0] = {
        templateId: customDispatch.templateId,
        allPatients: customDispatch.allPatients,
        userIds: customDispatch.allPatients ? [] : [...customDispatch.userIds],
        periodDate: customDispatch.periodDate || null,
        title: customDispatch.title.trim() || null,
        body: customDispatch.body.trim() || null,
      }
      if (customDispatch.mode === 'schedule') {
        if (!customDispatch.scheduledAt) {
          setCustomDispatchMessage('Informe data e hora do envio.')
          setCustomDispatching(false)
          return
        }
        body.scheduledAt = new Date(customDispatch.scheduledAt).toISOString()
      }
      const result = await dispatchCustom(body)
      setCustomDispatchMessage(result.message || 'Disparo processado.')
      if (!result.scheduled) {
        setCustomDispatch((prev) => ({ ...prev, userIds: [] }))
      }
      const schedules = await listDispatchSchedules()
      setDispatchSchedules(schedules.schedules || [])
    } catch (err) {
      setCustomDispatchMessage(
        err instanceof ApiError ? err.message : 'Não foi possível processar o disparo.',
      )
    } finally {
      setCustomDispatching(false)
    }
  }

  async function handleCancelSchedule(id: string) {
    try {
      const result = await cancelDispatchSchedule(id)
      setCustomDispatchMessage(result.message || 'Agendamento cancelado.')
      const schedules = await listDispatchSchedules()
      setDispatchSchedules(schedules.schedules || [])
    } catch (err) {
      setCustomDispatchMessage(
        err instanceof ApiError ? err.message : 'Não foi possível cancelar.',
      )
    }
  }

  function togglePatient(id: string) {
    setCustomDispatch((prev) => {
      const has = prev.userIds.includes(id)
      return {
        ...prev,
        userIds: has ? prev.userIds.filter((x) => x !== id) : [...prev.userIds, id],
      }
    })
  }

  function openCreateTemplate() {
    setActiveTab('templates')
    setEditorMode('create')
    setEditingTemplate(null)
    setEditorError('')
    setEditorOpen(true)
  }

  function openTemplatesTab() {
    setActiveTab('templates')
  }

  function openEditTemplate(tpl: CheckinTemplate) {
    setEditorMode('edit')
    setEditingTemplate(tpl)
    setEditorError('')
    setEditorOpen(true)
  }

  async function handleSaveTemplate(payload: TemplatePayload) {
    setSavingTemplate(true)
    setEditorError('')
    try {
      if (editorMode === 'create') {
        await createCheckinTemplate(payload)
      } else if (editingTemplate?.id) {
        await updateCheckinTemplate(editingTemplate.id, payload)
      }
      setEditorOpen(false)
      await loadTemplates()
    } catch (err) {
      setEditorError(err instanceof ApiError ? err.message : 'Erro ao salvar.')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleToggleActive(tpl: CheckinTemplate) {
    try {
      await updateCheckinTemplate(tpl.id, { active: !tpl.active })
      await loadTemplates()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao atualizar.')
    }
  }

  function requestDeleteTemplate(tpl: CheckinTemplate) {
    setDeleteTarget(tpl)
  }

  async function confirmDeleteTemplate() {
    if (!deleteTarget) return
    setDeletingTemplate(true)
    try {
      await deleteCheckinTemplate(deleteTarget.id)
      setDeleteTarget(null)
      await loadTemplates()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao excluir.')
    } finally {
      setDeletingTemplate(false)
    }
  }

  function openViewModal(item: CheckinResponseItem, tab: NutritionModalTab = 'fotos') {
    setSelectedResponse(item)
    setModalNutritionTab(tab)
    setViewOpen(true)
  }

  function closeViewModal() {
    setViewOpen(false)
    setSelectedResponse(null)
    setModalNutritionTab('fotos')
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Check-ins</h1>
          <p>Envie formulários, acompanhe respostas e gerencie os modelos.</p>
        </div>
        <div className={styles.headActions}>
          <button type="button" className="btn-secondary" onClick={openTemplatesTab}>
            <ListChecks size={16} aria-hidden />
            Ver modelos
          </button>
          <button type="button" className="btn-primary" onClick={openCreateTemplate}>
            <Plus size={16} aria-hidden />
            Criar modelo
          </button>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Seções de check-in">
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'dispatch' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('dispatch')}
        >
          Enviar
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'responses' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('responses')}
        >
          Respostas
          {newResponsesBadge ? (
            <span className={`${styles.tabCount} ${styles.tabCountNew}`} aria-label={`${newResponsesCount} novas`}>
              {newResponsesBadge}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'templates' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Modelos
          {templates.length ? (
            <span className={styles.tabCount}>{templates.length}</span>
          ) : null}
        </button>
      </nav>

      {activeTab === 'dispatch' ? (
      <section className={`admin-shell-card ${styles.dispatchCard}`}>
        <div className={styles.dispatchTop}>
          <div className={styles.dispatchCopy}>
            <p className={styles.dispatchKicker}>Envio</p>
            <h2>Enviar check-in</h2>
            <p>
              Automático toda <strong>sexta às 11h</strong>. Ou monte um disparo
              personalizado abaixo.
            </p>
            {dispatchStatus.dispatched ? (
              <p className={styles.dispatchNote}>Disparo em massa desta semana já realizado.</p>
            ) : null}
          </div>
          <button
            type="button"
            className={`btn-secondary ${styles.dispatchBtn}`}
            disabled={dispatching}
            onClick={() => void handleWeeklyDispatch()}
          >
            <CalendarDays size={16} aria-hidden />
            {dispatching ? 'Enviando...' : 'Disparar semanal'}
          </button>
        </div>

        {dispatchMessage ? <p className={styles.feedback}>{dispatchMessage}</p> : null}

        <form className={styles.customDispatch} onSubmit={handleCustomDispatch}>
          <div className={styles.customDispatchHead}>
            <h3>Disparo personalizado</h3>
            <p>Escolha o modelo, o período e se envia agora ou agenda.</p>
          </div>
          <div className={styles.dispatchFields}>
            <div className="field field--float">
              <label htmlFor="checkin-template">Tipo de check-in</label>
              <CfSelect
                id="checkin-template"
                value={customDispatch.templateId}
                onChange={(templateId) =>
                  setCustomDispatch((prev) => ({ ...prev, templateId }))
                }
                options={templateSelectOptions}
                placeholder="Selecione o check-in"
              />
            </div>

            <div className={styles.periodField}>
              <div className="field field--float">
                <label htmlFor="checkin-period-date">Período de referência (opcional)</label>
                <CfDateInput
                  id="checkin-period-date"
                  value={customDispatch.periodDate}
                  onChange={(periodDate) =>
                    setCustomDispatch((prev) => ({ ...prev, periodDate }))
                  }
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <small className={styles.fieldHint}>{dispatchPeriodHint}</small>
            </div>

            <div className="field field--float">
              <label htmlFor="checkin-schedule-mode">Programar envio</label>
              <CfSelect
                id="checkin-schedule-mode"
                value={customDispatch.mode}
                onChange={(mode) =>
                  setCustomDispatch((prev) => ({
                    ...prev,
                    mode: mode as 'now' | 'schedule',
                  }))
                }
                options={scheduleModeOptions}
                placeholder="Selecione"
              />
            </div>

            {customDispatch.mode === 'schedule' ? (
              <FloatField
                label="Data e hora do envio"
                type="datetime-local"
                required
                value={customDispatch.scheduledAt}
                onChange={(e) =>
                  setCustomDispatch((prev) => ({ ...prev, scheduledAt: e.target.value }))
                }
                className={styles.fullField}
              />
            ) : null}

            <FloatField
              label="Título da notificação (opcional)"
              value={customDispatch.title}
              onChange={(e) => setCustomDispatch((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={80}
              placeholder="Ex: Check-in da semana"
              className={styles.fullField}
            />
            <FloatField
              label="Mensagem (opcional)"
              value={customDispatch.body}
              onChange={(e) => setCustomDispatch((prev) => ({ ...prev, body: e.target.value }))}
              maxLength={200}
              placeholder="Texto que o paciente verá na notificação"
              className={styles.fullField}
            />
          </div>

          <div className={styles.patientsBlock}>
            <div className={styles.patientsHead}>
              <strong>Pacientes</strong>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={customDispatch.allPatients}
                  onChange={(e) =>
                    setCustomDispatch((prev) => ({ ...prev, allPatients: e.target.checked }))
                  }
                />
                <span>Todos os pacientes</span>
              </label>
            </div>

            {!customDispatch.allPatients ? (
              <div className={styles.patientTools}>
                <div className={styles.patientsMeta}>
                  <span>{dispatchPatients.length} pacientes cadastrados</span>
                  {customDispatch.userIds.length ? (
                    <span className={styles.selectedCount}>
                      {customDispatch.userIds.length} selecionada(s)
                    </span>
                  ) : null}
                </div>

                {selectedDispatchPatients.length ? (
                  <div className={styles.chipList} aria-label="Pacientes selecionadas">
                    {selectedDispatchPatients.map((patient) => (
                      <span key={patient.id} className={styles.chip}>
                        <PatientAvatar
                          src={patient.avatar}
                          name={patient.name}
                          size="xs"
                          circle
                          ring={false}
                        />
                        <span className={styles.chipText}>
                          <span className={styles.chipName}>{patient.name}</span>
                          {patient.email ? (
                            <span className={styles.chipEmail}>{patient.email}</span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${patient.name}`}
                          onClick={() =>
                            setCustomDispatch((prev) => ({
                              ...prev,
                              userIds: prev.userIds.filter((id) => id !== patient.id),
                            }))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className={styles.search}>
                  <Search className={styles.searchIcon} size={16} aria-hidden />
                  <input
                    type="search"
                    value={dispatchPatientSearch}
                    onChange={(e) => setDispatchPatientSearch(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    aria-label="Buscar paciente para disparo"
                  />
                </div>

                <div className={styles.patientPanel}>
                  {dispatchPatientListHint ? (
                    <p className={styles.patientHint}>{dispatchPatientListHint}</p>
                  ) : null}
                  {visibleDispatchPatients.length ? (
                    <ul className={styles.patientList} aria-label="Lista de pacientes">
                      {visibleDispatchPatients.map((patient) => (
                        <li key={patient.id}>
                          <label className={styles.patientItem}>
                            <input
                              type="checkbox"
                              checked={customDispatch.userIds.includes(patient.id)}
                              onChange={() => togglePatient(patient.id)}
                            />
                            <PatientAvatar
                              src={patient.avatar}
                              name={patient.name}
                              size="sm"
                              circle
                              ring={false}
                            />
                            <span className={styles.patientMeta}>
                              <span className={styles.patientName}>{patient.name}</span>
                              {patient.email ? (
                                <span className={styles.patientEmail}>{patient.email}</span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : !dispatchPatientListHint ? (
                    <p className={styles.patientEmpty}>Nenhum paciente encontrado.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <button type="submit" className="btn-primary" disabled={customDispatching}>
            {customDispatching
              ? 'Processando...'
              : customDispatch.mode === 'schedule'
                ? 'Programar envio'
                : 'Enviar agora'}
          </button>
          {customDispatchMessage ? (
            <p className={styles.feedback}>{customDispatchMessage}</p>
          ) : null}
        </form>

        {dispatchSchedules.length ? (
          <div className={styles.schedules}>
            <h3>Agendamentos</h3>
            <ul>
              {dispatchSchedules.map((item) => (
                <li key={item.id} className={styles.scheduleItem}>
                  <div>
                    <strong>{item.templateTitle || 'Check-in'}</strong>
                    <span>{formatScheduleWhen(item.scheduledAt)}</span>
                    <small>
                      {item.allPatients
                        ? 'Todos os pacientes'
                        : `${item.userIds?.length || 0} paciente(s)`}
                    </small>
                  </div>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => void handleCancelSchedule(item.id)}
                  >
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      ) : null}

      {activeTab === 'responses' ? (
        <section className={styles.section}>
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <Search className={styles.searchIcon} size={16} aria-hidden />
              <input
                type="search"
                value={responseSearch}
                onChange={(e) => setResponseSearch(e.target.value)}
                placeholder="Buscar paciente ou check-in..."
                aria-label="Buscar respostas"
              />
            </div>
            <div className={styles.typeFilter}>
              <CfSelect
                id="checkin-response-type"
                value={responseTypeFilter}
                options={responseTypeOptions}
                placeholder="Filtrar por tipo"
                onChange={setResponseTypeFilter}
              />
            </div>
            <span className={styles.count}>
              {filteredResponses.length} resposta{filteredResponses.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingResponses ? (
            <div className={styles.loading}>Carregando respostas...</div>
          ) : responsesError && !filteredResponses.length ? (
            <div className={`admin-shell-card ${styles.empty}`}>
              <p>Não foi possível carregar as respostas.</p>
              <span>{responsesError}</span>
              <button type="button" className="btn-primary" onClick={() => void loadResponses()}>
                Tentar de novo
              </button>
            </div>
          ) : !filteredResponses.length ? (
            <div className={`admin-shell-card ${styles.empty}`}>
              <p>
                {responses.length
                  ? 'Nenhuma resposta neste filtro.'
                  : 'Nenhuma resposta ainda.'}
              </p>
              <span>
                {responses.length
                  ? 'Ajuste a busca ou o tipo de check-in para ver outros resultados.'
                  : 'Quando os pacientes responderem os check-ins, os dados aparecem aqui.'}
              </span>
            </div>
          ) : (
            <div className={`admin-shell-card ${styles.tableCard}`}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Check-in</th>
                      <th>Período</th>
                      <th>Resumo</th>
                      <th>Atualizado</th>
                      <th className={styles.thActions} aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.map((item) => (
                      <tr
                        key={item.id}
                        className={`${styles.row} ${isNewResponse(item) ? styles.rowNew : ''}`}
                        onClick={() => openViewModal(item)}
                      >
                        <td>
                          <div className={styles.patientCell}>
                            <PatientAvatar
                              src={item.user?.avatar}
                              name={item.user?.name || 'Paciente'}
                              size="sm"
                              ring={false}
                            />
                            <span className={styles.patientName}>
                              {item.user?.name || 'Paciente'}
                              {isNewResponse(item) ? (
                                <em className={styles.newTag}>Nova</em>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td>{item.template?.title || '—'}</td>
                        <td className={styles.muted}>
                          {formatCheckinPeriod(item.periodKey, item.template?.frequency)}
                        </td>
                        <td className={styles.summary}>
                          {summarizeCheckinAnswers(item.template?.steps, item.answers)}
                        </td>
                        <td className={styles.muted}>{formatResponseUpdatedAt(item.updatedAt)}</td>
                        <td className={styles.tdActions} onClick={(e) => e.stopPropagation()}>
                          <TileActionsMenu menuKey={`checkin-response-${item.id}`}>
                            <button
                              type="button"
                              className="cf-tile-actions-item"
                              onClick={() => openViewModal(item, 'fotos')}
                            >
                              <Eye size={14} aria-hidden />
                              Ver respostas
                            </button>
                            {item.user?.id ? (
                              <button
                                type="button"
                                className="cf-tile-actions-item"
                                onClick={() => openViewModal(item, 'fotos')}
                              >
                                <ImageIcon size={14} aria-hidden />
                                Fotos
                              </button>
                            ) : null}
                            {item.user?.id ? (
                              <button
                                type="button"
                                className="cf-tile-actions-item"
                                onClick={() => openViewModal(item, 'desempenho')}
                              >
                                <LineChart size={14} aria-hidden />
                                Nutrição
                              </button>
                            ) : null}
                          </TileActionsMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <div className={`admin-shell-card ${styles.templatesToolbar}`}>
            <div className={styles.templatesToolbarCopy}>
              <span className={styles.templatesCount} aria-hidden>
                {templates.length}
              </span>
              <div>
                <strong>Modelos cadastrados</strong>
                <p>Formulários que as pacientes respondem no app — semanal, diário ou mensal.</p>
              </div>
            </div>
          </div>

          {loadingTemplates ? (
            <div className={styles.loading}>Carregando modelos...</div>
          ) : !templates.length ? (
            <div className={`admin-shell-card ${styles.empty}`}>
              <p>Nenhum modelo ainda</p>
              <span>Use “Criar modelo” no topo para montar o primeiro formulário.</span>
            </div>
          ) : (
            <div className={styles.templatesGrid}>
              {sortedTemplates.map((tpl) => {
                const questions = Array.isArray(tpl.steps) ? tpl.steps.length : 0
                const responsesCount = tpl._count?.responses || 0
                return (
                  <article
                    key={tpl.id}
                    className={`admin-shell-card ${styles.templateCard} ${!tpl.active ? styles.templateInactive : ''}`}
                  >
                    <div className={styles.templateBody}>
                      <header className={styles.templateHead}>
                        <div>
                          <span className={styles.freqLabel}>
                            <FrequencyIcon freq={tpl.frequency} />
                            {frequencyLabel(tpl.frequency)}
                          </span>
                          <h3>{tpl.title}</h3>
                        </div>
                        <div className={styles.badges}>
                          <span
                            className={`${styles.badge} ${!tpl.active ? styles.badgeOff : ''}`}
                          >
                            {tpl.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </header>
                      <p className={styles.templateDesc}>
                        {tpl.description ||
                          'Sem descrição — adicione um texto curto para orientar o paciente.'}
                      </p>
                      <ul className={styles.templateStats}>
                        <li>
                          <ListChecks size={14} aria-hidden />
                          <span>
                            <strong>{questions}</strong>{' '}
                            {questions === 1 ? 'pergunta' : 'perguntas'}
                          </span>
                        </li>
                        <li>
                          <MessageSquare size={14} aria-hidden />
                          <span>
                            <strong>{responsesCount}</strong>{' '}
                            {responsesCount === 1 ? 'resposta' : 'respostas'}
                          </span>
                        </li>
                      </ul>
                    </div>
                    <footer className={styles.templateActions}>
                      <button
                        type="button"
                        className={`${styles.templateAction} ${styles.templateActionPrimary}`}
                        onClick={() => openEditTemplate(tpl)}
                      >
                        <Pencil size={14} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.templateAction}
                        onClick={() => void handleToggleActive(tpl)}
                      >
                        <Power size={14} aria-hidden />
                        {tpl.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className={`btn-danger-soft ${styles.templateActionDanger}`}
                        onClick={() => requestDeleteTemplate(tpl)}
                      >
                        <Trash2 size={14} aria-hidden />
                        Excluir
                      </button>
                    </footer>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      <CheckinTemplateEditorModal
        open={editorOpen}
        mode={editorMode}
        template={editingTemplate}
        saving={savingTemplate}
        error={editorError}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveTemplate}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingTemplate) setDeleteTarget(null)
        }}
        title="Excluir modelo?"
        description={
          deleteTarget
            ? `Excluir "${deleteTarget.title}"? As respostas anteriores também serão removidas.`
            : undefined
        }
        cancelLabel="Cancelar"
        confirmLabel={deletingTemplate ? 'Excluindo...' : 'Excluir'}
        tone="danger"
        busy={deletingTemplate}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteTemplate()}
      />

      {selectedResponse ? (
        <PatientNutritionModal
          open={viewOpen}
          onOpenChange={(open) => {
            if (!open) closeViewModal()
          }}
          patientId={selectedResponse.user?.id || ''}
          patientName={selectedResponse.user?.name || 'Paciente'}
          patientAvatar={selectedResponse.user?.avatar}
          kicker={selectedResponse.template?.title || 'Check-in'}
          initialTab={modalNutritionTab}
          meta={
            <>
              <span>
                {formatCheckinPeriod(
                  selectedResponse.periodKey,
                  selectedResponse.template?.frequency,
                )}
              </span>
              <span>{formatResponseUpdatedAt(selectedResponse.updatedAt)}</span>
            </>
          }
          leftTitle="Respostas no celular"
          leftPanel={
            <CheckinResponseMockup
              title={selectedResponse.template?.title || 'Check-in'}
              steps={selectedResponse.template?.steps as never}
              answers={selectedResponse.answers}
              patientId={selectedResponse.user?.id}
              showPhotos={false}
            />
          }
          profileHref={
            selectedResponse.user?.id ? buildPatientPath(selectedResponse.user) : undefined
          }
          onProfileClick={closeViewModal}
        />
      ) : null}
    </div>
  )
}
