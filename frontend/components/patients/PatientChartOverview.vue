<template>
  <div class="pco">
    <section v-if="overview" class="pco-metrics" aria-label="Indicadores do paciente">
      <article
        v-for="metric in metricItems"
        :key="metric.label"
        class="pco-metric"
        :class="metric.tone ? `pco-metric--${metric.tone}` : ''"
      >
        <span class="pco-metric-icon" aria-hidden="true">
          <component :is="metric.icon" />
        </span>
        <div class="pco-metric-copy">
          <span class="pco-metric-label">{{ metric.label }}</span>
          <strong class="pco-metric-value">{{ metric.value }}</strong>
          <small v-if="metric.hint" :class="{ 'pco-metric-hint--warn': metric.hintWarn }">
            {{ metric.hint }}
          </small>
        </div>
      </article>
    </section>

    <div class="pco-details">
      <article class="pco-card">
        <header class="pco-card-head">
          <span class="pco-card-icon" aria-hidden="true"><Target /></span>
          <h3>Objetivo e perfil</h3>
        </header>

        <dl class="pco-dl">
          <div class="pco-dl-row">
            <dt>Objetivo</dt>
            <dd>{{ objectiveLabel }}</dd>
          </div>
          <div class="pco-dl-row">
            <dt>Modalidade</dt>
            <dd>{{ modalityLabel }}</dd>
          </div>
          <div class="pco-dl-row">
            <dt>Ocupação</dt>
            <dd>{{ profile.occupation || '—' }}</dd>
          </div>
          <div class="pco-dl-row">
            <dt>Estado civil</dt>
            <dd>{{ maritalLabel }}</dd>
          </div>
          <div class="pco-dl-row">
            <dt>CPF</dt>
            <dd>{{ cpfLabel }}</dd>
          </div>
          <div class="pco-dl-row">
            <dt>Altura</dt>
            <dd>{{ heightLabel }}</dd>
          </div>
          <div class="pco-dl-row">
            <dt>Peso</dt>
            <dd>{{ weightLabel }}</dd>
          </div>
          <div v-if="imcLabel !== '—'" class="pco-dl-row">
            <dt>IMC</dt>
            <dd>{{ imcLabel }}</dd>
          </div>
        </dl>
      </article>

      <article class="pco-card">
        <header class="pco-card-head">
          <span class="pco-card-icon" aria-hidden="true"><MapPin /></span>
          <h3>Localização</h3>
        </header>
        <p class="pco-card-lead">{{ addressLine || 'Endereço não informado' }}</p>
        <p v-if="cityLine" class="pco-card-sub">{{ cityLine }}</p>

        <header class="pco-card-head pco-card-head--spaced">
          <span class="pco-card-icon pco-card-icon--rose" aria-hidden="true"><HeartPulse /></span>
          <h3>Flags clínicas</h3>
        </header>
        <div class="pco-flags">
          <span class="pco-flag" :class="{ 'pco-flag--on': profile.athlete }">Atleta</span>
          <span class="pco-flag" :class="{ 'pco-flag--on': profile.pregnant }">Gestante</span>
          <span class="pco-flag" :class="{ 'pco-flag--on': profile.lactating }">Lactante</span>
        </div>
        <p v-if="profile.notes" class="pco-notes">{{ profile.notes }}</p>
        <p v-else class="pco-empty-inline">Sem anotações clínicas.</p>
      </article>
    </div>

    <article class="pco-card pco-card--wide">
      <header class="pco-card-head pco-card-head--split">
        <div class="pco-card-head-main">
          <span class="pco-card-icon pco-card-icon--green" aria-hidden="true"><Salad /></span>
          <h3>Evolução nutricional</h3>
        </div>
      </header>
      <PatientsPatientNutritionSection
        :patient-id="patientId"
        show-links
        @navigate="$emit('navigate-evolucao', $event)"
      />
    </article>

    <div v-if="overview" class="pco-bottom">
      <article class="pco-card">
        <header class="pco-card-head">
          <span class="pco-card-icon pco-card-icon--blue" aria-hidden="true"><CalendarCheck /></span>
          <h3>Últimos check-ins</h3>
        </header>
        <div v-if="!overview.checkIn?.recent?.length" class="pco-empty-block">
          <CalendarCheck class="pco-empty-icon" aria-hidden="true" />
          <p>Nenhum check-in registrado ainda.</p>
        </div>
        <ul v-else class="pco-timeline">
          <li v-for="item in overview.checkIn.recent" :key="item.id" class="pco-timeline-item">
            <div class="pco-timeline-date">{{ formatWeek(item.weekStart) }}</div>
            <div class="pco-timeline-tags">
              <span>Humor {{ item.mood }}</span>
              <span>Energia {{ item.energy }}</span>
              <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
            </div>
          </li>
        </ul>
      </article>

      <article class="pco-card">
        <header class="pco-card-head">
          <span class="pco-card-icon pco-card-icon--purple" aria-hidden="true"><Sparkles /></span>
          <h3>Conversas com Bella</h3>
        </header>
        <div v-if="!overview.bella?.recentMessages?.length" class="pco-empty-block">
          <Sparkles class="pco-empty-icon" aria-hidden="true" />
          <p>Sem mensagens recentes.</p>
        </div>
        <ul v-else class="pco-messages">
          <li v-for="msg in overview.bella.recentMessages" :key="msg.id" class="pco-message">
            <span class="pco-message-topic">{{ msg.topic || 'geral' }}</span>
            <p>{{ msg.preview }}</p>
            <time>{{ formatDateTime(msg.createdAt) }}</time>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>

<script setup>
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
} from 'lucide-vue-next'
import { paymentAccessLabel } from '~/utils/patient-billing-display'
import { formatCpfMask } from '~/composables/useQuickAddPatient.js'

const props = defineProps({
  patientId: { type: String, required: true },
  profile: { type: Object, default: () => ({}) },
  overview: { type: Object, default: null },
})

defineEmits(['navigate-evolucao'])

const maritalLabel = computed(() => {
  const map = {
    single: 'Solteira(o)',
    married: 'Casada(o)',
    stable_union: 'União estável',
    union: 'União estável',
    divorced: 'Divorciada(o)',
    widowed: 'Viúva(o)',
    other: 'Outro',
  }
  return map[props.profile?.maritalStatus] || '—'
})

const modalityLabel = computed(() => {
  if (props.profile?.modality === 'online') return 'Online'
  if (props.profile?.modality === 'presencial') return 'Presencial'
  return '—'
})

const cpfLabel = computed(() => {
  const cpf = props.profile?.cpf
  if (!cpf) return '—'
  return formatCpfMask(cpf)
})

const objectiveLabel = computed(() => {
  if (props.profile?.objective) return props.profile.objective
  const map = {
    lose_weight: 'Emagrecer',
    maintain: 'Manter peso',
    gain_weight: 'Ganhar peso',
    muscle: 'Ganho muscular',
    health: 'Saúde',
  }
  return map[props.profile?.primaryGoal] || 'Não informado'
})

const addressLine = computed(() => {
  const parts = [
    props.profile?.street,
    props.profile?.streetNumber,
    props.profile?.neighborhood,
  ].filter(Boolean)
  return parts.join(', ')
})

const cityLine = computed(() => {
  const zip = props.profile?.zipCode ? formatCepMask(props.profile.zipCode) : ''
  const parts = [props.profile?.city, props.profile?.state, zip].filter(Boolean)
  return parts.join(' · ')
})

const heightLabel = computed(() => {
  const n = Number(props.profile?.heightCm)
  return Number.isFinite(n) && n > 0 ? `${n} cm` : '—'
})

const weightLabel = computed(() => {
  const fromCheckIn = props.overview?.checkIn?.latest?.weightKg
  const fromProfile = props.profile?.weightKg
  const raw = fromCheckIn ?? fromProfile
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? `${n} kg` : '—'
})

const imcLabel = computed(() => {
  const weight = Number(props.overview?.checkIn?.latest?.weightKg ?? props.profile?.weightKg)
  const heightCm = Number(props.profile?.heightCm)
  if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || heightCm <= 0 || weight <= 0) return '—'
  return (weight / ((heightCm / 100) ** 2)).toFixed(1)
})

const metricItems = computed(() => {
  const o = props.overview
  if (!o) return []

  const payment = paymentAccessLabel(o.patient)
  const paymentTone = payment === 'Pago' || payment === 'Liberado'
    ? 'success'
    : payment === 'Expirado' || payment === 'Não pago'
      ? 'danger'
      : 'neutral'

  const items = [
    {
      label: 'Pagamento',
      value: payment,
      hint: null,
      icon: Wallet,
      tone: paymentTone,
    },
    {
      label: 'Check-ins',
      value: String(o.checkIn?.total || 0),
      hint: o.checkIn?.missingThisWeek ? 'Sem check-in esta semana' : 'Semana em dia',
      hintWarn: Boolean(o.checkIn?.missingThisWeek),
      icon: CalendarCheck,
      tone: o.checkIn?.missingThisWeek ? 'warn' : 'neutral',
    },
    {
      label: 'Plano alimentar',
      value: o.mealPlan ? 'Ativo' : 'Pendente',
      hint: `${o.mealPlan?.mealCount || 0} refeições`,
      icon: Salad,
      tone: o.mealPlan ? 'success' : 'warn',
    },
    {
      label: 'Cursos',
      value: `${o.courseProgress?.percent || 0}%`,
      hint: `${o.courseProgress?.watchedLessons || 0}/${o.courseProgress?.totalLessons || 0} aulas`,
      icon: BookOpen,
      tone: 'neutral',
    },
    {
      label: 'Último peso',
      value: o.checkIn?.latest?.weightKg ? `${o.checkIn.latest.weightKg} kg` : (props.profile?.weightKg ? `${props.profile.weightKg} kg` : '—'),
      hint: null,
      icon: Scale,
      tone: 'neutral',
    },
  ]

  if (o.foodDiary?.today) {
    items.push({
      label: 'Nutrição hoje',
      value: `${Math.round(o.foodDiary.today.consumed.caloriesKcal)} kcal`,
      hint: `Meta ${o.foodDiary.today.targets.caloriesKcal} kcal`,
      icon: Flame,
      tone: 'neutral',
    })
  }

  return items
})

function formatCepMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function formatWeek(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.pco {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--admin-border, #e8ece9);
}

.pco-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.pco-metric {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 0.9rem;
  background: #fff;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  min-width: 0;
}

.pco-metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-full);
  background: #f3f5f4;
  color: #6b7280;
}

.pco-metric-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.pco-metric--success .pco-metric-icon {
  background: rgba(47, 107, 58, 0.12);
  color: #2f6b3a;
}

.pco-metric--warn .pco-metric-icon {
  background: rgba(202, 138, 4, 0.14);
  color: #92400e;
}

.pco-metric--danger .pco-metric-icon {
  background: rgba(197, 48, 48, 0.12);
  color: #b42318;
}

.pco-metric-copy {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.pco-metric-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
}

.pco-metric-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.pco-metric-copy small {
  font-size: 0.75rem;
  color: #8a9288;
  line-height: 1.3;
}

.pco-metric-hint--warn {
  color: #c53030 !important;
  font-weight: 600;
}

.pco-details,
.pco-bottom {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.pco-card {
  background: #fff;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  padding: 1rem 1.05rem;
  min-width: 0;
}

.pco-card--wide {
  padding: 1rem 1.05rem 1.1rem;
}

.pco-card-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
}

.pco-card-head--spaced {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #eef1ee;
}

.pco-card-head--split {
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.pco-card-head-main {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.pco-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-full);
  background: rgba(139, 150, 124, 0.12);
  color: var(--primary, #8b967c);
}

.pco-card-icon svg {
  width: 0.9rem;
  height: 0.9rem;
}

.pco-card-icon--green {
  background: rgba(47, 107, 58, 0.12);
  color: #2f6b3a;
}

.pco-card-icon--blue {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.pco-card-icon--purple {
  background: rgba(124, 58, 237, 0.12);
  color: #6d28d9;
}

.pco-card-icon--rose {
  background: rgba(244, 63, 94, 0.12);
  color: #be123c;
}

.pco-card-head h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  letter-spacing: -0.01em;
}

.pco-card-lead {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.45;
}

.pco-card-sub {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: #8a9288;
}

.pco-dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pco-dl-row {
  display: grid;
  grid-template-columns: minmax(5.5rem, 38%) 1fr;
  gap: 0.65rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid #f1f3f2;
  font-size: 0.8125rem;
}

.pco-dl-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pco-dl-row dt {
  margin: 0;
  color: #9ca3af;
  font-weight: 500;
}

.pco-dl-row dd {
  margin: 0;
  color: #1f2937;
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}

.pco-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pco-flag {
  display: inline-flex;
  align-items: center;
  min-height: 1.65rem;
  padding: 0.2rem 0.65rem;
  border-radius: var(--cf-radius-pill);
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 600;
}

.pco-flag--on {
  background: rgba(139, 150, 124, 0.16);
  color: #4b554c;
}

.pco-notes {
  margin: 0.75rem 0 0;
  padding: 0.65rem 0.75rem;
  border-radius: var(--cf-radius-control);
  background: #f8faf9;
  color: #4b5563;
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.pco-empty-inline {
  margin: 0.5rem 0 0;
  color: #9ca3af;
  font-size: 0.8125rem;
}

.pco-empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 1.25rem 0.75rem;
  text-align: center;
  color: #9ca3af;
}

.pco-empty-block p {
  margin: 0;
  font-size: 0.8125rem;
}

.pco-empty-icon {
  width: 1.35rem;
  height: 1.35rem;
  opacity: 0.55;
}

.pco-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pco-timeline-item {
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f3f2;
}

.pco-timeline-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pco-timeline-date {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.3rem;
}

.pco-timeline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pco-timeline-tags span {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: var(--cf-radius-pill);
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.72rem;
  font-weight: 600;
}

.pco-messages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.pco-message {
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f3f2;
}

.pco-message:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pco-message-topic {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(139, 150, 124, 0.14);
  color: var(--primary, #8b967c);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pco-message p {
  margin: 0.4rem 0 0.25rem;
  font-size: 0.8125rem;
  color: #374151;
  line-height: 1.45;
}

.pco-message time {
  font-size: 0.72rem;
  color: #9ca3af;
}

@supports (corner-shape: squircle) {
  .pco-metric,
  .pco-card,
  .pco-flag,
  .pco-notes {
    corner-shape: squircle;
  }
}

@media (max-width: 1080px) {
  .pco-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .pco-metrics,
  .pco-details,
  .pco-bottom {
    grid-template-columns: 1fr;
  }

  .pco-dl-row {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .pco-dl-row dd {
    text-align: left;
  }
}
</style>
