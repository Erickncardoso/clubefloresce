<template>
  <div class="pco">
    <div class="pco-grid">
      <article class="pco-card">
        <h3>Objetivo</h3>
        <p>{{ objectiveLabel }}</p>
      </article>

      <article class="pco-card">
        <h3>Localização</h3>
        <p>{{ addressLine || 'Não informado' }}</p>
        <small v-if="cityLine">{{ cityLine }}</small>
      </article>

      <article class="pco-card">
        <h3>Perfil</h3>
        <ul class="pco-list">
          <li><span>Ocupação</span><strong>{{ profile.occupation || '—' }}</strong></li>
          <li><span>Estado civil</span><strong>{{ maritalLabel }}</strong></li>
          <li><span>Modalidade</span><strong>{{ modalityLabel }}</strong></li>
          <li><span>CPF</span><strong>{{ cpfLabel }}</strong></li>
          <li><span>Altura</span><strong>{{ heightLabel }}</strong></li>
          <li><span>Peso</span><strong>{{ weightLabel }}</strong></li>
          <li v-if="imcLabel !== '—'"><span>IMC</span><strong>{{ imcLabel }}</strong></li>
        </ul>
      </article>

      <article class="pco-card">
        <h3>Flags clínicas</h3>
        <div class="pco-flags">
          <span :class="{ on: profile.athlete }">Atleta</span>
          <span :class="{ on: profile.pregnant }">Gestante</span>
          <span :class="{ on: profile.lactating }">Lactante</span>
        </div>
        <p v-if="profile.notes" class="pco-notes">{{ profile.notes }}</p>
        <p v-else class="pco-empty">Sem anotações.</p>
      </article>
    </div>

    <div v-if="overview" class="pco-stats">
      <article class="pco-stat">
        <span>Pagamento</span>
        <strong>{{ paymentAccessLabel(overview.patient) }}</strong>
      </article>
      <article class="pco-stat">
        <span>Check-ins</span>
        <strong>{{ overview.checkIn?.total || 0 }}</strong>
        <small :class="{ warn: overview.checkIn?.missingThisWeek }">
          {{ overview.checkIn?.missingThisWeek ? 'Sem check-in esta semana' : 'Semana em dia' }}
        </small>
      </article>
      <article class="pco-stat">
        <span>Plano alimentar</span>
        <strong>{{ overview.mealPlan ? 'Ativo' : 'Pendente' }}</strong>
        <small>{{ overview.mealPlan?.mealCount || 0 }} refeições</small>
      </article>
      <article class="pco-stat">
        <span>Cursos</span>
        <strong>{{ overview.courseProgress?.percent || 0 }}%</strong>
        <small>
          {{ overview.courseProgress?.watchedLessons || 0 }}/{{ overview.courseProgress?.totalLessons || 0 }} aulas
        </small>
      </article>
      <article class="pco-stat">
        <span>Último peso</span>
        <strong>{{ latestWeight || '—' }}</strong>
      </article>
      <article v-if="overview.foodDiary?.today" class="pco-stat">
        <span>Nutrição hoje</span>
        <strong>{{ Math.round(overview.foodDiary.today.consumed.caloriesKcal) }} kcal</strong>
        <small>Meta {{ overview.foodDiary.today.targets.caloriesKcal }} kcal</small>
      </article>
    </div>

    <section class="pco-nutrition">
      <PatientsPatientNutritionSection
        :patient-id="patientId"
        show-links
        @navigate="$emit('navigate-evolucao', $event)"
      />
    </section>

    <div v-if="overview" class="pco-two">
      <article class="pco-card">
        <h3>Últimos check-ins</h3>
        <div v-if="!overview.checkIn?.recent?.length" class="pco-empty">Nenhum check-in ainda.</div>
        <div
          v-for="item in overview.checkIn?.recent || []"
          :key="item.id"
          class="pco-row"
        >
          <span>{{ formatWeek(item.weekStart) }}</span>
          <span>Humor {{ item.mood }}</span>
          <span>Energia {{ item.energy }}</span>
          <span v-if="item.weightKg">{{ item.weightKg }} kg</span>
        </div>
      </article>

      <article class="pco-card">
        <h3>Conversas com Bella</h3>
        <div v-if="!overview.bella?.recentMessages?.length" class="pco-empty">Sem mensagens recentes.</div>
        <div
          v-for="msg in overview.bella?.recentMessages || []"
          :key="msg.id"
          class="pco-bella"
        >
          <span>{{ msg.topic || 'geral' }}</span>
          <p>{{ msg.preview }}</p>
          <small>{{ formatDateTime(msg.createdAt) }}</small>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
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
  const zip = props.profile?.zipCode
    ? formatCepMask(props.profile.zipCode)
    : ''
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

const latestWeight = computed(() => {
  const w = props.overview?.checkIn?.latest?.weightKg ?? props.profile?.weightKg
  return w ? `${w} kg` : null
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
  gap: 1.1rem;
}

.pco-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.pco-card {
  background: #fff;
  border: 1.5px solid #e8ece9;
  padding: 1rem 1.1rem;
}

.pco-card h3 {
  margin: 0 0 0.55rem;
  font-size: 0.86rem;
  font-weight: 700;
  color: #6b7368;
}

.pco-card p {
  margin: 0;
  color: #2c322c;
  font-size: 0.95rem;
  line-height: 1.45;
}

.pco-card small {
  display: block;
  margin-top: 0.35rem;
  color: #8a9288;
}

.pco-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.pco-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.88rem;
}

.pco-list span {
  color: #8a9288;
}

.pco-list strong {
  color: #2c322c;
  font-weight: 700;
  text-align: right;
}

.pco-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pco-flags span {
  padding: 0.28rem 0.6rem;
  background: #eef1ee;
  color: #8a9288;
  font-size: 0.78rem;
  font-weight: 700;
}

.pco-flags span.on {
  background: rgba(139, 150, 124, 0.18);
  color: #2c322c;
}

.pco-notes {
  margin-top: 0.75rem !important;
  white-space: pre-wrap;
}

.pco-empty {
  color: #9ca3af;
  font-size: 0.88rem;
}

.pco-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.pco-stat {
  background: #fff;
  border: 1.5px solid #e8ece9;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pco-stat span {
  font-size: 0.78rem;
  color: #6b7368;
  font-weight: 600;
}

.pco-stat strong {
  font-size: 1.15rem;
  color: #2c322c;
}

.pco-stat small {
  color: #8a9288;
  font-size: 0.78rem;
}

.pco-stat small.warn {
  color: #c53030;
}

.pco-nutrition {
  background: #fff;
  border: 1.5px solid #e8ece9;
  padding: 0.85rem;
}

.pco-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.pco-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid #eef1ee;
  font-size: 0.84rem;
  color: #2c322c;
}

.pco-bella {
  padding: 0.55rem 0;
  border-bottom: 1px solid #eef1ee;
}

.pco-bella span {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b8f64;
  text-transform: uppercase;
}

.pco-bella p {
  margin: 0.25rem 0;
  font-size: 0.88rem;
}

.pco-bella small {
  color: #8a9288;
}

@media (max-width: 900px) {
  .pco-grid,
  .pco-two,
  .pco-stats {
    grid-template-columns: 1fr;
  }
}
</style>
