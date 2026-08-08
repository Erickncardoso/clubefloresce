'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Eye,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react'
import { ApiError } from '@/lib/api'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { FloatField } from '@/components/ui/FloatField'
import {
  CheckinTemplateEditorModal,
} from '@/components/checkin/CheckinTemplateEditorModal'
import {
  buildAnswerRows,
  formatCheckinPeriod,
  summarizeCheckinAnswers,
} from '@/lib/checkin-answers'
import {
  type CheckinResponseItem,
  type CheckinTemplate,
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
import type { CheckinSchedule } from '@/lib/types'
import { buildPatientPath } from '@/lib/patient-slug'
import styles from './check-in.module.scss'

const DISPATCH_PATIENT_SEARCH_MIN = 2
const DISPATCH_PATIENT_VISIBLE_LIMIT = 80

type Tab = 'responses' | 'templates'

function FrequencyIcon({ freq }: { freq?: string | null }) {
  if (freq === 'daily') return <CalendarDays size={14} aria-hidden />
  if (freq === 'monthly') return <CalendarRange size={14} aria-hidden />
  return <Calendar size={14} aria-hidden />
}

export default function CheckInPage() {
  const [activeTab, setActiveTab] = useState<Tab>('responses')
  const [loadingResponses, setLoadingResponses] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [responses, setResponses] = useState<CheckinResponseItem[]>([])
  const [templates, setTemplates] = useState<CheckinTemplate[]>([])
  const [responseSearch, setResponseSearch] = useState('')

  const [dispatching, setDispatching] = useState(false)
  const [dispatchMessage, setDispatchMessage] = useState('')
  const [dispatchStatus, setDispatchStatus] = useState({ dispatched: false, periodKey: '' })
  const [customDispatching, setCustomDispatching] = useState(false)
  const [customDispatchMessage, setCustomDispatchMessage] = useState('')
  const [dispatchSchedules, setDispatchSchedules] = useState<CheckinSchedule[]>([])
  const [dispatchPatients, setDispatchPatients] = useState<Array<{ id: string; name: string }>>([])
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

  const [viewOpen, setViewOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<CheckinResponseItem | null>(null)

  const loadResponses = useCallback(async () => {
    setLoadingResponses(true)
    try {
      const data = await listCheckinResponses()
      setResponses(data.responses || [])
    } catch {
      setResponses([])
    } finally {
      setLoadingResponses(false)
    }
  }, [])

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
        listPatientsForDispatch().catch(() => [] as Array<{ id: string; name: string }>),
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

  const filteredResponses = useMemo(() => {
    const q = responseSearch.trim().toLowerCase()
    if (!q) return responses
    return responses.filter((item) => {
      const name = item.user?.name?.toLowerCase() || ''
      const title = item.template?.title?.toLowerCase() || ''
      const summary = summarizeCheckinAnswers(item.template?.steps, item.answers).toLowerCase()
      return name.includes(q) || title.includes(q) || summary.includes(q)
    })
  }, [responses, responseSearch])

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

  const filteredDispatchPatients = useMemo(() => {
    const q = dispatchPatientSearch.trim().toLowerCase()
    const all = dispatchPatients
    const needsSearch = all.length > DISPATCH_PATIENT_VISIBLE_LIMIT
    if (!q) return needsSearch ? [] : all
    const minLen = needsSearch ? DISPATCH_PATIENT_SEARCH_MIN : 1
    if (q.length < minLen) return []
    return all.filter((p) => p.name.toLowerCase().includes(q))
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

  const answerRows = useMemo(() => {
    if (!selectedResponse) return []
    return buildAnswerRows(selectedResponse.template?.steps, selectedResponse.answers)
  }, [selectedResponse])

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
    setEditorMode('create')
    setEditingTemplate(null)
    setEditorError('')
    setEditorOpen(true)
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

  async function handleDeleteTemplate(tpl: CheckinTemplate) {
    const ok = window.confirm(
      `Excluir "${tpl.title}"? As respostas anteriores também serão removidas.`,
    )
    if (!ok) return
    try {
      await deleteCheckinTemplate(tpl.id)
      await loadTemplates()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao excluir.')
    }
  }

  function openViewModal(item: CheckinResponseItem) {
    setSelectedResponse(item)
    setViewOpen(true)
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Check-ins</h1>
          <p>Crie tipos de check-in personalizados e acompanhe as respostas dos pacientes.</p>
        </div>
      </header>

      <section className={`admin-shell-card ${styles.dispatchCard}`}>
        <div className={styles.dispatchCopy}>
          <h2>Disparos de check-in</h2>
          <p>
            O disparo automático semanal ocorre na <strong>sexta às 11h</strong>. Você também pode
            enviar check-ins individuais, escolher o paciente, o tipo e programar a data do envio.
          </p>
          {dispatchStatus.dispatched ? (
            <p className={styles.dispatchNote}>Disparo em massa desta semana já realizado.</p>
          ) : null}
        </div>

        <div className={styles.dispatchActions}>
          <button
            type="button"
            className={`btn-secondary ${styles.dispatchBtn}`}
            disabled={dispatching}
            onClick={() => void handleWeeklyDispatch()}
          >
            {dispatching ? 'Enviando...' : 'Disparar semanal (todas)'}
          </button>
        </div>

        <form className={styles.customDispatch} onSubmit={handleCustomDispatch}>
          <h3>Disparo personalizado</h3>
          <div className={styles.dispatchFields}>
            <FloatField
              as="select"
              label="Tipo de check-in"
              value={customDispatch.templateId}
              onChange={(e) =>
                setCustomDispatch((prev) => ({ ...prev, templateId: e.target.value }))
              }
            >
              <option value="">Selecione o check-in</option>
              {templates
                .filter((tpl) => tpl.active)
                .map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({frequencyLabel(tpl.frequency)})
                  </option>
                ))}
            </FloatField>

            <div>
              <FloatField
                label="Período de referência (opcional)"
                type="date"
                value={customDispatch.periodDate}
                onChange={(e) =>
                  setCustomDispatch((prev) => ({ ...prev, periodDate: e.target.value }))
                }
              />
              <small className={styles.fieldHint}>{dispatchPeriodHint}</small>
            </div>

            <FloatField
              as="select"
              label="Enviar"
              value={customDispatch.mode}
              onChange={(e) =>
                setCustomDispatch((prev) => ({
                  ...prev,
                  mode: e.target.value as 'now' | 'schedule',
                }))
              }
            >
              <option value="now">Agora</option>
              <option value="schedule">Programar data e hora</option>
            </FloatField>

            {customDispatch.mode === 'schedule' ? (
              <FloatField
                label="Data e hora do envio"
                type="datetime-local"
                required
                value={customDispatch.scheduledAt}
                onChange={(e) =>
                  setCustomDispatch((prev) => ({ ...prev, scheduledAt: e.target.value }))
                }
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
                        {patient.name}
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
                    placeholder="Buscar paciente por nome..."
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
                            <span>{patient.name}</span>
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
                ? 'Agendar disparo'
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

        {dispatchMessage ? <p className={styles.feedback}>{dispatchMessage}</p> : null}
      </section>

      <nav className={styles.tabs} aria-label="Seções de check-in">
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'responses' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('responses')}
        >
          Respostas
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'templates' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Tipos de check-in
        </button>
      </nav>

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
            <span className={styles.count}>
              {filteredResponses.length} resposta{filteredResponses.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingResponses ? (
            <div className={styles.loading}>Carregando respostas...</div>
          ) : !filteredResponses.length ? (
            <div className={`admin-shell-card ${styles.empty}`}>
              <p>Nenhuma resposta ainda.</p>
              <span>Quando os pacientes responderem os check-ins, os dados aparecem aqui.</span>
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
                        className={styles.row}
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
                          <button
                            type="button"
                            className={styles.actionMain}
                            onClick={() => openViewModal(item)}
                          >
                            <Eye size={14} aria-hidden />
                            Ver
                          </button>
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
                <strong>Tipos cadastrados</strong>
                <p>Formulários que os pacientes respondem no app — semanal, diário ou mensal.</p>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={openCreateTemplate}>
              <Plus size={16} aria-hidden />
              Novo check-in
            </button>
          </div>

          {loadingTemplates ? (
            <div className={styles.loading}>Carregando tipos...</div>
          ) : !templates.length ? (
            <div className={`admin-shell-card ${styles.empty}`}>
              <p>Nenhum tipo de check-in</p>
              <span>Crie o primeiro formulário para seus pacientes começarem a responder.</span>
              <button type="button" className="btn-primary" onClick={openCreateTemplate}>
                <Plus size={16} aria-hidden />
                Criar check-in
              </button>
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
                    <div
                      className={`${styles.templateAccent} ${styles[`freq_${tpl.frequency || 'weekly'}`] || ''}`}
                      aria-hidden
                    />
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
                          {tpl.isDefault ? (
                            <span className={`${styles.badge} ${styles.badgeDefault}`}>Padrão</span>
                          ) : null}
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
                      {!tpl.isDefault ? (
                        <button
                          type="button"
                          className={`${styles.templateAction} ${styles.templateActionDanger}`}
                          onClick={() => void handleDeleteTemplate(tpl)}
                        >
                          <Trash2 size={14} aria-hidden />
                          Excluir
                        </button>
                      ) : null}
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

      {viewOpen && selectedResponse ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => setViewOpen(false)}
        >
          <div
            className={styles.responseCard}
            role="dialog"
            aria-modal="true"
            aria-label="Resposta do check-in"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.responseHead}>
              <div className={styles.responseHeadMain}>
                <PatientAvatar
                  src={selectedResponse.user?.avatar}
                  name={selectedResponse.user?.name || 'Paciente'}
                  size="md"
                  ring={false}
                />
                <div>
                  <span className={styles.responseKicker}>
                    {selectedResponse.template?.title || 'Check-in'}
                  </span>
                  <h2>{selectedResponse.user?.name || 'Paciente'}</h2>
                  <p className={styles.responseMeta}>
                    <span>
                      {formatCheckinPeriod(
                        selectedResponse.periodKey,
                        selectedResponse.template?.frequency,
                      )}
                    </span>
                    <span>{formatResponseUpdatedAt(selectedResponse.updatedAt)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Fechar"
                onClick={() => setViewOpen(false)}
              >
                ×
              </button>
            </header>

            <div className={styles.responseBody}>
              <h3>Respostas do check-in</h3>
              {answerRows.length ? (
                answerRows.map((row) => (
                  <article key={row.id} className={styles.answerRow}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    {row.question ? <p>{row.question}</p> : null}
                  </article>
                ))
              ) : (
                <p className={styles.patientEmpty}>Sem respostas neste check-in.</p>
              )}
            </div>

            <footer className={styles.responseFoot}>
              <button type="button" className="btn-secondary" onClick={() => setViewOpen(false)}>
                Fechar
              </button>
              {selectedResponse.user?.id ? (
                <Link
                  href={buildPatientPath(selectedResponse.user)}
                  className="btn-primary"
                  onClick={() => setViewOpen(false)}
                >
                  Perfil do paciente
                </Link>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
