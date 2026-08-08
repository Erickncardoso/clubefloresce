'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronRight, Loader2, Sparkles, UserPlus, UtensilsCrossed } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import {
  buildPatientPath,
  formatDate,
  formatRelative,
  formatScheduleWhen,
} from '@/lib/patient-slug'
import type {
  AuthUser,
  CheckinSchedule,
  ConsumptionSummary,
  DangerWaJob,
  DiaryFeedEntry,
  EngagementZones,
  RegistrationRequest,
} from '@/lib/types'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import styles from './dashboard.module.scss'

const emptyConsumption: ConsumptionSummary = {
  date: '',
  totals: { patients: 0, meals: 0, caloriesKcal: 0 },
  patients: [],
}

const DEFAULT_DANGER_WA = `Olá, *{{primeiroNome}}*!

Notei que você está um pouco distante do acompanhamento esta semana.

Que tal registrar sua refeição no *diário alimentar* ou atualizar a *hidratação* no app? Isso me ajuda a cuidar melhor de você.

Se precisar de apoio, é só responder esta mensagem. Estou por aqui.`

const DANGER_WA_VARS_HINT = 'Variáveis: {{primeiroNome}} · {{nome}}'

function dayGreeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatLongDate(now = new Date()) {
  const raw = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function DashboardPage() {
  const [greetingName, setGreetingName] = useState('Nutricionista')
  const [loading, setLoading] = useState(true)
  const [patientsTotal, setPatientsTotal] = useState(0)
  const [recentPatients, setRecentPatients] = useState<AuthUser[]>([])
  const [schedules, setSchedules] = useState<CheckinSchedule[]>([])
  const [diaryFeed, setDiaryFeed] = useState<DiaryFeedEntry[]>([])
  const [consumption, setConsumption] = useState<ConsumptionSummary>(emptyConsumption)
  const [engagement, setEngagement] = useState<EngagementZones>({
    danger: [],
    attention: [],
    success: [],
  })
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [approveSeed, setApproveSeed] = useState<{
    name?: string
    email?: string
    phone?: string
  } | null>(null)
  const [approvingRequestId, setApprovingRequestId] = useState('')

  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [dangerMessage, setDangerMessage] = useState(DEFAULT_DANGER_WA)
  const [dangerStarting, setDangerStarting] = useState(false)
  const [dangerSending, setDangerSending] = useState(false)
  const [dangerStatusText, setDangerStatusText] = useState('')
  const dangerPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const carePatients = useMemo(() => {
    const danger = engagement.danger.map((patient) => ({
      patient,
      zone: 'danger' as const,
    }))
    const attention = engagement.attention.map((patient) => ({
      patient,
      zone: 'attention' as const,
    }))
    return [...danger, ...attention].slice(0, 8)
  }, [engagement])

  const needCount = engagement.danger.length + engagement.attention.length
  const greetingTitle = `${dayGreeting()}, ${greetingName}.`
  const todayLabel = formatLongDate()
  const diaryPreview = diaryFeed.slice(0, 3)

  const stopDangerPoll = useCallback(() => {
    if (dangerPollRef.current) {
      clearInterval(dangerPollRef.current)
      dangerPollRef.current = null
    }
  }, [])

  const pollDangerWaStatus = useCallback(async () => {
    try {
      const data = await apiFetch<{ job?: DangerWaJob }>(
        '/patients/engagement-zones/danger/whatsapp',
      )
      const job = data?.job
      if (!job) {
        setDangerSending(false)
        stopDangerPoll()
        return
      }
      setDangerSending(!job.done)
      if (job.done) {
        setDangerStatusText(
          `Concluído: ${job.sent || 0} enviada(s), ${job.failed || 0} falha(s)${
            job.skipped ? `, ${job.skipped} sem telefone` : ''
          }.`,
        )
        stopDangerPoll()
        return
      }
      const current = job.currentName ? ` · ${job.currentName}` : ''
      setDangerStatusText(
        `Enviando ${(job.sent || 0) + (job.failed || 0)}/${job.total || 0}${current} (20s entre cada)`,
      )
    } catch {
      /* ignore poll errors */
    }
  }, [stopDangerPoll])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    setRequestsError('')
    try {
      const data = await apiFetch<{ requests?: RegistrationRequest[] }>('/registration-requests')
      setRequests(data?.requests || [])
    } catch (err) {
      setRequests([])
      setRequestsError(err instanceof Error ? err.message : 'Erro ao carregar solicitações.')
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const me = await apiFetch<AuthUser>('/auth/me')
      if (me?.name) setGreetingName(String(me.name).split(' ')[0] || me.name)

      const [usersResult, schedulesResult, feedResult, consumptionResult, engagementResult] =
        await Promise.allSettled([
          apiFetch<AuthUser[]>('/users'),
          apiFetch<{ schedules?: CheckinSchedule[] }>('/checkin/dispatch/schedules'),
          apiFetch<{ entries?: DiaryFeedEntry[] }>('/food-diary/admin/feed?limit=8'),
          apiFetch<ConsumptionSummary>('/food-diary/admin/consumption'),
          apiFetch<{ zones?: EngagementZones }>('/patients/engagement-zones'),
        ])

      if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
        const patients = usersResult.value.filter((u) => u.role === 'PACIENTE')
        setPatientsTotal(patients.length)
        setRecentPatients(patients.slice(0, 8))
      }

      if (schedulesResult.status === 'fulfilled') {
        setSchedules((schedulesResult.value?.schedules || []).slice(0, 5))
      }

      if (feedResult.status === 'fulfilled') {
        setDiaryFeed(feedResult.value?.entries || [])
      }

      if (consumptionResult.status === 'fulfilled') {
        const data = consumptionResult.value || emptyConsumption
        setConsumption({
          date: data.date || '',
          totals: {
            patients: data.totals?.patients || 0,
            meals: data.totals?.meals || 0,
            caloriesKcal: data.totals?.caloriesKcal || 0,
            proteinG: data.totals?.proteinG || 0,
            carbsG: data.totals?.carbsG || 0,
            fatG: data.totals?.fatG || 0,
          },
          patients: data.patients || [],
        })
      }

      if (engagementResult.status === 'fulfilled') {
        const zones: Partial<EngagementZones> = engagementResult.value?.zones || {}
        setEngagement({
          danger: zones.danger || [],
          attention: zones.attention || [],
          success: zones.success || [],
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadDashboard(), loadRequests()])
    void pollDangerWaStatus().then(() => {
      /* if already sending, start poll — handled below via state check in another effect */
    })
    return () => stopDangerPoll()
  }, [loadDashboard, loadRequests, pollDangerWaStatus, stopDangerPoll])

  useEffect(() => {
    if (!dangerSending) return
    stopDangerPoll()
    dangerPollRef.current = setInterval(() => {
      void pollDangerWaStatus()
    }, 4000)
    return () => stopDangerPoll()
  }, [dangerSending, pollDangerWaStatus, stopDangerPoll])

  async function rejectRequest(req: RegistrationRequest) {
    const ok = window.confirm(
      `Deseja reprovar o acesso de ${req.name}? Ela poderá enviar uma nova solicitação depois.`,
    )
    if (!ok) return
    setRejectingId(req.id)
    try {
      await apiFetch(`/registration-requests/${req.id}/reject`, { method: 'PATCH' })
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao reprovar.')
    } finally {
      setRejectingId('')
    }
  }

  function openCreate() {
    setApproveSeed(null)
    setApprovingRequestId('')
    setQuickAddOpen(true)
  }

  function openApprove(req: RegistrationRequest) {
    setApproveSeed({ name: req.name, email: req.email, phone: req.phone || '' })
    setApprovingRequestId(req.id)
    setQuickAddOpen(true)
  }

  function onCreated(user: AuthUser) {
    const wasApprove = Boolean(approvingRequestId)
    setQuickAddOpen(false)
    setApprovingRequestId('')
    setApproveSeed(null)
    if (user?.id) {
      setRecentPatients((prev) => [user, ...prev.filter((p) => p.id !== user.id)].slice(0, 6))
    }
    void loadRequests()
    if (wasApprove) {
      window.alert(user?.name ? `${user.name} foi aprovada.` : 'Acesso liberado.')
    }
  }

  function openDangerWaModal() {
    if (dangerSending) return
    setDangerModalOpen(true)
  }

  function closeDangerWaModal() {
    if (dangerStarting) return
    setDangerModalOpen(false)
  }

  async function confirmDangerWaSend() {
    if (dangerStarting || dangerSending) return
    setDangerStarting(true)
    try {
      const data = await apiFetch<{
        alreadyRunning?: boolean
        started?: boolean
        estimatedMinutes?: number
        total?: number
        message?: string
      }>('/patients/engagement-zones/danger/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ message: dangerMessage }),
      })
      setDangerModalOpen(false)
      if (data?.alreadyRunning) {
        setDangerSending(true)
        setDangerStatusText('Já existe um envio em andamento…')
      } else if (data?.started) {
        setDangerSending(true)
        const mins = data.estimatedMinutes || Math.ceil(((data.total || 0) * 20) / 60)
        setDangerStatusText(
          `Iniciado: ${data.total} mensagem(ns), ~${mins} min (20s entre cada)`,
        )
      } else {
        setDangerStatusText(data?.message || 'Nada a enviar.')
        setDangerSending(false)
      }
      if (data?.alreadyRunning || data?.started) {
        await pollDangerWaStatus()
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Não foi possível iniciar o envio.'
      setDangerStatusText(message)
      setDangerSending(false)
    } finally {
      setDangerStarting(false)
    }
  }

  function patientUrl(patient?: AuthUser | null) {
    if (!patient?.id) return '/dashboard'
    return buildPatientPath(patient)
  }

  return (
    <div className={styles.home}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.greeting}>{greetingTitle}</h1>
          <p className={styles.heroDate}>{todayLabel}</p>
          <p className={styles.heroLine}>
            {loading ? (
              'Preparando o dia…'
            ) : needCount > 0 ? (
              <>
                <span className={styles.heroEm}>
                  {needCount} {needCount === 1 ? 'pessoa precisa' : 'pessoas precisam'} de você
                </span>
                {requests.length > 0
                  ? ` · ${requests.length} solicitação${requests.length === 1 ? '' : 'ões'} aguardando`
                  : null}
              </>
            ) : (
              <>
                Tudo calmo por aqui
                {requests.length > 0
                  ? ` · ${requests.length} solicitação${requests.length === 1 ? '' : 'ões'} aguardando`
                  : ' · ótimo momento para revisar o diário'}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className={`bento-cta cf-squircle cf-squircle--control ${styles.heroCta}`}
          onClick={openCreate}
        >
          <UserPlus size={16} aria-hidden />
          Adicionar paciente
        </button>
      </header>

      <div className={styles.spotlight}>
        <section
          className={`admin-shell-card bento-card ${styles.spotCard} ${styles.spotCare} ${
            engagement.danger.length ? styles.spotCareUrgent : ''
          }`}
        >
          <div className={styles.cardHead}>
            <div>
              <h2>Precisam de você</h2>
              <p>Perigo e atenção no acompanhamento</p>
            </div>
            <div className={styles.headActions}>
              {needCount > 0 ? (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>{needCount}</span>
              ) : null}
              {engagement.danger.length > 0 ? (
                <button
                  type="button"
                  className={`danger-wa-btn cf-squircle cf-squircle--control ${styles.dangerWaBtn}`}
                  disabled={dangerSending}
                  title={dangerSending ? 'Envio em andamento…' : 'Enviar WhatsApp para a zona de perigo'}
                  onClick={openDangerWaModal}
                >
                  <WhatsAppIcon className={styles.dangerWaIcon} />
                  <span>{dangerSending ? 'Enviando…' : 'WhatsApp'}</span>
                </button>
              ) : null}
            </div>
          </div>
          {loading ? (
            <div className={styles.empty}>
              <Loader2 className={styles.spin} size={20} />
              <span>Carregando…</span>
            </div>
          ) : carePatients.length ? (
            <>
              <ul className={styles.careList}>
                {carePatients.slice(0, 5).map(({ patient, zone }) => (
                  <li key={`${zone}-${patient.id}`}>
                    <Link
                      href={patientUrl(patient)}
                      className={`engagement-patient-btn cf-squircle cf-squircle--control ${styles.careRow}`}
                      title={`Abrir ficha de ${patient.name}`}
                    >
                      <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                      <div className={styles.careCopy}>
                        <strong>{patient.name}</strong>
                        <span
                          className={`${styles.zoneTag} ${
                            zone === 'danger' ? styles.zoneTagDanger : styles.zoneTagAttention
                          }`}
                        >
                          {zone === 'danger' ? 'Zona de perigo' : 'Zona de atenção'}
                        </span>
                      </div>
                      <ChevronRight size={14} className={styles.careArrow} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              {dangerStatusText ? <p className={styles.dangerWaStatus}>{dangerStatusText}</p> : null}
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyArt} ${styles.emptyArtCalm}`} aria-hidden>
                <Sparkles size={28} />
              </div>
              <p>Ninguém na zona de perigo ou atenção agora.</p>
              {engagement.success.length > 0 ? (
                <span>{engagement.success.length} pacientes na zona de sucesso</span>
              ) : null}
            </div>
          )}
        </section>

        <section className={`admin-shell-card bento-card ${styles.spotCard}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Próximos atendimentos</h2>
              <p>Check-ins programados</p>
            </div>
            <Link href="/check-in" className={styles.homeLink}>
              Ver detalhes
            </Link>
          </div>
          {loading ? (
            <div className={styles.empty}>
              <Loader2 className={styles.spin} size={20} />
              <span>Carregando…</span>
            </div>
          ) : schedules.length ? (
            <ul className={styles.scheduleList}>
              {schedules.map((item) => (
                <li key={item.id}>
                  <span className={styles.dot} aria-hidden />
                  <div>
                    <strong>{item.templateTitle || 'Check-in'}</strong>
                    <span>{formatScheduleWhen(item.scheduledAt)}</span>
                  </div>
                  <small>
                    {item.allPatients ? 'Todos' : `${(item.userIds || []).length} pac.`}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyArt} ${styles.emptyArtAgenda}`} aria-hidden>
                <CalendarDays size={28} />
              </div>
              <p>Nenhum agendamento futuro</p>
              <Link href="/check-in">Abrir check-in</Link>
            </div>
          )}
        </section>

        <section className={`admin-shell-card bento-card ${styles.spotCard} ${styles.spotDaily}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Diário</h2>
              <p>Últimos registros das pacientes</p>
            </div>
            <Link href="/usuarios" className={styles.homeLink}>
              Ver detalhes
            </Link>
          </div>
          {loading ? (
            <div className={styles.empty}>
              <Loader2 className={styles.spin} size={20} />
              <span>Carregando…</span>
            </div>
          ) : diaryPreview.length ? (
            <ul className={styles.list}>
              {diaryPreview.map((entry) => {
                const patient = entry.patient || entry.user
                return (
                  <li key={entry.id}>
                    <Link href={patientUrl(patient)} className={`feed-row ${styles.row}`}>
                      <div className={`feed-thumb cf-squircle cf-squircle--control ${styles.feedThumb}`}>
                        {entry.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <UtensilsCrossed className={styles.feedThumbIcon} size={18} />
                        )}
                      </div>
                      <div className={styles.copy}>
                        <strong>{patient?.name || 'Paciente'}</strong>
                        <span>{entry.mealLabel || entry.mealType || 'Refeição'}</span>
                      </div>
                      <div className={styles.feedMeta}>
                        <strong>{Math.round(entry.caloriesKcal || 0)} kcal</strong>
                        <time>{formatRelative(entry.createdAt)}</time>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyArt} ${styles.emptyArtDaily}`} aria-hidden>
                <UtensilsCrossed size={28} />
              </div>
              <p>Não há registros do diário ainda</p>
              <span>Quando as pacientes fotografarem as refeições, elas aparecem aqui.</span>
            </div>
          )}
        </section>
      </div>

      <div className={styles.kpis}>
        <article className={`admin-shell-card bento-card ${styles.kpi}`}>
          <span>Total de pacientes</span>
          <strong>{loading ? '—' : patientsTotal}</strong>
          <p>No portal Florescer</p>
        </article>
        <article className={`admin-shell-card bento-card ${styles.kpi}`}>
          <span>Precisam de atenção</span>
          <strong className={needCount > 0 ? styles.kpiAlert : undefined}>
            {loading ? '—' : needCount}
          </strong>
          <p>
            {engagement.danger.length} perigo · {engagement.attention.length} atenção
          </p>
        </article>
        <article className={`admin-shell-card bento-card ${styles.kpi}`}>
          <span>Zona de sucesso</span>
          <strong className={styles.kpiSuccess}>
            {loading ? '—' : engagement.success.length}
          </strong>
          <p>
            {consumption.totals.meals
              ? `${consumption.totals.meals} refeições hoje`
              : 'Engajamento da semana'}
          </p>
        </article>
      </div>

      {(requestsLoading || requests.length > 0 || requestsError) && (
        <section className={`admin-shell-card bento-card ${styles.inbox}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Chegou agora</h2>
              <p>Solicitações e atalhos</p>
            </div>
            <div className={styles.headActions}>
              {requests.length > 0 ? (
                <span className={`${styles.badge} ${styles.badgeWarm}`}>{requests.length}</span>
              ) : null}
              <Link href="/whatsapp/chat" className={styles.waChip}>
                <WhatsAppIcon className={styles.waChipIcon} />
                Chat ao vivo
              </Link>
            </div>
          </div>
          {requestsLoading ? <p className={styles.muted}>Carregando solicitações…</p> : null}
          {!requestsLoading && requestsError ? <p className={styles.error}>{requestsError}</p> : null}
          {!requestsLoading && !requestsError && requests.length > 0 ? (
            <ul className={styles.requestList}>
              {requests.slice(0, 4).map((req) => (
                <li key={req.id} className={styles.requestCard}>
                  <PatientAvatar name={req.name} size="sm" />
                  <div className={styles.requestBody}>
                    <strong>{req.name}</strong>
                    <p>
                      {req.email}
                      {req.phone ? ` · ${req.phone}` : ''}
                    </p>
                    {req.message ? <p className={styles.requestMessage}>{req.message}</p> : null}
                    <small>{formatDate(req.createdAt)}</small>
                  </div>
                  <div className={styles.requestActions}>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={rejectingId === req.id}
                      onClick={() => rejectRequest(req)}
                    >
                      {rejectingId === req.id ? 'Reprovando…' : 'Reprovar'}
                    </button>
                    <button type="button" className="btn-primary" onClick={() => openApprove(req)}>
                      Aprovar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !requestsLoading && !requestsError ? (
            <p className={styles.muted}>Nenhuma solicitação pendente.</p>
          ) : null}
        </section>
      )}

      <section className={`admin-shell-card bento-card ${styles.panel}`}>
        <div className={styles.panelTabs}>
          <span className={`${styles.panelTab} ${styles.panelTabActive}`}>Recentes</span>
        </div>
        {loading ? (
          <div className={styles.empty}>
            <Loader2 className={styles.spin} size={20} />
            <span>Carregando…</span>
          </div>
        ) : recentPatients.length ? (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Paciente</span>
              <span>Plano</span>
              <span>Cadastro</span>
            </div>
            <ul className={styles.tableBody}>
              {recentPatients.map((patient) => (
                <li key={patient.id}>
                  <Link href={patientUrl(patient)} className={styles.tableRow}>
                    <div className={styles.tablePatient}>
                      <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                      <div className={styles.copy}>
                        <strong>{patient.name}</strong>
                        <span>{patient.email || 'Sem e-mail'}</span>
                      </div>
                    </div>
                    <span className={styles.tablePlan}>{patient.plan || '—'}</span>
                    <time>{formatRelative(patient.createdAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Nenhum paciente cadastrado ainda.</p>
            <button type="button" className="btn-primary" onClick={openCreate}>
              Adicionar paciente
            </button>
          </div>
        )}
      </section>

      {dangerModalOpen ? (
        <div
          className={styles.dangerOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="danger-wa-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDangerWaModal()
          }}
        >
          <div className={`modal-card danger-wa-dialog cf-squircle cf-squircle--control ${styles.dangerDialog}`}>
            <h3 id="danger-wa-title">Confirmar envio no WhatsApp</h3>
            <p className={styles.dangerHint}>
              Confira a mensagem abaixo. Ao clicar em <strong>Enviar</strong>, ela vai para as{' '}
              <strong>{engagement.danger.length}</strong> pacientes da zona de perigo, uma a uma,
              com <strong>20 segundos</strong> de intervalo.
            </p>
            <label className={styles.dangerLabel} htmlFor="danger-wa-message">
              Mensagem que será enviada
            </label>
            <textarea
              id="danger-wa-message"
              rows={9}
              className={`danger-wa-textarea cf-squircle cf-squircle--control ${styles.dangerTextarea}`}
              value={dangerMessage}
              onChange={(e) => setDangerMessage(e.target.value)}
            />
            <p className={styles.dangerVars}>{DANGER_WA_VARS_HINT}</p>
            <div className={styles.dangerActions}>
              <button
                type="button"
                className="btn-secondary"
                disabled={dangerStarting}
                onClick={closeDangerWaModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`btn-primary ${styles.dangerConfirm}`}
                disabled={dangerStarting || !dangerMessage.trim()}
                onClick={confirmDangerWaSend}
              >
                {dangerStarting ? 'Iniciando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <QuickAddPatientModal
        open={quickAddOpen}
        mode={approvingRequestId ? 'approve' : 'create'}
        seed={approveSeed}
        registrationRequestId={approvingRequestId}
        onClose={() => {
          setQuickAddOpen(false)
          setApprovingRequestId('')
          setApproveSeed(null)
        }}
        onCreated={onCreated}
      />
    </div>
  )
}
