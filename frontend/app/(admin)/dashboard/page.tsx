'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock3,
  Heart,
  Palette,
  UserPlus,
  UsersRound,
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
  ConsumptionSummary,
  DangerWaJob,
  DiaryFeedEntry,
  EngagementZones,
  RegistrationRequest,
} from '@/lib/types'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { AnimatedDialog } from '@/components/overlays'
import {
  CareStripSkeleton,
  DiarySkeleton,
  HeroGreetingSkeleton,
  KpiRowSkeleton,
  RecentTableSkeleton,
  RequestsSkeleton,
  ScheduleSkeleton,
} from '@/components/dashboard/DashboardSkeletons'
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

  const [diaryTooltip, setDiaryTooltip] = useState<{ name: string; meal: string; x: number; y: number; side: 'left' | 'right' } | null>(null)

  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [dangerMessage, setDangerMessage] = useState(DEFAULT_DANGER_WA)
  const [dangerStarting, setDangerStarting] = useState(false)
  const [dangerSending, setDangerSending] = useState(false)
  const [dangerStatusText, setDangerStatusText] = useState('')
  const [listTab, setListTab] = useState<'recent' | 'requests'>('recent')
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
  const todayLabel = formatLongDate()
  const diaryPreview = diaryFeed.filter((e) => Boolean(e.imageUrl)).slice(0, 8)

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

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const me = await apiFetch<AuthUser>('/auth/me')
      if (me?.name) setGreetingName(String(me.name).split(' ')[0] || me.name)

      const [usersResult, schedulesResult, feedResult, consumptionResult, engagementResult] =
        await Promise.allSettled([
          apiFetch<AuthUser[]>('/users'),
          apiFetch<{ schedules?: CheckinSchedule[] }>('/checkin/dispatch/schedules'),
          fetchDiaryFeed(8, 0),
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
        setDiaryFeed(feedResult.value.entries || [])
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
    if (requests.length > 0) setListTab('requests')
  }, [requests.length])

  useEffect(() => {
    void Promise.all([loadDashboard(), loadRequests()])
    void pollDangerWaStatus().then(() => {
      /* if already sending, start poll — handled below via state check in another effect */
    })
    return () => stopDangerPoll()
  }, [loadDashboard, loadRequests, pollDangerWaStatus, stopDangerPoll])

  // Reconsulta curtidas do diário ao voltar pro dashboard
  useEffect(() => {
    if (pathname !== '/dashboard') return
    let alive = true
    void fetchDiaryFeed(8, 0)
      .then((data) => {
        if (alive) setDiaryFeed(data.entries || [])
      })
      .catch(() => {
        /* keep current preview */
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
          <h1 className={styles.greeting}>Visão geral</h1>
          {loading ? (
            <HeroGreetingSkeleton />
          ) : (
            <p className={styles.heroDate}>
              Olá, {greetingName} <span aria-hidden>·</span> {todayLabel}
            </p>
          )}
        </div>
        <button type="button" className={styles.heroCta} onClick={openCreate}>
          <UserPlus size={16} strokeWidth={2.25} aria-hidden />
          Adicionar Paciente
        </button>
      </header>

      <div className={styles.topGrid}>
        <Link href="/personalizar" className={`${styles.card} ${styles.promoCard}`}>
          <div className={styles.promoCopy}>
            <p className={styles.promoEyebrow}>Marca Florescer</p>
            <h2>Personalize PDFs e materiais</h2>
            <p>Deixe planos e documentos com a cara do seu consultório.</p>
            <span className={styles.promoCta}>
              Criar modelo
              <ArrowRight size={15} aria-hidden />
            </span>
          </div>
          <div className={styles.promoArt} aria-hidden>
            <div className={styles.promoSheet}>
              <Palette size={22} />
            </div>
            <div className={styles.promoSheetAlt} />
          </div>
        </Link>

        <section className={`${styles.card} ${styles.midCard}`}>
          <div className={styles.cardTop}>
            <h2>Próximos atendimentos</h2>
            <Link href="/check-in" className={styles.quietLink}>
              Ver detalhes
            </Link>
          </div>
          {loading ? (
            <ScheduleSkeleton />
          ) : schedules.length ? (
            <ul className={styles.scheduleList}>
              {schedules.slice(0, 4).map((item) => (
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
                <CalendarDays size={32} strokeWidth={1.5} />
              </div>
              <p>Nenhum agendamento futuro</p>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.midCard} ${styles.diaryCard}`}>
          <div className={styles.cardTop}>
            <h2>
              <Link href="/diario" className={styles.cardTitleLink}>
                Diário
              </Link>
            </h2>
            {loading ? (
              <span className={styles.bone} style={{ width: '3.6rem', height: '0.78rem' }} aria-hidden />
            ) : diaryPreview.length ? (
              <Link href="/diario" className={styles.diaryMoreTop}>
                Ver mais
              </Link>
            ) : null}
          </div>
          {loading ? (
            <DiarySkeleton />
          ) : diaryPreview.length ? (
            <div className={styles.diaryScroll}>
              <div className={styles.diaryMasonry}>
                {diaryPreview.map((entry, index) => {
                  const patient = entry.patient || entry.user
                  const meal = entry.mealLabel || entry.mealType || 'Refeição'
                  const liked = Boolean(entry.likedByMe)
                  const sizeClass = [
                    styles.diaryTile1,
                    styles.diaryTile2,
                    styles.diaryTile3,
                    styles.diaryTile4,
                  ][index % 4]
                  return (
                    <article
                      key={entry.id}
                      className={`${styles.diaryTile} ${sizeClass}`}
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
                        className={styles.diaryTileHit}
                        aria-label={`Abrir no diário: ${patient?.name || 'paciente'}, ${meal}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={entry.imageUrl || ''} alt="" loading="lazy" />
                        <span className={styles.diaryTileFade} aria-hidden />
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
                        <Heart
                          size={18}
                          fill={liked ? 'currentColor' : 'none'}
                          aria-hidden
                        />
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className={styles.emptyPad}>
              <div className={`${styles.illus} ${styles.illusDaily}`}>
                <UtensilsCrossed size={32} strokeWidth={1.5} />
              </div>
              <p>Não há registros do diário</p>
            </div>
          )}
        </section>
      </div>

      {loading ? (
        <KpiRowSkeleton />
      ) : (
        <div className={styles.kpiRow}>
          <article className={styles.kpi}>
            <div className={styles.kpiHead}>
              <span>Total de pacientes</span>
              <span className={styles.kpiIcon} aria-hidden>
                <UsersRound size={17} strokeWidth={1.8} />
              </span>
            </div>
            <strong>{patientsTotal}</strong>
            <p>Ativas no portal</p>
          </article>
          <article className={styles.kpi}>
            <div className={styles.kpiHead}>
              <span>Precisam de você</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconWarn}`} aria-hidden>
                <CircleAlert size={17} strokeWidth={1.8} />
              </span>
            </div>
            <strong className={needCount ? styles.kpiWarn : undefined}>{needCount}</strong>
            <div className={styles.kpiActions}>
              <p>
                {engagement.danger.length} perigo · {engagement.attention.length} atenção
              </p>
              {engagement.danger.length > 0 ? (
                <button
                  type="button"
                  className={styles.miniWa}
                  disabled={dangerSending}
                  onClick={openDangerWaModal}
                >
                  <WhatsAppIcon className={styles.miniWaIcon} />
                  {dangerSending ? 'Enviando…' : 'WhatsApp'}
                </button>
              ) : null}
            </div>
            {dangerStatusText ? <small className={styles.dangerStatus}>{dangerStatusText}</small> : null}
          </article>
          <article className={styles.kpi}>
            <div className={styles.kpiHead}>
              <span>Engajamento em dia</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconOk}`} aria-hidden>
                <CircleCheck size={17} strokeWidth={1.8} />
              </span>
            </div>
            <strong className={styles.kpiOk}>{engagement.success.length}</strong>
            <p>
              {consumption.totals.meals
                ? `${consumption.totals.meals} refeições hoje`
                : 'Zona de sucesso'}
            </p>
          </article>
        </div>
      )}

      <div className={styles.sideRow}>
        <div className={styles.sideMain}>
          {loading ? (
            <CareStripSkeleton />
          ) : needCount > 0 && carePatients.length > 0 ? (
            <section className={styles.careStrip}>
              <div className={styles.careStripHead}>
                <h2>Quem precisa de atenção</h2>
                <span>{needCount}</span>
              </div>
              <div className={styles.careStripRail}>
                {carePatients.slice(0, 10).map(({ patient, zone }) => (
                  <Link
                    key={`${zone}-${patient.id}`}
                    href={patientUrl(patient)}
                    className={styles.careChip}
                  >
                    <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                    <div>
                      <strong>{patient.name}</strong>
                      <span className={zone === 'danger' ? styles.tagDanger : styles.tagAttention}>
                        {zone === 'danger' ? 'Perigo' : 'Atenção'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
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
        </div>
        <div className={styles.sideTasks}>
          <TaskBoard />
        </div>
      </div>

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
                transform: diaryTooltip.side === 'left' ? 'translateY(-50%) translateX(-100%)' : 'translateY(-50%)',
                zIndex: 9999,
                pointerEvents: 'none',
                background: 'rgba(10,12,11,0.88)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#fff',
                borderRadius: '0.4rem',
                padding: '0.35rem 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.05rem',
                maxWidth: '10rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <strong style={{ fontSize: '0.72rem', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
