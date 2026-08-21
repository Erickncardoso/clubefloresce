'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CheckSquare,
  Clock3,
  Heart,
  UserPlus,
  UtensilsCrossed,
} from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import {
  buildPatientPath,
  formatDate,
  formatRelative,
  formatScheduleWhen,
} from '@/lib/patient-slug'
import { fetchDiaryFeed, toggleDiaryLike } from '@/lib/diary-feed'
import type {
  AuthUser,
  CheckinSchedule,
  DangerWaJob,
  DiaryFeedEntry,
  EngagementZones,
  RegistrationRequest,
} from '@/lib/types'
import { fetchTasks } from '@/lib/tasks'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { AnimatedDialog } from '@/components/overlays'
import {
  CareStripSkeleton,
  DiarySkeleton,
  HeroGreetingSkeleton,
  RecentTableSkeleton,
  RequestsSkeleton,
  ScheduleSkeleton,
} from '@/components/dashboard/DashboardSkeletons'
import styles from './dashboard.module.scss'

const DEFAULT_DANGER_WA = `Olá, *{{primeiroNome}}*!

Notei que você está um pouco distante do acompanhamento esta semana.

Que tal registrar sua refeição no *diário alimentar* ou atualizar a *hidratação* no app? Isso me ajuda a cuidar melhor de você.

Se precisar de apoio, é só responder esta mensagem. Estou por aqui.`

const DANGER_WA_VARS_HINT = 'Variáveis: {{primeiroNome}} · {{nome}}'

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
  const pathname = usePathname()
  const [greetingName, setGreetingName] = useState('Nutricionista')
  const [loading, setLoading] = useState(true)
  const [patientsTotal, setPatientsTotal] = useState(0)
  const [recentPatients, setRecentPatients] = useState<AuthUser[]>([])
  const [schedules, setSchedules] = useState<CheckinSchedule[]>([])
  const [diaryFeed, setDiaryFeed] = useState<DiaryFeedEntry[]>([])
  const [diaryLikingId, setDiaryLikingId] = useState<string | null>(null)
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
  const [diaryTooltip, setDiaryTooltip] = useState<{
    name: string
    meal: string
    x: number
    y: number
    side: 'left' | 'right'
  } | null>(null)
  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [dangerMessage, setDangerMessage] = useState(DEFAULT_DANGER_WA)
  const [dangerStarting, setDangerStarting] = useState(false)
  const [dangerSending, setDangerSending] = useState(false)
  const [dangerStatusText, setDangerStatusText] = useState('')
  const [listTab, setListTab] = useState<'recent' | 'requests'>('recent')
  const [openTasks, setOpenTasks] = useState(0)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [careExpanded, setCareExpanded] = useState(false)
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
    return [...danger, ...attention]
  }, [engagement])

  const needCount = engagement.danger.length + engagement.attention.length
  const todayLabel = formatLongDate()
  const diaryPreview = diaryFeed.filter((e) => Boolean(e.imageUrl)).slice(0, 3)
  const FOCUS_PREVIEW = 6
  const visibleCare = careExpanded ? carePatients : carePatients.slice(0, FOCUS_PREVIEW)
  const hiddenCareCount = Math.max(0, carePatients.length - FOCUS_PREVIEW)

  async function onToggleDiaryLike(entryId: string) {
    if (diaryLikingId) return
    const prev = diaryFeed.find((e) => e.id === entryId)
    if (!prev) return
    setDiaryLikingId(entryId)
    setDiaryFeed((list) =>
      list.map((e) =>
        e.id === entryId
          ? {
              ...e,
              likedByMe: !e.likedByMe,
              likesCount: Math.max(0, (e.likesCount || 0) + (e.likedByMe ? -1 : 1)),
            }
          : e,
      ),
    )
    try {
      const res = await toggleDiaryLike(entryId)
      setDiaryFeed((list) =>
        list.map((e) =>
          e.id === entryId
            ? { ...e, likedByMe: res.likedByMe, likesCount: res.likesCount }
            : e,
        ),
      )
    } catch {
      setDiaryFeed((list) => list.map((e) => (e.id === entryId ? prev : e)))
    } finally {
      setDiaryLikingId(null)
    }
  }

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

  const loadTaskCount = useCallback(async () => {
    try {
      const tasks = await fetchTasks()
      setOpenTasks(tasks.filter((t) => !t.done).length)
    } catch {
      setOpenTasks(0)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const me = await apiFetch<AuthUser>('/auth/me')
      if (me?.name) setGreetingName(String(me.name).split(' ')[0] || me.name)

      const [usersResult, schedulesResult, feedResult, engagementResult] = await Promise.allSettled([
        apiFetch<AuthUser[]>('/users'),
        apiFetch<{ schedules?: CheckinSchedule[] }>('/checkin/dispatch/schedules'),
        fetchDiaryFeed(6, 0),
        apiFetch<{ zones?: EngagementZones }>('/patients/engagement-zones'),
      ])

      if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
        const patients = usersResult.value.filter((u) => u.role === 'PACIENTE')
        setPatientsTotal(patients.length)
        setRecentPatients(patients.slice(0, 8))
      }

      if (schedulesResult.status === 'fulfilled') {
        setSchedules((schedulesResult.value?.schedules || []).slice(0, 4))
      }

      if (feedResult.status === 'fulfilled') {
        setDiaryFeed(feedResult.value.entries || [])
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
    if (requests.length > 0) setListTab('requests')
  }, [requests.length])

  useEffect(() => {
    void Promise.all([loadDashboard(), loadRequests(), loadTaskCount()])
    void pollDangerWaStatus()
    return () => stopDangerPoll()
  }, [loadDashboard, loadRequests, loadTaskCount, pollDangerWaStatus, stopDangerPoll])

  useEffect(() => {
    if (pathname !== '/dashboard') return
    let alive = true
    void fetchDiaryFeed(6, 0)
      .then((data) => {
        if (alive) setDiaryFeed(data.entries || [])
      })
      .catch(() => {
        /* keep */
      })
    return () => {
      alive = false
    }
  }, [pathname])

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
      setRecentPatients((prev) => [user, ...prev.filter((p) => p.id !== user.id)].slice(0, 8))
      setPatientsTotal((n) => n + 1)
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
          <h1 className={styles.greeting}>Visão geral</h1>
          {loading ? (
            <HeroGreetingSkeleton />
          ) : (
            <p className={styles.heroDate}>
              Olá, {greetingName} <span aria-hidden>·</span> {todayLabel}
            </p>
          )}
          {!loading ? (
            <div className={styles.heroMeta}>
              <span>{patientsTotal} pacientes</span>
              <button type="button" className={styles.heroMetaBtn} onClick={() => setTasksOpen(true)}>
                <CheckSquare size={14} aria-hidden />
                {openTasks} {openTasks === 1 ? 'tarefa' : 'tarefas'}
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className={styles.heroCta} onClick={openCreate}>
          <UserPlus size={16} strokeWidth={2.25} aria-hidden />
          Adicionar Paciente
        </button>
      </header>

      <section className={`${styles.card} ${styles.focusCard}`} aria-labelledby="focus-title">
        <div className={styles.focusHead}>
          <div className={styles.focusSummary}>
            {!loading && needCount > 0 ? (
              <p className={styles.focusCount} aria-hidden>
                {needCount}
              </p>
            ) : null}
            <div className={styles.focusCopy}>
              <p className={styles.focusEyebrow}>Prioridade de hoje</p>
              <h2 id="focus-title" className={styles.focusTitle}>
                Quem precisa de você
              </h2>
              <p className={styles.focusSub}>
                {loading
                  ? 'Carregando…'
                  : needCount > 0
                    ? (
                      <>
                        <span className={styles.focusStatDanger}>{engagement.danger.length} perigo</span>
                        <span aria-hidden className={styles.focusStatSep}>·</span>
                        <span className={styles.focusStatAttention}>{engagement.attention.length} atenção</span>
                      </>
                    )
                    : 'Nenhuma paciente em risco agora — ótimo sinal.'}
              </p>
            </div>
          </div>
          {!loading && engagement.danger.length > 0 ? (
            <button
              type="button"
              className={styles.focusWa}
              disabled={dangerSending}
              onClick={openDangerWaModal}
            >
              <WhatsAppIcon className={styles.focusWaIcon} />
              {dangerSending ? 'Enviando…' : 'WhatsApp em massa'}
            </button>
          ) : null}
        </div>
        {dangerStatusText ? <p className={styles.dangerStatus}>{dangerStatusText}</p> : null}

        {loading ? (
          <CareStripSkeleton />
        ) : needCount > 0 ? (
          <>
            <ul className={styles.focusList}>
              {visibleCare.map(({ patient, zone }) => (
                <li key={`${zone}-${patient.id}`}>
                  <Link
                    href={patientUrl(patient)}
                    className={`${styles.focusItem} ${zone === 'danger' ? styles.focusItemDanger : styles.focusItemAttention}`}
                  >
                    <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                    <strong className={styles.focusItemName}>{patient.name}</strong>
                    <span className={zone === 'danger' ? styles.tagDanger : styles.tagAttention}>
                      {zone === 'danger' ? 'Perigo' : 'Atenção'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {hiddenCareCount > 0 ? (
              <button
                type="button"
                className={styles.focusMore}
                onClick={() => setCareExpanded((v) => !v)}
              >
                {careExpanded ? 'Mostrar menos' : `Ver mais ${hiddenCareCount}`}
              </button>
            ) : null}
          </>
        ) : (
          <div className={styles.focusEmpty}>
            <p>Pode seguir para agenda, diário ou pacientes recentes abaixo.</p>
          </div>
        )}
      </section>

      <div className={styles.contextRow}>
        <section className={`${styles.card} ${styles.midCard}`}>
          <div className={styles.cardTop}>
            <h2>Próximos atendimentos</h2>
            <Link href="/check-in" className={styles.quietLink}>
              Ver agenda
            </Link>
          </div>
          {loading ? (
            <ScheduleSkeleton />
          ) : schedules.length ? (
            <ul className={styles.scheduleList}>
              {schedules.map((item) => (
                <li key={item.id}>
                  <span className={styles.dot} aria-hidden />
                  <div>
                    <strong>{item.templateTitle || 'Check-in'}</strong>
                    <span>{formatScheduleWhen(item.scheduledAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyPad}>
              <div className={`${styles.illus} ${styles.illusAgenda}`}>
                <CalendarDays size={28} strokeWidth={1.5} />
              </div>
              <p>Nenhum agendamento futuro</p>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.midCard} ${styles.diaryCard}`}>
          <div className={styles.cardTop}>
            <h2>
              <Link href="/diario" className={styles.cardTitleLink}>
                Diário de hoje
              </Link>
            </h2>
            <Link href="/diario" className={styles.quietLink}>
              Ver diário
            </Link>
          </div>
          {loading ? (
            <DiarySkeleton />
          ) : diaryPreview.length ? (
            <div className={styles.diaryThumbs}>
              {diaryPreview.map((entry) => {
                const patient = entry.patient || entry.user
                const meal = entry.mealLabel || entry.mealType || 'Refeição'
                const liked = Boolean(entry.likedByMe)
                return (
                  <article
                    key={entry.id}
                    className={styles.diaryThumb}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const TOOLTIP_W = 160
                      const fitsRight = rect.right + 8 + TOOLTIP_W < window.innerWidth
                      setDiaryTooltip({
                        name: patient?.name || 'Paciente',
                        meal,
                        x: fitsRight ? rect.right + 8 : rect.left - 8,
                        y: rect.top + rect.height / 2,
                        side: fitsRight ? 'right' : 'left',
                      })
                    }}
                    onMouseLeave={() => setDiaryTooltip(null)}
                  >
                    <Link
                      href={`/diario?post=${encodeURIComponent(entry.id)}`}
                      className={styles.diaryThumbHit}
                      aria-label={`Abrir no diário: ${patient?.name || 'paciente'}, ${meal}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.imageUrl || ''} alt="" loading="lazy" />
                    </Link>
                    <button
                      type="button"
                      className={`${styles.diaryLike} ${liked ? styles.diaryLiked : ''}`}
                      aria-label={liked ? 'Remover curtida' : 'Curtir'}
                      aria-pressed={liked}
                      disabled={diaryLikingId === entry.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void onToggleDiaryLike(entry.id)
                      }}
                    >
                      <Heart size={16} fill={liked ? 'currentColor' : 'none'} aria-hidden />
                    </button>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyPad}>
              <div className={`${styles.illus} ${styles.illusDaily}`}>
                <UtensilsCrossed size={28} strokeWidth={1.5} />
              </div>
              <p>Sem fotos no diário ainda</p>
            </div>
          )}
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${listTab === 'recent' ? styles.tabActive : ''}`}
            onClick={() => setListTab('recent')}
          >
            <Clock3 size={15} aria-hidden />
            Recentes
          </button>
          <button
            type="button"
            className={`${styles.tab} ${listTab === 'requests' ? styles.tabActive : ''}`}
            onClick={() => setListTab('requests')}
          >
            Solicitações
            {requests.length > 0 ? <em>{requests.length}</em> : null}
          </button>
        </div>

        {listTab === 'recent' ? (
          loading ? (
            <RecentTableSkeleton />
          ) : recentPatients.length ? (
            <div className={styles.table}>
              <div className={styles.thead}>
                <span>Paciente</span>
                <span>Plano</span>
                <span>Última atualização</span>
              </div>
              <ul>
                {recentPatients.map((patient) => (
                  <li key={patient.id}>
                    <Link href={patientUrl(patient)} className={styles.trow}>
                      <div className={styles.tpatient}>
                        <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                        <div>
                          <strong>{patient.name}</strong>
                          <span>{patient.email || 'Sem e-mail'}</span>
                        </div>
                      </div>
                      <span className={styles.tplan}>{patient.plan || '—'}</span>
                      <time>{formatRelative(patient.createdAt)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.emptyPad}>
              <p>Nenhum paciente cadastrado ainda.</p>
            </div>
          )
        ) : (
          <div className={styles.requestsBlock}>
            {requestsLoading ? <RequestsSkeleton /> : null}
            {!requestsLoading && requestsError ? (
              <p className={styles.error}>{requestsError}</p>
            ) : null}
            {!requestsLoading && !requestsError && requests.length === 0 ? (
              <div className={styles.emptyPad}>
                <p>Nenhuma solicitação pendente.</p>
              </div>
            ) : null}
            {!requestsLoading && !requestsError && requests.length > 0 ? (
              <ul className={styles.requestList}>
                {requests.map((req) => (
                  <li key={req.id} className={styles.requestCard}>
                    <PatientAvatar name={req.name} size="sm" />
                    <div className={styles.requestBody}>
                      <strong>{req.name}</strong>
                      <p>
                        {req.email}
                        {req.phone ? ` · ${req.phone}` : ''}
                      </p>
                      {req.message ? <p className={styles.requestMsg}>{req.message}</p> : null}
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
            ) : null}
            <div className={styles.panelFooter}>
              <Link href="/whatsapp/chat" className={styles.waLink}>
                <WhatsAppIcon className={styles.waLinkIcon} />
                Abrir chat ao vivo
              </Link>
            </div>
          </div>
        )}
      </section>

      <AnimatedDialog
        open={tasksOpen}
        onOpenChange={(next) => {
          setTasksOpen(next)
          if (!next) void loadTaskCount()
        }}
        title="Tarefas"
        contentClassName={`modal-card cf-squircle cf-squircle--control ${styles.tasksDialog}`}
      >
        <h3 id="tasks-dialog-title">Tarefas</h3>
        <div className={styles.tasksDialogBody}>
          <TaskBoard />
        </div>
      </AnimatedDialog>

      <AnimatedDialog
        open={dangerModalOpen}
        onOpenChange={(next) => {
          if (!next) closeDangerWaModal()
        }}
        title="Confirmar envio no WhatsApp"
        contentClassName={`modal-card danger-wa-dialog cf-squircle cf-squircle--control ${styles.dangerDialog}`}
      >
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
      </AnimatedDialog>

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

      {diaryTooltip && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: diaryTooltip.x,
                top: diaryTooltip.y,
                transform:
                  diaryTooltip.side === 'left'
                    ? 'translateY(-50%) translateX(-100%)'
                    : 'translateY(-50%)',
                zIndex: 9999,
                pointerEvents: 'none',
                background: 'rgba(10,12,11,0.88)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#fff',
                borderRadius: 'var(--cf-radius-control)',
                padding: '0.35rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.05rem',
                maxWidth: '10rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <strong
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {diaryTooltip.name}
              </strong>
              <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}>
                {diaryTooltip.meal}
              </span>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
