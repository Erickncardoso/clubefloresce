<template>
  <div class="anw">
    <header class="anw-head">
      <div class="anw-head-copy">
        <div class="anw-patient-meta">
          <PatientAvatar :src="user?.avatar" :name="user?.name" size="sm" :ring="false" />
          <div>
            <strong>{{ user?.name || 'Paciente' }}</strong>
            <p>
              <span v-if="ageLabel">{{ ageLabel }}</span>
              <span v-if="ageLabel && genderLabel"> · </span>
              <span v-if="genderLabel">{{ genderLabel }}</span>
              <span v-if="recordLabel"> · Prontuário: {{ recordLabel }}</span>
            </p>
          </div>
        </div>
      </div>
      <div class="anw-head-actions">
        <button type="button" class="btn-secondary anw-btn" @click="$emit('open-history')">
          Histórico de anamnese
        </button>
        <button type="button" class="btn-primary anw-btn" @click="$emit('new-anamnese')">
          Nova anamnese
        </button>
      </div>
    </header>

    <div class="anw-layout">
      <section class="anw-main-card">
        <nav class="anw-stepper" aria-label="Etapas da anamnese">
          <button
            v-for="(step, index) in steps"
            :key="step.id"
            type="button"
            class="anw-step"
            :class="{
              'anw-step--active': index === currentStepIndex,
              'anw-step--done': index < currentStepIndex,
            }"
            @click="goToStep(index)"
          >
            <span class="anw-step-icon" aria-hidden="true">
              <component :is="step.icon" />
            </span>
            <span class="anw-step-copy">
              <small v-if="step.number">{{ step.number }}</small>
              <span>{{ step.label }}</span>
            </span>
          </button>
        </nav>

        <div class="anw-body">
          <header class="anw-step-head">
            <h3>{{ currentStepTitle }}</h3>
            <p>{{ currentStepHint }}</p>
          </header>

          <div v-if="currentStep.id === 'queixa'" class="anw-fields">
            <div class="field field--float anw-textarea-wrap">
              <label for="anw-chief">Queixa principal</label>
              <div class="anw-textarea-shell">
                <Quote class="anw-quote" aria-hidden="true" />
                <textarea
                  id="anw-chief"
                  v-model="form.chiefComplaint"
                  rows="5"
                  maxlength="1000"
                  placeholder="Descreva sintomas, quando começou e o que mais incomoda."
                />
                <span class="anw-counter">{{ form.chiefComplaint.length }}/1000</span>
              </div>
            </div>

            <div class="anw-block">
              <h4>Objetivos que a paciente deseja alcançar</h4>
              <div class="anw-goals">
                <button
                  v-for="goal in goalOptions"
                  :key="goal.id"
                  type="button"
                  class="anw-goal"
                  :class="{ 'anw-goal--active': form.goals.includes(goal.id) }"
                  @click="toggleGoal(goal.id)"
                >
                  <span class="anw-goal-icon" aria-hidden="true">
                    <component :is="goalIcon(goal.icon)" />
                  </span>
                  <span>{{ goal.label }}</span>
                  <span class="anw-goal-check" aria-hidden="true">
                    <Check v-if="form.goals.includes(goal.id)" :size="14" />
                  </span>
                </button>
              </div>
            </div>

            <div class="field field--float anw-slider-field">
              <label for="anw-priority">Prioridade do objetivo</label>
              <div class="anw-slider-box">
                <div class="anw-slider-row">
                  <input
                    id="anw-priority"
                    v-model.number="form.goalPriority"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    class="anw-slider"
                    :style="{ '--anw-slider-pct': `${(form.goalPriority / 10) * 100}%` }"
                  >
                  <output class="anw-slider-value" for="anw-priority">{{ form.goalPriority }}</output>
                </div>
                <div class="anw-slider-labels">
                  <span>Pouco motivada</span>
                  <span>Muito motivada</span>
                </div>
              </div>
            </div>

            <div class="anw-grid">
              <div class="field field--float">
                <label for="anw-duration">Há quanto tempo sente isso?</label>
                <input id="anw-duration" v-model="form.symptomDuration" placeholder="Ex: 3 meses">
              </div>
              <div class="field field--float">
                <label for="anw-motivation">Principal motivação</label>
                <input id="anw-motivation" v-model="form.mainMotivation" placeholder="Ex: Evento, saúde, autoestima">
              </div>
            </div>
          </div>

          <div v-else-if="currentStep.id === 'historico'" class="anw-fields">
            <div class="field field--float">
              <label for="anw-diseases">Doenças / diagnósticos</label>
              <textarea id="anw-diseases" v-model="form.diseases" rows="2" placeholder="Patologias atuais ou prévias" />
            </div>
            <div class="field field--float">
              <label for="anw-meds">Medicamentos em uso</label>
              <textarea id="anw-meds" v-model="form.medications" rows="2" placeholder="Nome, dose e frequência" />
            </div>
            <div class="field field--float">
              <label for="anw-allergies">Alergias e intolerâncias</label>
              <textarea id="anw-allergies" v-model="form.allergies" rows="2" placeholder="Alimentares, medicamentosas..." />
            </div>
            <div class="field field--float">
              <label for="anw-family">Histórico familiar</label>
              <textarea id="anw-family" v-model="form.familyHistory" rows="2" placeholder="Doenças relevantes na família" />
            </div>
          </div>

          <div v-else-if="currentStep.id === 'habitos'" class="anw-fields">
            <div class="anw-grid">
              <div class="field field--float">
                <label for="anw-sleep">Sono</label>
                <textarea id="anw-sleep" v-model="form.sleep" rows="2" placeholder="Horários, qualidade, despertares" />
              </div>
              <div class="field field--float">
                <label for="anw-water">Ingestão de água</label>
                <textarea id="anw-water" v-model="form.water" rows="2" placeholder="Quantidade diária, bebidas" />
              </div>
            </div>
            <div class="field field--float">
              <label for="anw-exercise">Atividade física</label>
              <textarea id="anw-exercise" v-model="form.exercise" rows="2" placeholder="Tipo, frequência, limitações" />
            </div>
            <div class="field field--float">
              <label for="anw-routine">Rotina diária</label>
              <textarea id="anw-routine" v-model="form.dailyRoutine" rows="2" placeholder="Trabalho, turnos, horários de refeição" />
            </div>
          </div>

          <div v-else-if="currentStep.id === 'alimentacao'" class="anw-fields">
            <div class="field field--float">
              <label for="anw-meals">Rotina alimentar</label>
              <textarea id="anw-meals" v-model="form.mealRoutine" rows="2" placeholder="Refeições, horários, locais" />
            </div>
            <div class="field field--float">
              <label for="anw-restrictions">Restrições alimentares</label>
              <textarea id="anw-restrictions" v-model="form.restrictions" rows="2" placeholder="Evita, não gosta, intolerâncias" />
            </div>
            <div class="anw-grid">
              <div class="field field--float">
                <label for="anw-cravings">Compulsões / desejos</label>
                <textarea id="anw-cravings" v-model="form.cravings" rows="2" placeholder="Doces, ultraprocessados..." />
              </div>
              <div class="field field--float">
                <label for="anw-supplements">Suplementos</label>
                <textarea id="anw-supplements" v-model="form.supplements" rows="2" placeholder="Vitaminas, whey, etc." />
              </div>
            </div>
          </div>

          <div v-else-if="currentStep.id === 'emocional'" class="anw-fields">
            <div class="field field--float">
              <label for="anw-stress">Estresse e ansiedade</label>
              <textarea id="anw-stress" v-model="form.stress" rows="2" placeholder="Nível percebido, gatilhos, rotina" />
            </div>
            <div class="field field--float">
              <label for="anw-food-rel">Relação com a comida</label>
              <textarea id="anw-food-rel" v-model="form.relationshipWithFood" rows="2" placeholder="Restrição, culpa, prazer..." />
            </div>
            <div class="field field--float">
              <label for="anw-mood">Humor / aspectos emocionais</label>
              <textarea id="anw-mood" v-model="form.mood" rows="2" placeholder="Como se sente no dia a dia" />
            </div>
          </div>

          <div v-else-if="currentStep.id === 'objetivos'" class="anw-fields">
            <div class="field field--float">
              <label for="anw-expectations">Expectativas com o acompanhamento</label>
              <textarea id="anw-expectations" v-model="form.expectations" rows="2" placeholder="O que espera alcançar com a nutri" />
            </div>
            <div class="anw-grid">
              <div class="field field--float">
                <label for="anw-timeline">Prazo desejado</label>
                <input id="anw-timeline" v-model="form.timeline" placeholder="Ex: 6 meses">
              </div>
              <div class="field field--float">
                <label for="anw-barriers">Barreiras percebidas</label>
                <input id="anw-barriers" v-model="form.barriers" placeholder="Ex: falta de tempo, rotina">
              </div>
            </div>
          </div>

          <div v-else class="anw-fields anw-summary">
            <article v-for="section in summarySections" :key="section.title" class="anw-summary-block">
              <h4>{{ section.title }}</h4>
              <p>{{ section.value }}</p>
            </article>
            <p v-if="!summarySections.length" class="anw-empty-summary">
              Preencha as etapas anteriores para gerar o resumo.
            </p>
          </div>
        </div>

        <footer class="anw-foot">
          <button
            v-if="currentStepIndex > 0"
            type="button"
            class="btn-secondary anw-nav-btn"
            @click="prevStep"
          >
            Voltar
          </button>
          <span v-else />
          <div class="anw-foot-right">
            <button
              type="button"
              class="btn-secondary anw-nav-btn"
              :disabled="saving"
              @click="saveDraft(false)"
            >
              {{ saving ? 'Salvando…' : 'Salvar rascunho' }}
            </button>
            <button
              v-if="!isLastStep"
              type="button"
              class="btn-primary anw-nav-btn anw-nav-btn--next"
              @click="nextStep"
            >
              Próximo
              <ArrowRight :size="16" aria-hidden="true" />
            </button>
            <button
              v-else
              type="button"
              class="btn-primary anw-nav-btn anw-nav-btn--next"
              :disabled="saving"
              @click="saveDraft(true)"
            >
              {{ saving ? 'Salvando…' : 'Concluir anamnese' }}
            </button>
          </div>
        </footer>
      </section>

      <aside class="anw-side">
        <section class="anw-side-card">
          <div class="anw-side-head">
            <h4>Progresso da anamnese</h4>
            <span>{{ progress.percent }}% concluído</span>
          </div>
          <div class="anw-progress-bar">
            <span :style="{ width: `${progress.percent}%` }" />
          </div>
          <ul class="anw-progress-list">
            <li
              v-for="(item, index) in progress.steps"
              :key="item.id"
              :class="{ 'anw-progress-item--active': index === currentStepIndex }"
            >
              <span>{{ item.number }}. {{ item.label }}</span>
              <strong>{{ item.filled }}/{{ item.total }}</strong>
            </li>
          </ul>
        </section>

        <section v-if="lastCompleted" class="anw-side-card">
          <h4>Informações da última anamnese</h4>
          <dl class="anw-last-meta">
            <div>
              <dt>Data</dt>
              <dd>{{ formatDate(lastCompleted.updatedAt || lastCompleted.createdAt) }}</dd>
            </div>
            <div>
              <dt>Por</dt>
              <dd>{{ lastCompleted.authorName || 'Nutricionista' }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd><span class="anw-status-badge">Concluída</span></dd>
            </div>
          </dl>
          <button type="button" class="btn-secondary anw-view-btn" @click="$emit('view-anamnese', lastCompleted)">
            <Eye :size="15" aria-hidden="true" />
            Ver anamnese completa
          </button>
        </section>
      </aside>
    </div>

    <p v-if="message" class="anw-msg" :class="{ 'anw-msg--error': messageError }">{{ message }}</p>
    <p v-if="saveError" class="anw-msg anw-msg--error">{{ saveError }}</p>
  </div>
</template>

<script setup>
import {
  ArrowRight,
  Baby,
  Check,
  Dumbbell,
  Eye,
  Heart,
  Quote,
  Scale,
  Utensils,
  Zap,
} from 'lucide-vue-next'
import {
  ANAMNESE_GOAL_OPTIONS,
  ANAMNESE_STEPS,
  buildAnamneseContentFromWizard,
  emptyAnamneseWizardForm,
  hydrateWizardFromAnamneseRecord,
  normalizeWizardForm,
  wizardProgress,
} from '~/utils/anamnese-wizard.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  anamnese: { type: Object, default: null },
  lastCompleted: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
})

const emit = defineEmits(['save', 'open-history', 'new-anamnese', 'view-anamnese'])

const steps = ANAMNESE_STEPS
const goalOptions = ANAMNESE_GOAL_OPTIONS
const currentStepIndex = ref(0)
const form = reactive(emptyAnamneseWizardForm())
const message = ref('')
const messageError = ref(false)

const currentStep = computed(() => steps[currentStepIndex.value] || steps[0])
const isLastStep = computed(() => currentStep.value.id === 'resumo')
const progress = computed(() => wizardProgress(form))

const genderLabel = computed(() => {
  const map = {
    female: 'Feminino',
    male: 'Masculino',
    other: 'Outro',
    prefer_not_say: 'Prefiro não dizer',
  }
  return map[props.profile?.gender] || ''
})

const ageLabel = computed(() => {
  const birth = props.profile?.birthDate
  if (!birth) return ''
  const date = new Date(`${birth}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const m = now.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1
  if (age < 0 || age > 120) return ''
  return `${age} anos`
})

const recordLabel = computed(() => {
  const id = String(props.user?.id || '')
  if (!id) return ''
  return `#${id.slice(-5).toUpperCase()}`
})

const stepHints = {
  queixa: 'Conte com suas palavras o que te trouxe até aqui.',
  historico: 'Registre antecedentes clínicos relevantes para o plano.',
  habitos: 'Descreva rotina, sono, água e movimento no dia a dia.',
  alimentacao: 'Mapeie hábitos alimentares, restrições e suplementação.',
  emocional: 'Entenda o contexto emocional e a relação com a alimentação.',
  objetivos: 'Alinhe expectativas, prazos e possíveis barreiras.',
  resumo: 'Revise os dados antes de concluir a anamnese.',
}

const currentStepTitle = computed(() => {
  const step = currentStep.value
  if (step.number) return `${step.number}. ${step.label}`
  return step.label
})

const currentStepHint = computed(() => stepHints[currentStep.value.id] || '')

const summarySections = computed(() => {
  const blocks = [
    { title: 'Queixa principal', value: form.chiefComplaint },
    {
      title: 'Objetivos',
      value: form.goals
        .map((id) => goalOptions.find((item) => item.id === id)?.label || id)
        .join(', '),
    },
    { title: 'Prioridade', value: `${form.goalPriority}/10` },
    { title: 'Histórico clínico', value: [form.diseases, form.medications, form.allergies, form.familyHistory].filter(Boolean).join('\n\n') },
    { title: 'Hábitos e rotina', value: [form.sleep, form.water, form.exercise, form.dailyRoutine].filter(Boolean).join('\n\n') },
    { title: 'Alimentação', value: [form.mealRoutine, form.restrictions, form.cravings, form.supplements].filter(Boolean).join('\n\n') },
    { title: 'Emocional', value: [form.stress, form.relationshipWithFood, form.mood].filter(Boolean).join('\n\n') },
    { title: 'Objetivos e expectativas', value: [form.expectations, form.timeline, form.barriers].filter(Boolean).join('\n\n') },
  ]
  return blocks.filter((item) => String(item.value || '').trim())
})

function hydrateFormFromAnamnese() {
  if (!props.anamnese) {
    Object.assign(form, emptyAnamneseWizardForm())
    return
  }
  Object.assign(form, hydrateWizardFromAnamneseRecord(props.anamnese))
}

watch(
  () => props.anamnese?.id ?? 'new',
  (id, prevId) => {
    if (id === prevId) return
    hydrateFormFromAnamnese()
    currentStepIndex.value = 0
    message.value = ''
    messageError.value = false
  },
  { immediate: true },
)

function goalIcon(name) {
  const map = {
    scale: Scale,
    dumbbell: Dumbbell,
    heart: Heart,
    zap: Zap,
    baby: Baby,
    utensils: Utensils,
  }
  return map[name] || Heart
}

function toggleGoal(id) {
  const idx = form.goals.indexOf(id)
  if (idx >= 0) form.goals.splice(idx, 1)
  else form.goals.push(id)
}

function goToStep(index) {
  if (index >= 0 && index < steps.length) currentStepIndex.value = index
}

function nextStep() {
  if (currentStepIndex.value < steps.length - 1) currentStepIndex.value += 1
}

function prevStep() {
  if (currentStepIndex.value > 0) currentStepIndex.value -= 1
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function saveDraft(complete) {
  message.value = ''
  messageError.value = false
  emit('save', {
    formData: { ...form, goals: [...form.goals] },
    content: buildAnamneseContentFromWizard(form),
    status: complete ? 'completed' : 'draft',
    foodRestrictions: form.restrictions || null,
    onSuccess: (text) => {
      message.value = text
      messageError.value = false
      if (complete) currentStepIndex.value = steps.length - 1
    },
    onError: (text) => {
      message.value = text
      messageError.value = true
    },
  })
}
</script>

<style scoped>
.anw {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.anw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: #fff;
  border: 1px solid #e8ece9;
}

.anw-patient-meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.anw-patient-meta strong {
  display: block;
  font-size: 0.95rem;
  color: #1f2937;
}

.anw-patient-meta p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.anw-head-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.anw-btn {
  min-height: 2rem !important;
  padding: 0.35rem 0.75rem !important;
  font-size: 0.8125rem !important;
}

.anw-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 1rem;
  align-items: start;
}

.anw-main-card {
  background: #fff;
  border: 1px solid #e8ece9;
  overflow: hidden;
}

.anw-stepper {
  display: flex;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid #eef1ee;
  scrollbar-width: none;
}

.anw-stepper::-webkit-scrollbar {
  display: none;
}

.anw-step {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex: 1 1 0;
  padding: 0.75rem 0.65rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  text-align: left;
}

.anw-step--active {
  color: var(--primary, #8B967C);
  border-bottom-color: var(--primary, #8B967C);
  background: rgba(139, 150, 124, 0.06);
}

.anw-step--done {
  color: #4b5563;
}

.anw-step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.anw-step-icon svg {
  width: 1rem;
  height: 1rem;
}

.anw-step-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.anw-step-copy small {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.anw-step-copy span {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anw-body {
  padding: 1.1rem 1.15rem 0.5rem;
}

.anw-step-head h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
}

.anw-step-head p {
  margin: 0.25rem 0 0.85rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.anw-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.anw-textarea-wrap {
  position: relative;
  display: block;
  width: 100%;
  margin-top: 0.15rem;
}

.anw-textarea-shell {
  position: relative;
  display: block;
  width: 100%;
  min-height: 7.25rem;
}

.anw-textarea-shell textarea {
  display: block;
  width: 100%;
  min-height: 7.25rem;
  box-sizing: border-box;
  padding: 1.15rem 0.9rem 1.75rem 2.05rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #faf8f9;
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.anw-textarea-shell textarea:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
  background: #fff;
}

.anw-quote {
  position: absolute;
  top: 1.1rem;
  left: 0.85rem;
  width: 1rem;
  height: 1rem;
  color: #d1a9b3;
  z-index: 1;
  pointer-events: none;
}

.anw-counter {
  position: absolute;
  right: 0.85rem;
  bottom: 0.65rem;
  font-size: 0.6875rem;
  color: #9ca3af;
  pointer-events: none;
  z-index: 1;
}

.anw-block h4 {
  margin: 0 0 0.65rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.anw-goals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.anw-goal {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.45rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid #e8ece9;
  background: #fff;
  color: #374151;
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.anw-goal--active {
  border-color: var(--primary, #8B967C);
  background: rgba(139, 150, 124, 0.08);
  color: #2f3a2d;
}

.anw-goal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: rgba(139, 150, 124, 0.12);
  color: var(--primary, #8B967C);
  flex-shrink: 0;
}

.anw-goal-check {
  margin-left: auto;
  color: var(--primary, #8B967C);
}

.anw-slider-field {
  position: relative;
  margin-top: 0.15rem;
}

.anw-slider-box {
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  padding: 0.95rem 0.9rem 0.7rem;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.anw-slider-field:focus-within .anw-slider-box {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.anw-slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.anw-slider-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.4rem;
  background: rgba(139, 150, 124, 0.14);
  color: var(--primary, #8B967C);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
}

.anw-slider {
  flex: 1;
  min-width: 0;
  height: 1.25rem;
  margin: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.anw-slider:focus {
  outline: none;
}

.anw-slider::-webkit-slider-runnable-track {
  height: 0.4rem;
  border-radius: var(--cf-radius-pill);
  background: linear-gradient(
    to right,
    var(--primary, #8B967C) 0%,
    var(--primary, #8B967C) var(--anw-slider-pct, 0%),
    #e8ece9 var(--anw-slider-pct, 0%),
    #e8ece9 100%
  );
}

.anw-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 1.125rem;
  height: 1.125rem;
  margin-top: -0.3625rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--primary, #8B967C);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.16);
  transition: transform 0.12s ease;
}

.anw-slider:active::-webkit-slider-thumb {
  transform: scale(1.06);
}

.anw-slider::-moz-range-track {
  height: 0.4rem;
  border: none;
  border-radius: var(--cf-radius-pill);
  background: #e8ece9;
}

.anw-slider::-moz-range-progress {
  height: 0.4rem;
  border-radius: var(--cf-radius-pill);
  background: var(--primary, #8B967C);
}

.anw-slider::-moz-range-thumb {
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--primary, #8B967C);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.16);
  cursor: pointer;
}

.anw-slider-labels {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.anw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.anw-grid .field--float {
  margin-top: 0.15rem;
}

.anw-summary {
  gap: 0.65rem;
}

.anw-summary-block {
  padding: 0.75rem 0.85rem;
  border: 1px solid #eef1ee;
  background: #fafbfa;
}

.anw-summary-block h4 {
  margin: 0 0 0.35rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.anw-summary-block p {
  margin: 0;
  font-size: 0.875rem;
  color: #1f2937;
  white-space: pre-wrap;
  line-height: 1.45;
}

.anw-empty-summary {
  margin: 0;
  color: #9ca3af;
  font-size: 0.875rem;
}

.anw-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.15rem 1rem;
  border-top: 1px solid #eef1ee;
}

.anw-foot-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.anw-nav-btn {
  min-height: 2.1rem !important;
  padding: 0.35rem 0.85rem !important;
  font-size: 0.8125rem !important;
}

.anw-nav-btn--next {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.anw-side {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.anw-side-card {
  padding: 0.9rem;
  background: #fff;
  border: 1px solid #e8ece9;
}

.anw-side-card h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.anw-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.anw-side-head span {
  font-size: 0.75rem;
  color: #6b7280;
}

.anw-progress-bar {
  height: 0.35rem;
  background: #eef1ee;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.anw-progress-bar span {
  display: block;
  height: 100%;
  background: var(--primary, #8B967C);
  border-radius: inherit;
  transition: width 0.2s ease;
}

.anw-progress-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.anw-progress-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.anw-progress-list li strong {
  font-size: 0.6875rem;
  color: #9ca3af;
  font-weight: 600;
}

.anw-progress-item--active {
  background: rgba(139, 150, 124, 0.1);
  color: #374151;
}

.anw-last-meta {
  margin: 0.75rem 0;
  display: grid;
  gap: 0.55rem;
}

.anw-last-meta div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.8125rem;
}

.anw-last-meta dt {
  color: #9ca3af;
}

.anw-last-meta dd {
  margin: 0;
  color: #374151;
  text-align: right;
}

.anw-status-badge {
  display: inline-flex;
  padding: 0.12rem 0.45rem;
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  font-size: 0.6875rem;
  font-weight: 600;
}

.anw-view-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.anw-msg {
  margin: 0;
  font-size: 0.8125rem;
  color: #15803d;
}

.anw-msg--error {
  color: #b42318;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1080px) {
  .anw-layout {
    grid-template-columns: 1fr;
  }

  .anw-goals {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .anw-head,
  .anw-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .anw-head-actions,
  .anw-foot-right {
    width: 100%;
  }

  .anw-goals,
  .anw-grid {
    grid-template-columns: 1fr;
  }

  .anw-step-copy span {
    white-space: normal;
  }
}
</style>
