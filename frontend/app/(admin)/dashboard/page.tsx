'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, UserPlus, UtensilsCrossed } from 'lucide-react'
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

export default function DashboardPage() {
  const [greetingName, setGreetingName] = useState('Nutricionista')
  const [loading, setLoading] = useState(true)
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

  const buckets = useMemo(
    () => [
      {
        key: 'danger' as const,
        label: 'Zona de perigo',
        hint: 'Fora da atenção e do sucesso',
        count: engagement.danger.length,
        patients: engagement.danger.slice(0, 3),
      },
      {
        key: 'attention' as const,
        label: 'Zona de atenção',
        hint: 'Pelo menos 1 registro em 7 dias ou chat parcial',
        count: engagement.attention.length,
        patients: engagement.attention.slice(0, 3),
      },
      {
        key: 'success' as const,
        label: 'Zona de sucesso',
        hint: 'Pelo menos 4 postagens na semana ou chat completo',
        count: engagement.success.length,
        patients: engagement.success.slice(0, 3),
      },
    ],
    [engagement],
  )

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
        setRecentPatients(usersResult.value.filter((u) => u.role === 'PACIENTE').slice(0, 6))
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
      <p className={styles.greeting}>Olá, {greetingName}</p>

      {(requestsLoading || requests.length > 0 || requestsError) && (
        <section className={`admin-shell-card ${styles.requests}`}>
          <div className={styles.requestsHead}>
            <h2 className={styles.requestsTitle}>Solicitações pendentes</h2>
            {requests.length > 0 ? <span className={styles.count}>{requests.length}</span> : null}
          </div>
          {requestsLoading ? <p className={styles.muted}>Carregando solicitações...</p> : null}
          {!requestsLoading && requestsError ? (
            <p className={styles.error}>{requestsError}</p>
          ) : null}
          {!requestsLoading && !requestsError && requests.length > 0 ? (
            <div className={styles.requestList}>
              {requests.map((req) => (
                <article key={req.id} className={styles.requestCard}>
                  <PatientAvatar name={req.name} size="sm" />
                  <div className={styles.requestBody}>
                    <strong>{req.name}</strong>
                    <p>
                      {req.email}
                      {req.phone ? ` · ${req.phone}` : ''}
                    </p>
                    {req.message ? <p className={styles.requestMessage}>{req.message}</p> : null}
                    <p className={styles.paymentHint}>
                      Forma de pagamento: definida no checkout ou ao aprovar
                    </p>
                    <small>{formatDate(req.createdAt)}</small>
                  </div>
                  <div className={styles.requestActions}>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={rejectingId === req.id}
                      onClick={() => rejectRequest(req)}
                    >
                      {rejectingId === req.id ? 'Reprovando...' : 'Reprovar acesso'}
                    </button>
                    <button type="button" className="btn-primary" onClick={() => openApprove(req)}>
                      Aprovar acesso
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <div className={styles.bento}>
        <section className={`admin-shell-card bento-card ${styles.card} ${styles.cardPatients}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Últimos pacientes</h2>
              <p>Cadastros mais recentes no portal</p>
            </div>
            <button type="button" className={`bento-cta cf-squircle cf-squircle--control ${styles.cta}`} onClick={openCreate}>
              <UserPlus size={15} aria-hidden />
              Adicionar paciente
            </button>
          </div>
          {loading ? (
            <div className={styles.empty}>
              <Loader2 className={styles.spin} size={20} />
              <span>Carregando…</span>
            </div>
          ) : recentPatients.length ? (
            <ul className={styles.list}>
              {recentPatients.map((patient) => (
                <li key={patient.id}>
                  <Link href={patientUrl(patient)} className={`patient-row ${styles.row}`}>
                    <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                    <div className={styles.copy}>
                      <strong>{patient.name}</strong>
                      <span>{patient.email || 'Sem e-mail'}</span>
                    </div>
                    <time>{formatRelative(patient.createdAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nenhum paciente cadastrado ainda.</p>
          )}
        </section>

        <section className={`admin-shell-card bento-card ${styles.card} ${styles.cardSchedules}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Agendamentos</h2>
              <p>Check-ins programados</p>
            </div>
            <Link href="/check-in" className={styles.homeLink}>
              Ver todos
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
            <p className={styles.empty}>Nenhum agendamento pendente.</p>
          )}
        </section>

        <section className={`admin-shell-card bento-card ${styles.card} ${styles.cardEngagement}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Status de engajamento</h2>
              <p>Diário, hidratação, chat e questionários</p>
            </div>
          </div>
          <div className={styles.engagementRow}>
            {buckets.map((bucket) => {
              const pillTone =
                bucket.key === 'danger'
                  ? styles.pillDanger
                  : bucket.key === 'attention'
                    ? styles.pillAttention
                    : styles.pillSuccess
              return (
              <article
                key={bucket.key}
                className={`engagement-pill cf-squircle cf-squircle--control ${styles.pill} ${pillTone}`}
              >
                <div className={styles.pillTop}>
                  <span className={styles.engagementCount}>{bucket.count}</span>
                  {bucket.key === 'danger' && bucket.count > 0 ? (
                    <button
                      type="button"
                      className={`danger-wa-btn cf-squircle cf-squircle--control ${styles.dangerWaBtn}`}
                      disabled={dangerSending}
                      title={
                        dangerSending ? 'Envio em andamento…' : 'Enviar WhatsApp para todas'
                      }
                      onClick={openDangerWaModal}
                    >
                      <WhatsAppIcon className={styles.dangerWaIcon} />
                      <span>{dangerSending ? 'Enviando…' : 'WhatsApp'}</span>
                    </button>
                  ) : null}
                </div>
                <div>
                  <strong>{bucket.label}</strong>
                  <span>{bucket.hint}</span>
                </div>
                {bucket.patients.length ? (
                  <ul className={styles.names}>
                    {bucket.patients.map((patient) => (
                      <li key={patient.id}>
                        <Link
                          href={patientUrl(patient)}
                          className={`engagement-patient-btn cf-squircle cf-squircle--control ${styles.patientBtn}`}
                          title={`Abrir ficha de ${patient.name}`}
                        >
                          <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                          <span>{patient.name}</span>
                          <ChevronRight size={14} className={styles.patientArrow} aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.engagementEmpty}>Sem pacientes nesta faixa</p>
                )}
                {bucket.key === 'danger' && dangerStatusText ? (
                  <p className={styles.dangerWaStatus}>{dangerStatusText}</p>
                ) : null}
              </article>
              )
            })}
          </div>
        </section>

        <section className={`admin-shell-card bento-card ${styles.card} ${styles.cardFeed}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Feed do diário</h2>
              <p>Últimas refeições registradas</p>
            </div>
          </div>
          {loading ? (
            <div className={styles.empty}>
              <Loader2 className={styles.spin} size={20} />
              <span>Carregando…</span>
            </div>
          ) : diaryFeed.length ? (
            <ul className={styles.list}>
              {diaryFeed.map((entry) => {
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
            <p className={styles.empty}>Nenhuma refeição registrada recentemente.</p>
          )}
        </section>

        <section className={`admin-shell-card bento-card ${styles.card} ${styles.cardConsumption}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Consumo alimentar</h2>
              <p>Resumo de hoje · {consumption.date || '—'}</p>
            </div>
          </div>
          <div className={`consumption-stats ${styles.stats}`}>
            <div>
              <span>Pacientes</span>
              <strong>{consumption.totals.patients}</strong>
            </div>
            <div>
              <span>Refeições</span>
              <strong>{consumption.totals.meals}</strong>
            </div>
            <div>
              <span>Kcal total</span>
              <strong>{Math.round(consumption.totals.caloriesKcal)}</strong>
            </div>
          </div>
          {loading ? (
            <div className={styles.empty}>
              <Loader2 className={styles.spin} size={20} />
              <span>Carregando…</span>
            </div>
          ) : consumption.patients.length ? (
            <ul className={styles.list}>
              {consumption.patients.map((item) => (
                <li key={item.patient.id}>
                  <Link href={patientUrl(item.patient)} className={`consumption-row ${styles.row}`}>
                    <PatientAvatar
                      src={item.patient.avatar}
                      name={item.patient.name}
                      size="sm"
                    />
                    <div className={styles.copy}>
                      <strong>{item.patient.name}</strong>
                      <span>{item.meals} refeição(ões)</span>
                    </div>
                    <div className={styles.macros}>
                      <strong>{Math.round(item.caloriesKcal)} kcal</strong>
                      <span>
                        P {Math.round(item.proteinG || 0)} · C {Math.round(item.carbsG || 0)} · G{' '}
                        {Math.round(item.fatG || 0)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nenhum consumo registrado hoje.</p>
          )}
        </section>
      </div>

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
