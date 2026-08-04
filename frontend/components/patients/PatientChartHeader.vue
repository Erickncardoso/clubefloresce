<template>
  <header class="pch">
    <div class="pch-head-row">
      <nav class="pch-breadcrumb" aria-label="Navegação">
        <NuxtLink to="/usuarios" class="pch-crumb">Pacientes</NuxtLink>
        <span class="pch-crumb-sep" aria-hidden="true">›</span>
        <span class="pch-crumb pch-crumb--name">{{ user?.name || 'Paciente' }}</span>
        <template v-if="sectionLabel">
          <span class="pch-crumb-sep" aria-hidden="true">›</span>
          <span class="pch-crumb pch-crumb--current" aria-current="page">{{ sectionLabel }}</span>
        </template>
      </nav>

      <div class="pch-toolbar">
        <p v-if="sinceLabel" class="pch-since">
          <CalendarDays class="pch-since-icon" aria-hidden="true" />
          <span>Desde {{ sinceLabel }}</span>
        </p>

        <div class="pch-actions">
          <button
            type="button"
            class="pch-action pch-action--icon pch-action--call"
            title="Ligar por vídeo"
            aria-label="Ligar por vídeo"
            @click="$emit('start-call')"
          >
            <Video class="pch-call-icon" aria-hidden="true" />
          </button>
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            class="pch-action pch-action--icon pch-action--wa"
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            aria-label="Abrir WhatsApp"
          >
            <WhatsAppIcon class="pch-wa-icon" />
          </a>
          <button type="button" class="btn-primary pch-action pch-action--edit" @click="$emit('edit-patient')">
            Editar paciente
          </button>
        </div>
      </div>
    </div>

    <h1 v-if="compact && sectionLabel" class="pch-section-title">{{ sectionLabel }}</h1>

    <div v-if="!compact" class="pch-top">
      <div class="pch-main">
        <div class="pch-identity">
          <PatientAvatar
            :src="user?.avatar"
            :name="user?.name"
            :user="user"
            size="lg"
            :ring="false"
            class="pch-avatar"
          />
          <div class="pch-identity-copy">
            <div class="pch-title-row">
              <h1>{{ user?.name || 'Paciente' }}</h1>
              <span v-if="profile.nickname" class="pch-nickname">“{{ profile.nickname }}”</span>
            </div>
            <p class="pch-contact">
              <span v-if="user?.email" class="pch-contact-item">
                <Mail class="pch-contact-icon" aria-hidden="true" />
                <span>{{ user.email }}</span>
              </span>
              <span v-if="formattedPhone" class="pch-contact-item">
                <Phone class="pch-contact-icon" aria-hidden="true" />
                <span>{{ formattedPhone }}</span>
              </span>
            </p>
          </div>
        </div>

        <div class="pch-status">
          <div class="pch-badges">
            <span class="pch-badge" :class="`pch-badge--status-${statusKey}`">
              <CheckCircle class="pch-badge-icon" aria-hidden="true" />
              Paciente {{ statusLabel.toLowerCase() }}
            </span>
            <span class="pch-badge" :class="`pch-badge--plan-${planKey}`">
              <CalendarDays class="pch-badge-icon" aria-hidden="true" />
              {{ planKey === 'free' ? 'Sem plano ativo' : 'Plano ativo' }}
            </span>
            <span
              v-if="accessExpired"
              class="pch-badge pch-badge--expired"
            >
              <Heart class="pch-badge-icon" aria-hidden="true" />
              Acesso expirado
            </span>
            <span v-else class="pch-badge pch-badge--access">
              <Heart class="pch-badge-icon" aria-hidden="true" />
              Acesso até {{ formatAccessDate(user?.accessExpiresAt) }}
            </span>
            <span v-if="paymentLabel && paymentLabel !== '—'" class="pch-badge pch-badge--payment" :class="paymentBadgeClass">
              {{ paymentLabel }}
            </span>
            <PatientsPatientPaymentMethodBadge
              v-if="showPaymentMethod"
              :user="user"
            />
          </div>

          <div v-if="tagItems.length" class="pch-tags">
            <span
              v-for="tag in tagItems"
              :key="tag.id || tag.name"
              class="pch-tag"
              :style="{ background: softColor(tag.color), color: tag.color || '#64748B' }"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="metricPanelItems.length" class="pch-aside">
        <div class="pch-metrics">
          <div
            v-for="(item, index) in metricPanelItems"
            :key="item.label"
            class="pch-metric"
            :class="{ 'pch-metric--last': index === metricPanelItems.length - 1 }"
          >
            <span class="pch-metric-icon" :class="`pch-metric-icon--${item.tone}`" aria-hidden="true">
              <component :is="item.icon" />
            </span>
            <div class="pch-metric-copy">
              <span class="pch-metric-label">{{ item.label }}</span>
              <strong class="pch-metric-value">{{ item.value }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle,
  Heart,
  LineChart,
  Mail,
  Phone,
  ShoppingBag,
  Target,
  UserRound,
  Video,
} from 'lucide-vue-next'
import { isPatientAccessExpired } from '~/utils/patient-access'
import {
  paymentAccessLabel,
  resolveBillingPaymentMethod,
} from '~/utils/patient-billing-display'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  overview: { type: Object, default: null },
  sectionLabel: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

defineEmits(['edit-patient', 'start-call'])

const planKey = computed(() => String(props.user?.plan || 'FREE').toLowerCase())
const statusKey = computed(() => String(props.user?.status || 'ATIVO').toLowerCase())
const accessExpired = computed(() => isPatientAccessExpired(props.user?.accessExpiresAt))
const paymentLabel = computed(() => paymentAccessLabel(props.user || {}))
const showPaymentMethod = computed(() => Boolean(resolveBillingPaymentMethod(props.user || {})))

const paymentBadgeClass = computed(() => {
  const label = paymentLabel.value
  if (label === 'Pago') return 'pch-badge--paid'
  if (label === 'Liberado') return 'pch-badge--granted'
  if (label === 'Expirado') return 'pch-badge--expired'
  if (label === 'Não pago') return 'pch-badge--unpaid'
  return 'pch-badge--na'
})

const planLabel = computed(() => {
  const key = String(props.user?.plan || 'FREE').toUpperCase()
  if (key === 'PREMIUM') return 'Essencial'
  if (key === 'PLATINUM') return 'Completo'
  return 'Sem plano'
})

const statusLabel = computed(() => {
  const key = String(props.user?.status || 'ATIVO').toUpperCase()
  if (key === 'INATIVO') return 'Inativa'
  if (key === 'PENDENTE') return 'Pendente'
  return 'Ativa'
})

const tagItems = computed(() => {
  const items = props.profile?.tagItems
  if (Array.isArray(items) && items.length) return items
  const tags = props.profile?.tags
  if (Array.isArray(tags)) return tags.map((name) => ({ name, color: '#8B967C' }))
  return []
})

const genderLabel = computed(() => {
  const map = {
    female: 'Feminino',
    male: 'Masculino',
    other: 'Outro',
    prefer_not_say: 'Prefiro não dizer',
  }
  return map[props.profile?.gender] || ''
})

const modalityLabel = computed(() => {
  if (props.profile?.modality === 'online') return 'Online'
  if (props.profile?.modality === 'presencial') return 'Presencial'
  return ''
})

const maritalLabel = computed(() => {
  const map = {
    single: 'Solteiro(a)',
    married: 'Casado(a)',
    divorced: 'Divorciado(a)',
    widowed: 'Viúvo(a)',
    stable_union: 'União estável',
    union: 'União estável',
    other: 'Outro',
  }
  return map[props.profile?.maritalStatus] || ''
})

const ageLabel = computed(() => {
  const birth = props.profile?.birthDate
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return ''
  const date = new Date(`${birth}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const m = now.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1
  if (age < 0 || age > 120) return ''
  return `${age} anos`
})

const weightLabel = computed(() => {
  const fromCheckIn = props.overview?.checkIn?.latest?.weightKg
  const fromProfile = props.profile?.weightKg
  const raw = fromCheckIn ?? fromProfile
  if (raw == null || raw === '') return ''
  const n = Number(raw)
  if (!Number.isFinite(n)) return ''
  return `${n} kg`
})

const heightLabel = computed(() => {
  const raw = props.profile?.heightCm
  if (raw == null || raw === '') return ''
  const n = Number(raw)
  if (!Number.isFinite(n)) return ''
  return `${n} cm`
})

const imcLabel = computed(() => {
  const weight = Number(props.overview?.checkIn?.latest?.weightKg ?? props.profile?.weightKg)
  const heightCm = Number(props.profile?.heightCm)
  if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || heightCm <= 0) return ''
  const imc = weight / ((heightCm / 100) ** 2)
  if (!Number.isFinite(imc)) return ''
  return imc.toFixed(1)
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
  return map[props.profile?.primaryGoal] || ''
})

const metaItems = computed(() => {
  const items = [
    { label: 'Idade', value: ageLabel.value },
    { label: 'Sexo', value: genderLabel.value },
    { label: 'Peso', value: weightLabel.value },
    { label: 'Altura', value: heightLabel.value },
    { label: 'IMC', value: imcLabel.value },
    { label: 'Objetivo', value: objectiveLabel.value },
    { label: 'Modalidade', value: modalityLabel.value },
    { label: 'Ocupação', value: props.profile?.occupation || '' },
    { label: 'Estado civil', value: maritalLabel.value },
  ]
  return items.filter((item) => item.value && item.value !== '—')
})

const metricIconMap = {
  Idade: { icon: UserRound, tone: 'green' },
  Peso: { icon: ShoppingBag, tone: 'green' },
  Altura: { icon: ArrowUpDown, tone: 'purple' },
  IMC: { icon: LineChart, tone: 'blue' },
  Objetivo: { icon: Target, tone: 'rose' },
}

const metricPanelItems = computed(() => {
  const order = ['Idade', 'Peso', 'Altura', 'IMC', 'Objetivo']
  return order
    .map((label) => {
      const item = metaItems.value.find((entry) => entry.label === label)
      if (!item) return null
      return { ...item, ...metricIconMap[label] }
    })
    .filter(Boolean)
})

const sinceLabel = computed(() => formatDate(props.user?.createdAt))

const formattedPhone = computed(() => {
  const digits = String(props.user?.phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 13 && digits.startsWith('55')) {
    const local = digits.slice(2)
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return props.user.phone
})

const whatsappUrl = computed(() => {
  const digits = String(props.user?.phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
})

function softColor(hex) {
  return `${String(hex || '#64748B')}22`
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatAccessDate(date) {
  if (!date) return 'Sem limite'
  return formatDate(date)
}
</script>

<style scoped>
.pch {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0;
  font-size: var(--admin-font-body, 0.875rem);
}

.pch-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 1.25rem;
}

.pch-toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
  margin-left: auto;
}

.pch-breadcrumb {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.3;
}

.pch-crumb {
  color: #6b7368;
  text-decoration: none;
  font-weight: 400;
}

a.pch-crumb:hover {
  color: #2c322c;
}

.pch-crumb--name {
  color: #4a524c;
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
}

.pch-crumb--current {
  color: #8b967c;
  font-weight: 600;
}

.pch-section-title {
  margin: 0.35rem 0 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--admin-border, #e8ece9);
  font-size: 1.0625rem;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.02em;
}

.pch-crumb-sep {
  color: #a8b0a6;
  font-weight: 500;
  user-select: none;
}

.pch-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(19rem, 36rem);
  gap: 1rem 1.75rem;
  align-items: start;
}

.pch-main {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.pch-aside {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}

.pch-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.pch-identity {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.pch-identity :deep(.pch-avatar),
.pch-identity :deep(.patient-avatar--lg) {
  width: 3.75rem;
  flex-shrink: 0;
}

.pch-identity-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.pch-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
}

.pch-title-row h1 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.pch-nickname {
  color: #6b7368;
  font-size: 0.8125rem;
  font-weight: 500;
}

.pch-contact {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.85rem;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.35;
}

.pch-contact-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}

.pch-contact-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pch-contact-icon {
  width: 0.8rem;
  height: 0.8rem;
  flex-shrink: 0;
  color: #9ca3af;
}

.pch-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}

.pch-metrics {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  padding: 0.35rem 0.15rem;
}

.pch-metric {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.4rem;
  padding: 0.2rem 0.55rem;
  min-height: 2.35rem;
}

.pch-metric:not(.pch-metric--last)::after {
  content: '';
  position: absolute;
  top: 18%;
  right: 0;
  bottom: 18%;
  width: 1px;
  background: var(--admin-border, #e8ece9);
}

.pch-metric-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.05rem;
  min-width: 0;
}

.pch-metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-full);
}

.pch-metric-icon svg {
  width: 0.75rem;
  height: 0.75rem;
}

.pch-metric-icon--green {
  background: #e7f2ea;
  color: #4b5563;
}

.pch-metric-icon--purple {
  background: #efe9f8;
  color: #4b5563;
}

.pch-metric-icon--blue {
  background: #e8f0fb;
  color: #4b5563;
}

.pch-metric-icon--rose {
  background: #fce8ee;
  color: #4b5563;
}

.pch-metric-label {
  color: #9ca3af;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.15;
}

.pch-metric-value {
  color: #1f2937;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.pch-since {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  color: #9ca3af;
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.pch-since-icon {
  width: 0.65rem;
  height: 0.65rem;
  color: #b0b8b4;
}

.pch-action {
  text-decoration: none;
}

.pch-action--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem !important;
  min-width: 2rem !important;
  padding: 0.35rem !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: var(--cf-radius-control);
  cursor: pointer;
  transition: color 0.15s ease;
}

.pch-action--edit {
  min-height: 2rem !important;
  padding: 0.32rem 0.7rem !important;
  font-size: var(--admin-font-btn, 0.8125rem) !important;
  gap: 0.35rem !important;
}

.pch-action--call {
  color: #6b7280 !important;
}

.pch-action--call:hover {
  background: transparent !important;
  color: #8b967c !important;
}

.pch-call-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: inherit;
}

.pch-action--wa {
  color: #6b7280 !important;
}

.pch-action--wa:hover {
  background: transparent !important;
  color: #128c7e !important;
}

.pch-wa-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: inherit;
}

.pch-meta {
  display: none;
}

.pch-status {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-top: 0.05rem;
}

.pch-badges,
.pch-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.pch-badge,
.pch-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  min-height: 1.2rem;
  padding: 0.12rem 0.42rem;
  border-radius: var(--cf-radius-control);
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.1;
}

.pch-badge-icon {
  width: 0.62rem;
  height: 0.62rem;
  flex-shrink: 0;
}

.pch-badge--plan-free {
  background: #eef1ee;
  color: #4b554c;
}

.pch-badge--plan-premium {
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
}

.pch-badge--plan-platinum {
  background: rgba(124, 58, 237, 0.14);
  color: #5b21b6;
}

.pch-badge--status-ativo {
  background: rgba(47, 107, 58, 0.12);
  color: #2f6b3a;
}

.pch-badge--status-inativo {
  background: rgba(120, 120, 120, 0.14);
  color: #555;
}

.pch-badge--status-pendente {
  background: rgba(202, 138, 4, 0.16);
  color: #8a6a00;
}

.pch-badge--paid,
.pch-badge--granted {
  background: rgba(47, 107, 58, 0.14);
  color: #2f6b3a;
}

.pch-badge--unpaid,
.pch-badge--expired {
  background: rgba(197, 48, 48, 0.12);
  color: #b42318;
}

.pch-badge--na {
  background: #eef1ee;
  color: #6b7368;
}

.pch-badge--access {
  background: rgba(161, 98, 7, 0.1);
  color: #92400e;
}

.pch-access {
  display: none;
}

.pch-tag {
  font-weight: 700;
}

.pch-badges :deep(.user-tag) {
  display: inline-flex;
  align-items: center;
  min-height: 1.2rem;
  padding: 0.12rem 0.42rem;
  border-radius: var(--cf-radius-control);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
}

.pch-badges :deep(.user-tag--paymethod-pix) {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.pch-badges :deep(.user-tag--paymethod-card) {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.pch-badges :deep(.user-tag--paymethod-na) {
  background: #eef1ee;
  color: #6b7368;
}

.pch-badges :deep(.user-tag--paymethod-logo) {
  background: transparent;
  border: none;
  padding: 0;
  min-height: auto;
}

@supports (corner-shape: squircle) {
  .pch-metrics {
    corner-shape: squircle;
  }

  .pch-badge,
  .pch-tag {
    corner-shape: squircle;
  }
}

@media (max-width: 1080px) {
  .pch-top {
    grid-template-columns: 1fr;
  }

  .pch-head-row {
    flex-direction: column;
    align-items: stretch;
  }

  .pch-toolbar {
    align-items: flex-end;
    margin-left: 0;
  }
}

@media (max-width: 820px) {
  .pch-head-row {
    gap: 0.65rem;
  }

  .pch-toolbar {
    align-items: stretch;
  }

  .pch-actions {
    justify-content: flex-start;
  }

  .pch-since {
    align-self: flex-start;
  }
  .pch-metrics {
    flex-wrap: wrap;
    padding: 0.35rem;
    gap: 0.25rem 0;
  }

  .pch-metric {
    flex: 1 1 calc(50% - 0.25rem);
    min-width: 8.5rem;
    padding: 0.25rem 0.45rem;
    min-height: 2.1rem;
  }

  .pch-metric::after {
    display: none;
  }
}

@media (max-width: 820px) {
  .pch-hero {
    flex-direction: column;
  }

  .pch-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
