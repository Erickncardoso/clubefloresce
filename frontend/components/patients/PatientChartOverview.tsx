'use client'

import {
  BookOpen,
  CalendarCheck,
  Flame,
  HeartPulse,
  MapPin,
  Salad,
  Scale,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react'
import type { ElementType } from 'react'
import { paymentAccessLabel, paymentMethodLabel } from '@/lib/patient-chart/patient-billing'
import { formatCepMask, formatCpfMask, formatDateTime, formatWeek } from '@/lib/patient-chart/patient-format'
import type { PatientOverview, PatientProfile } from '@/lib/patient-chart/types'
import { PatientNutritionSection } from './PatientNutritionSection'
import styles from './PatientChartOverview.module.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricAction = { type: 'tab' | 'evolucao' | 'edit'; id: string } | null

type MetricItem = {
  id: string
  label: string
  value: string
  hint?: string
  hintWarn?: boolean
  cta?: string
  icon: ElementType
  tone?: 'success' | 'warn' | 'danger' | 'neutral'
  action: MetricAction
}

type Props = {
  patientId: string
  profile: PatientProfile
  overview?: PatientOverview | null
  onEditProfile?: () => void
  onNavigateEvolucao?: (sub: string) => void
  onNavigateTab?: (tab: string) => void
}

// ─── Metric builders ──────────────────────────────────────────────────────────

function mealPlanMetric(o: PatientOverview): MetricItem {
  if (!o.mealPlan) {
    return {
      id: 'mealPlan',
      label: 'Plano alimentar',
      value: 'Pendente',
      hint: 'Nenhum plano enviado',
      hintWarn: true,
      cta: 'Criar plano',
      icon: Salad,
      tone: 'warn',
      action: { type: 'tab', id: 'planos' },
    }
  }

  const count = Number(o.mealPlan.mealCount || 0)
  if (count <= 0 || o.mealPlan.status === 'incomplete' || o.mealPlan.hasMeals === false) {
    return {
      id: 'mealPlan',
      label: 'Plano alimentar',
      value: 'Incompleto',
      hint: 'PDF sem refeições lidas',
      hintWarn: true,
      cta: 'Abrir planos',
      icon: Salad,
      tone: 'warn',
      action: { type: 'tab', id: 'planos' },
    }
  }

  return {
    id: 'mealPlan',
    label: 'Plano alimentar',
    value: 'Ativo',
    hint: `${count} ${count === 1 ? 'refeição' : 'refeições'}`,
    cta: 'Ver plano',
    icon: Salad,
    tone: 'success',
    action: { type: 'tab', id: 'planos' },
  }
}

function weightMetric(o: PatientOverview, profile: PatientProfile): MetricItem {
  const latest = o.checkIn?.latest
  const fromCheckIn = latest?.weightKg
  const fromProfile = profile.weightKg
  const hasCheckInWeight = fromCheckIn != null && Number(fromCheckIn) > 0
  const hasProfileWeight = fromProfile != null && Number(fromProfile) > 0

  if (hasCheckInWeight) {
    return {
      id: 'weight',
      label: 'Último peso',
      value: `${Number(fromCheckIn)} kg`,
      hint: `Check-in · ${formatWeek(latest?.weekStart || latest?.updatedAt || latest?.createdAt)}`,
      cta: 'Ver antropometria',
      icon: Scale,
      tone: 'neutral',
      action: { type: 'tab', id: 'antropometria' },
    }
  }

  if (hasProfileWeight) {
    return {
      id: 'weight',
      label: 'Último peso',
      value: `${Number(fromProfile)} kg`,
      hint: 'Cadastro do paciente',
      cta: 'Atualizar',
      icon: Scale,
      tone: 'neutral',
      action: { type: 'tab', id: 'antropometria' },
    }
  }

  return {
    id: 'weight',
    label: 'Último peso',
    value: '—',
    hint: 'Sem registro ainda',
    hintWarn: true,
    cta: 'Registrar',
    icon: Scale,
    tone: 'warn',
    action: { type: 'tab', id: 'antropometria' },
  }
}

function nutritionMetric(o: PatientOverview): MetricItem {
  const today = o.foodDiary?.today
  const consumed = Math.round(Number(today?.consumed?.caloriesKcal || 0))
  const target = Math.round(
    Number(today?.targets?.caloriesKcal || o.nutritionTarget?.caloriesKcal || 0),
  )

  if (!today && consumed <= 0) {
    return {
      id: 'nutrition',
      label: 'Nutrição hoje',
      value: '0 kcal',
      hint: target > 0 ? `Meta ${target} kcal · nada registrado` : 'Nada registrado hoje',
      hintWarn: true,
      cta: 'Abrir diário',
      icon: Flame,
      tone: 'warn',
      action: { type: 'evolucao', id: 'diario' },
    }
  }

  return {
    id: 'nutrition',
    label: 'Nutrição hoje',
    value: `${consumed} kcal`,
    hint: target > 0 ? `Meta ${target} kcal` : 'Sem meta cadastrada',
    cta: 'Abrir diário',
    icon: Flame,
    tone: consumed > 0 ? 'neutral' : 'warn',
    hintWarn: consumed <= 0,
    action: { type: 'evolucao', id: 'diario' },
  }
}

function paymentHint(patient: PatientOverview['patient']): string {
  if (!patient) return 'Ver pagamentos'
  const method = paymentMethodLabel(patient)
  const expires = patient.accessExpiresAt
  const parts: string[] = []
  if (method && method !== '—') parts.push(method)
  if (expires) {
    const date = new Date(expires)
    if (Number.isFinite(date.getTime())) {
      parts.push(`até ${date.toLocaleDateString('pt-BR')}`)
    }
  }
  return parts.length ? parts.join(' · ') : 'Ver pagamentos'
}

function buildMetricItems(o: PatientOverview, profile: PatientProfile): MetricItem[] {
  const payment = paymentAccessLabel(o.patient || {})
  const paymentTone: MetricItem['tone'] =
    payment === 'Pago' || payment === 'Liberado'
      ? 'success'
      : payment === 'Expirado' || payment === 'Não pago'
        ? 'danger'
        : 'neutral'

  const totalLessons = Number(o.courseProgress?.totalLessons || 0)
  const watched = Number(o.courseProgress?.watchedLessons || 0)

  return [
    {
      id: 'payment',
      label: 'Pagamento',
      value: payment,
      hint: paymentHint(o.patient),
      cta: 'Ver detalhes',
      icon: Wallet,
      tone: paymentTone,
      action: { type: 'tab', id: 'pagamentos' },
    },
    {
      id: 'checkins',
      label: 'Check-ins',
      value: String(o.checkIn?.total || 0),
      hint: o.checkIn?.missingThisWeek ? 'Sem check-in esta semana' : 'Semana em dia',
      hintWarn: Boolean(o.checkIn?.missingThisWeek),
      cta: 'Abrir Evolução',
      icon: CalendarCheck,
      tone: o.checkIn?.missingThisWeek ? 'warn' : 'success',
      action: { type: 'evolucao', id: 'checkins' },
    },
    mealPlanMetric(o),
    {
      id: 'courses',
      label: 'Cursos',
      value: totalLessons ? `${o.courseProgress?.percent || 0}%` : '—',
      hint: totalLessons ? `${watched}/${totalLessons} aulas assistidas` : 'Sem aulas no catálogo',
      icon: BookOpen,
      tone: 'neutral',
      action: null,
    },
    weightMetric(o, profile),
    nutritionMetric(o),
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientChartOverview({
  patientId,
  profile,
  overview,
  onEditProfile,
  onNavigateEvolucao,
  onNavigateTab,
}: Props) {
  const metricItems = overview ? buildMetricItems(overview, profile) : []

  function onMetricClick(metric: MetricItem) {
    const action = metric?.action
    if (!action) return
    if (action.type === 'tab') onNavigateTab?.(action.id)
    else if (action.type === 'evolucao') onNavigateEvolucao?.(action.id)
    else if (action.type === 'edit') onEditProfile?.()
  }

  // ── Profile computed values ──────────────────────────────────────────────────

  const maritalLabel = (() => {
    const map: Record<string, string> = {
      single: 'Solteira(o)',
      married: 'Casada(o)',
      stable_union: 'União estável',
      union: 'União estável',
      divorced: 'Divorciada(o)',
      widowed: 'Viúva(o)',
      other: 'Outro',
    }
    return map[profile?.maritalStatus ?? ''] || '—'
  })()

  const modalityLabel =
    profile?.modality === 'online'
      ? 'Online'
      : profile?.modality === 'presencial'
        ? 'Presencial'
        : '—'

  const cpfLabel = profile?.cpf ? formatCpfMask(profile.cpf) : '—'

  const objectiveLabel = (() => {
    if (profile?.objective) return profile.objective
    const map: Record<string, string> = {
      lose_weight: 'Emagrecer',
      maintain: 'Manter peso',
      gain_weight: 'Ganhar peso',
      muscle: 'Ganho muscular',
      health: 'Saúde',
    }
    return map[profile?.primaryGoal ?? ''] || 'Não informado'
  })()

  const addressLine = [profile?.street, profile?.streetNumber, profile?.neighborhood]
    .filter(Boolean)
    .join(', ')

  const cityLine = (() => {
    const zip = profile?.zipCode ? formatCepMask(profile.zipCode) : ''
    return [profile?.city, profile?.state, zip].filter(Boolean).join(' · ')
  })()

  const heightLabel = (() => {
    const n = Number(profile?.heightCm)
    return Number.isFinite(n) && n > 0 ? `${n} cm` : '—'
  })()

  const weightLabel = (() => {
    const fromCheckIn = overview?.checkIn?.latest?.weightKg
    const fromProfile = profile?.weightKg
    const raw = fromCheckIn ?? fromProfile
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? `${n} kg` : '—'
  })()

  const imcLabel = (() => {
    const weight = Number(
      overview?.checkIn?.latest?.weightKg ?? profile?.weightKg,
    )
    const heightCm = Number(profile?.heightCm)
    if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || heightCm <= 0 || weight <= 0)
      return '—'
    return (weight / (heightCm / 100) ** 2).toFixed(1)
  })()

  // ── Metric tone helpers ───────────────────────────────────────────────────────

  const metricToneIconClass: Record<string, string> = {
    success: styles.pcoMetricIconSuccess,
    warn: styles.pcoMetricIconWarn,
    danger: styles.pcoMetricIconDanger,
    neutral: '',
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.pco}>
      {overview && metricItems.length > 0 && (
        <section className={styles.pcoMetrics} aria-label="Indicadores do paciente">
          {metricItems.map((metric) => {
            const Icon = metric.icon
            return (
              <button
                key={metric.id}
                type="button"
                className={[
                  styles.pcoMetric,
                  metric.action ? styles.pcoMetricAction : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!metric.action}
                onClick={() => onMetricClick(metric)}
              >
                <span
                  className={[
                    styles.pcoMetricIcon,
                    metric.tone ? (metricToneIconClass[metric.tone] ?? '') : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  <Icon size={15} />
                </span>
                <div className={styles.pcoMetricCopy}>
                  <span className={styles.pcoMetricLabel}>{metric.label}</span>
                  <strong className={styles.pcoMetricValue}>{metric.value}</strong>
                  {metric.hint && (
                    <small className={metric.hintWarn ? styles.pcoMetricHintWarn : undefined}>
                      {metric.hint}
                    </small>
                  )}
                  {metric.cta && <span className={styles.pcoMetricCta}>{metric.cta}</span>}
                </div>
              </button>
            )
          })}
        </section>
      )}

      <div className={styles.pcoDetails}>
        {/* Card: Objetivo e perfil */}
        <article className={styles.pcoCard}>
          <header className={[styles.pcoCardHead, styles.pcoCardHeadSplit].join(' ')}>
            <div className={styles.pcoCardHeadMain}>
              <span className={styles.pcoCardIcon} aria-hidden="true">
                <Target size={14} />
              </span>
              <h3>Objetivo e perfil</h3>
            </div>
            <button type="button" className={styles.pcoLinkBtn} onClick={onEditProfile}>
              Editar
            </button>
          </header>

          <dl className={styles.pcoDl}>
            {(
              [
                ['Objetivo', objectiveLabel],
                ['Modalidade', modalityLabel],
                ['Ocupação', profile.occupation || '—'],
                ['Estado civil', maritalLabel],
                ['CPF', cpfLabel],
                ['Altura', heightLabel],
                ['Peso', weightLabel],
                ...(imcLabel !== '—' ? [['IMC', imcLabel] as [string, string]] : []),
              ] as [string, string][]
            ).map(([dt, dd]) => (
              <div key={dt} className={styles.pcoDlRow}>
                <dt>{dt}</dt>
                <dd>{dd}</dd>
              </div>
            ))}
          </dl>
        </article>

        {/* Card: Localização + Flags clínicas */}
        <article className={styles.pcoCard}>
          <header className={[styles.pcoCardHead, styles.pcoCardHeadSplit].join(' ')}>
            <div className={styles.pcoCardHeadMain}>
              <span className={styles.pcoCardIcon} aria-hidden="true">
                <MapPin size={14} />
              </span>
              <h3>Localização</h3>
            </div>
            <button type="button" className={styles.pcoLinkBtn} onClick={onEditProfile}>
              {addressLine ? 'Editar' : 'Completar'}
            </button>
          </header>
          <p className={styles.pcoCardLead}>{addressLine || 'Endereço não informado'}</p>
          {cityLine ? (
            <p className={styles.pcoCardSub}>{cityLine}</p>
          ) : (
            !addressLine && (
              <p className={styles.pcoCardSub}>
                Preencha o endereço para consultas presenciais e documentos.
              </p>
            )
          )}

          <header className={[styles.pcoCardHead, styles.pcoCardHeadSpaced].join(' ')}>
            <span className={[styles.pcoCardIcon, styles.pcoCardIconRose].join(' ')} aria-hidden="true">
              <HeartPulse size={14} />
            </span>
            <h3>Flags clínicas</h3>
          </header>
          <div className={styles.pcoFlags}>
            {(
              [
                ['Atleta', profile.athlete],
                ['Gestante', profile.pregnant],
                ['Lactante', profile.lactating],
              ] as [string, boolean | undefined][]
            ).map(([label, on]) => (
              <span
                key={label}
                className={[styles.pcoFlag, on ? styles.pcoFlagOn : ''].filter(Boolean).join(' ')}
              >
                {label}
              </span>
            ))}
          </div>
          {profile.notes ? (
            <p className={styles.pcoNotes}>{profile.notes}</p>
          ) : (
            <p className={styles.pcoEmptyInline}>Sem anotações clínicas.</p>
          )}
        </article>
      </div>

      {/* Card: Evolução nutricional */}
      <article className={[styles.pcoCard, styles.pcoCardWide].join(' ')}>
        <header className={[styles.pcoCardHead, styles.pcoCardHeadSplit].join(' ')}>
          <div className={styles.pcoCardHeadMain}>
            <span className={[styles.pcoCardIcon, styles.pcoCardIconGreen].join(' ')} aria-hidden="true">
              <Salad size={14} />
            </span>
            <h3>Evolução nutricional</h3>
          </div>
          <button
            type="button"
            className={styles.pcoLinkBtn}
            onClick={() => onNavigateEvolucao?.('nutricao')}
          >
            Abrir Evolução
          </button>
        </header>
        <PatientNutritionSection
          patientId={patientId}
          showLinks
          compact
          nutritionTarget={
            overview?.nutritionTarget &&
            typeof overview.nutritionTarget === 'object' &&
            overview.nutritionTarget !== null &&
            'caloriesKcal' in overview.nutritionTarget
              ? (overview.nutritionTarget as {
                  caloriesKcal?: number
                  carbsG?: number
                  proteinG?: number
                  fatG?: number
                })
              : null
          }
          onNavigate={onNavigateEvolucao}
        />
      </article>

      {overview && (
        <div className={styles.pcoBottom}>
          {/* Card: Últimos check-ins */}
          <article className={styles.pcoCard}>
            <header className={[styles.pcoCardHead, styles.pcoCardHeadSplit].join(' ')}>
              <div className={styles.pcoCardHeadMain}>
                <span className={[styles.pcoCardIcon, styles.pcoCardIconBlue].join(' ')} aria-hidden="true">
                  <CalendarCheck size={14} />
                </span>
                <h3>Últimos check-ins</h3>
              </div>
              <button
                type="button"
                className={styles.pcoLinkBtn}
                onClick={() => onNavigateEvolucao?.('checkins')}
              >
                Ver todos
              </button>
            </header>
            {!overview.checkIn?.recent?.length ? (
              <div className={styles.pcoEmptyBlock}>
                <CalendarCheck size={22} className={styles.pcoEmptyIcon} aria-hidden="true" />
                <p>Nenhum check-in registrado ainda.</p>
                <button
                  type="button"
                  className={styles.pcoEmptyCta}
                  onClick={() => onNavigateEvolucao?.('checkins')}
                >
                  Ir para check-ins
                </button>
              </div>
            ) : (
              <ul className={styles.pcoTimeline}>
                {overview.checkIn.recent.map((item) => (
                  <li key={item.id} className={styles.pcoTimelineItem}>
                    <div className={styles.pcoTimelineDate}>{formatWeek(item.weekStart)}</div>
                    <div className={styles.pcoTimelineTags}>
                      <span>Humor {item.mood}</span>
                      <span>Energia {item.energy}</span>
                      {item.weightKg && <span>{item.weightKg} kg</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Card: Conversas com Bella */}
          <article className={styles.pcoCard}>
            <header className={[styles.pcoCardHead, styles.pcoCardHeadSplit].join(' ')}>
              <div className={styles.pcoCardHeadMain}>
                <span className={[styles.pcoCardIcon, styles.pcoCardIconPurple].join(' ')} aria-hidden="true">
                  <Sparkles size={14} />
                </span>
                <h3>Conversas com Bella</h3>
              </div>
            </header>
            {!overview.bella?.recentMessages?.length ? (
              <div className={styles.pcoEmptyBlock}>
                <Sparkles size={22} className={styles.pcoEmptyIcon} aria-hidden="true" />
                <p>Sem mensagens recentes da Bella.</p>
              </div>
            ) : (
              <ul className={styles.pcoMessages}>
                {overview.bella.recentMessages.map((msg) => (
                  <li key={msg.id} className={styles.pcoMessage}>
                    <span className={styles.pcoMessageTopic}>{msg.topic || 'geral'}</span>
                    <p>{msg.preview}</p>
                    <time>{formatDateTime(msg.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </div>
  )
}
