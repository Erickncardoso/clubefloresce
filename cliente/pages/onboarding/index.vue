<template>
  <OnboardingShell
    :show-header="currentStep !== 'welcome'"
    :show-back="canGoBack"
    :show-footer="showFooter"
    :progress-current="progressIndex"
    :progress-total="progressTotal"
    :continue-label="continueLabel"
    :continue-disabled="continueDisabled"
    :saving="saving"
    @back="goBack"
    @continue="handleContinue"
  >
    <div v-if="loading" class="onb-loading">Carregando…</div>

    <section v-else-if="currentStep === 'welcome'" class="onb-welcome">
      <div class="onb-welcome__hero" aria-hidden="true">
        <div class="onb-welcome__device">
          <div class="onb-welcome__screen">
            <PatientLoadingLogo size="xl" class="onb-welcome__logo" />
          </div>
          <img
            src="/imgs/mockup-isa.png"
            alt=""
            class="onb-welcome__mockup"
            width="486"
            height="978"
            loading="eager"
            draggable="false"
          >
        </div>
      </div>
      <h1 class="onb-title onb-title--center">Sua jornada no Clube Florescer começa aqui</h1>
      <p class="onb-sub onb-sub--center">
        Algumas perguntas rápidas para montarmos seu perfil e a nutri acompanhar sua evolução.
      </p>
    </section>

    <section v-else-if="currentStep === 'gender'" class="onb-step">
      <h1 class="onb-title">Qual é o seu gênero?</h1>
      <p class="onb-sub">Usamos isso para calibrar seu plano e metas com mais precisão.</p>
      <div class="onb-options">
        <OnboardingOptionCard
          v-for="option in genderOptions"
          :key="option.value"
          :title="option.label"
          :selected="draft.gender === option.value"
          @select="draft.gender = option.value"
        />
      </div>
    </section>

    <section v-else-if="currentStep === 'birth'" class="onb-step">
      <h1 class="onb-title">Quando você nasceu?</h1>
      <p class="onb-sub">A idade ajuda a nutricionista a interpretar metas e evolução.</p>
      <label class="onb-date-field">
        <span>Data de nascimento</span>
        <SharedCfDateInput
          v-model="draft.birthDate"
          editable
          required
          :min="minBirthDate"
          :max="maxBirthDate"
        />
      </label>
    </section>

    <section v-else-if="currentStep === 'measurements'" class="onb-step">
      <h1 class="onb-title">Altura e peso</h1>
      <p class="onb-sub">Esses dados alimentam seu perfil e o acompanhamento semanal.</p>

      <div class="onb-measure-block">
        <p class="onb-measure-label">Altura</p>
        <OnboardingHeightPicker v-model="draft.heightCm" />
      </div>

      <div class="onb-measure-block onb-measure-block--weight">
        <p class="onb-measure-label">Peso atual</p>
        <SharedWeightRulerPicker v-model="draft.weightKg" :min="40" :max="180" />
      </div>
    </section>

    <section v-else-if="currentStep === 'goal'" class="onb-step">
      <h1 class="onb-title">Qual é seu objetivo principal?</h1>
      <p class="onb-sub">Escolha o foco que mais combina com você agora.</p>
      <div class="onb-options">
        <OnboardingOptionCard
          v-for="option in goalOptions"
          :key="option.value"
          :title="option.label"
          :subtitle="option.subtitle"
          :selected="draft.primaryGoal === option.value"
          @select="draft.primaryGoal = option.value"
        />
      </div>
    </section>

    <section v-else-if="currentStep === 'workouts'" class="onb-step">
      <h1 class="onb-title">Quantos treinos você faz por semana?</h1>
      <p class="onb-sub">Isso ajuda a ajustar recomendações de movimento e energia.</p>
      <div class="onb-options">
        <OnboardingOptionCard
          v-for="option in workoutOptions"
          :key="option.value"
          :title="option.label"
          :subtitle="option.subtitle"
          :selected="draft.workoutsPerWeek === option.value"
          :icon-dots="option.dots"
          @select="draft.workoutsPerWeek = option.value"
        />
      </div>
    </section>

    <section v-else-if="currentStep === 'target-weight'" class="onb-step">
      <h1 class="onb-title">Qual é seu peso desejado?</h1>
      <p class="onb-sub">{{ targetWeightHint }}</p>
      <SharedWeightRulerPicker v-model="draft.targetWeightKg" :min="40" :max="180" />
    </section>

    <section v-else-if="currentStep === 'complete'" class="onb-step onb-step--complete">
      <div class="onb-complete-badge" aria-hidden="true">
        <Sparkles class="onb-complete-icon" />
      </div>
      <h1 class="onb-title onb-title--center">Obrigada por confiar no Clube Florescer</h1>
      <p class="onb-sub onb-sub--center">Agora vamos personalizar sua experiência com base no seu perfil.</p>

      <div class="onb-privacy-card">
        <Lock class="onb-privacy-icon" aria-hidden="true" />
        <strong>Sua privacidade importa</strong>
        <p>Seus dados ficam seguros e são usados só para seu acompanhamento nutricional.</p>
      </div>
    </section>

    <p v-if="error" class="onb-error" role="alert">{{ error }}</p>
  </OnboardingShell>
</template>

<script setup>
import { Lock, Sparkles } from 'lucide-vue-next'

definePageMeta({
  layout: 'onboarding',
  middleware: 'patient-only',
})

const router = useRouter()
const { suppress: suppressTabBar, release: releaseTabBar } = usePatientTabBar()
const { profile, fetchStatus, saveProfile } = usePatientOnboarding()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const currentStep = ref('welcome')

const draft = reactive({
  gender: null,
  birthDate: '',
  heightCm: 165,
  weightKg: null,
  targetWeightKg: null,
  primaryGoal: null,
  workoutsPerWeek: null,
})

const genderOptions = [
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
  { value: 'prefer_not_say', label: 'Prefiro não informar' },
]

const goalOptions = [
  { value: 'lose_weight', label: 'Perder peso', subtitle: 'Reduzir gordura com acompanhamento.' },
  { value: 'maintain', label: 'Manter peso', subtitle: 'Estabilidade e consistência.' },
  { value: 'gain_weight', label: 'Ganhar peso', subtitle: 'Aumento gradual e saudável.' },
  { value: 'muscle', label: 'Ganhar massa muscular', subtitle: 'Foco em composição corporal.' },
  { value: 'health', label: 'Saúde e hábitos', subtitle: 'Rotina, energia e bem-estar.' },
]

const workoutOptions = [
  {
    value: '0-2',
    label: '0–2',
    subtitle: 'Treinos de vez em quando',
    dots: [{ col: 2, row: 2 }],
  },
  {
    value: '3-5',
    label: '3–5',
    subtitle: 'Alguns treinos por semana',
    dots: [{ col: 1, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 3 }],
  },
  {
    value: '6+',
    label: '6+',
    subtitle: 'Rotina intensa de treinos',
    dots: [
      { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
      { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 },
    ],
  },
]

const flowSteps = computed(() => {
  const steps = ['gender', 'birth', 'measurements', 'goal', 'workouts']
  if (needsTargetWeight.value) steps.push('target-weight')
  steps.push('complete')
  return steps
})

const needsTargetWeight = computed(() =>
  draft.primaryGoal === 'lose_weight' || draft.primaryGoal === 'gain_weight',
)

const progressTotal = computed(() => flowSteps.value.length - 1)

const progressIndex = computed(() => {
  const index = flowSteps.value.indexOf(currentStep.value)
  return index >= 0 ? index + 1 : 0
})

const canGoBack = computed(() => currentStep.value !== 'welcome')

const showFooter = computed(() => !loading.value)

const continueLabel = computed(() => {
  if (currentStep.value === 'welcome') return 'Começar'
  if (currentStep.value === 'complete') return 'Entrar no app'
  return 'Continuar'
})

const continueDisabled = computed(() => {
  if (currentStep.value === 'gender') return !draft.gender
  if (currentStep.value === 'birth') return !draft.birthDate
  if (currentStep.value === 'measurements') return draft.heightCm == null || draft.weightKg == null
  if (currentStep.value === 'goal') return !draft.primaryGoal
  if (currentStep.value === 'workouts') return !draft.workoutsPerWeek
  if (currentStep.value === 'target-weight') return draft.targetWeightKg == null
  return false
})

const targetWeightHint = computed(() => {
  if (draft.primaryGoal === 'lose_weight') return 'Defina o peso que você quer alcançar.'
  if (draft.primaryGoal === 'gain_weight') return 'Defina o peso que você quer alcançar.'
  return 'Selecione seu peso desejado.'
})

const maxBirthDate = computed(() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 10)
  return date.toISOString().slice(0, 10)
})

const minBirthDate = '1920-01-01'

function hydrateDraftFromProfile() {
  draft.gender = profile.value.gender ?? null
  draft.birthDate = profile.value.birthDate ?? ''
  draft.heightCm = profile.value.heightCm ?? 165
  draft.weightKg = profile.value.weightKg ?? null
  draft.targetWeightKg = profile.value.targetWeightKg ?? profile.value.weightKg ?? null
  draft.primaryGoal = profile.value.primaryGoal ?? null
  draft.workoutsPerWeek = profile.value.workoutsPerWeek ?? null
}

function resolveInitialStep() {
  const hasAnyData = Boolean(
    profile.value.gender
    || profile.value.birthDate
    || profile.value.heightCm
    || profile.value.weightKg != null
    || profile.value.primaryGoal
    || profile.value.workoutsPerWeek,
  )
  if (!hasAnyData) return 'welcome'
  if (!profile.value.gender) return 'gender'
  if (!profile.value.birthDate) return 'birth'
  if (!profile.value.heightCm || profile.value.weightKg == null) return 'measurements'
  if (!profile.value.primaryGoal) return 'goal'
  if (!profile.value.workoutsPerWeek) return 'workouts'
  if (
    (profile.value.primaryGoal === 'lose_weight' || profile.value.primaryGoal === 'gain_weight')
    && profile.value.targetWeightKg == null
  ) {
    return 'target-weight'
  }
  return 'complete'
}

function goBack() {
  error.value = ''
  if (currentStep.value === 'welcome') return
  const index = flowSteps.value.indexOf(currentStep.value)
  if (index <= 0) {
    currentStep.value = 'welcome'
    return
  }
  currentStep.value = flowSteps.value[index - 1]
}

function goNext() {
  error.value = ''
  if (currentStep.value === 'welcome') {
    currentStep.value = 'gender'
    return
  }
  const index = flowSteps.value.indexOf(currentStep.value)
  if (index < 0 || index >= flowSteps.value.length - 1) return
  currentStep.value = flowSteps.value[index + 1]
}

function payloadForStep(step) {
  if (step === 'gender') return { gender: draft.gender }
  if (step === 'birth') return { birthDate: draft.birthDate }
  if (step === 'measurements') return { heightCm: draft.heightCm, weightKg: draft.weightKg }
  if (step === 'goal') return { primaryGoal: draft.primaryGoal }
  if (step === 'workouts') return { workoutsPerWeek: draft.workoutsPerWeek }
  if (step === 'target-weight') return { targetWeightKg: draft.targetWeightKg }
  return {}
}

async function handleContinue() {
  error.value = ''

  if (currentStep.value === 'complete') {
    saving.value = true
    try {
      await saveProfile({
        gender: draft.gender,
        birthDate: draft.birthDate,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        targetWeightKg: draft.targetWeightKg,
        primaryGoal: draft.primaryGoal,
        workoutsPerWeek: draft.workoutsPerWeek,
      }, { complete: true })
      await router.replace('/inicio')
    } catch (err) {
      error.value = err?.data?.message || 'Não foi possível concluir o cadastro.'
    } finally {
      saving.value = false
    }
    return
  }

  if (currentStep.value === 'welcome') {
    goNext()
    return
  }

  saving.value = true
  try {
    await saveProfile(payloadForStep(currentStep.value))
    goNext()
  } catch (err) {
    error.value = err?.data?.message || 'Não foi possível salvar. Tente novamente.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  suppressTabBar()
  loading.value = true
  try {
    await fetchStatus({ force: true })
    hydrateDraftFromProfile()
    currentStep.value = resolveInitialStep()
  } catch {
    error.value = 'Não foi possível carregar seu perfil.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  releaseTabBar()
})
</script>

<style scoped>
.onb-loading {
  width: 100%;
  padding: 2rem 0;
  text-align: center;
  color: var(--cf-text-muted);
  font-size: 0.88rem;
}

.onb-step,
.onb-welcome {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.onb-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.onb-title {
  margin: 0 0 0.55rem;
  font-size: clamp(1.55rem, 5vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.12;
  color: var(--cf-text);
  text-align: center;
}

.onb-title--center {
  text-align: center;
}

.onb-sub {
  margin: 0 0 1.35rem;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--cf-text-muted);
  text-align: center;
}

.onb-sub--center {
  text-align: center;
}

.onb-options {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.onb-welcome__hero {
  width: min(100%, 11.5rem);
  margin-bottom: 1.5rem;
}

/* mockup-isa.png — 486×978; tela transparente deixa a logo aparecer por baixo da moldura */
.onb-welcome__device {
  position: relative;
  width: 100%;
  aspect-ratio: 486 / 978;
  margin-inline: auto;
  background: #fff;
  border-radius: 14%;
  overflow: hidden;
}

.onb-welcome__screen {
  position: absolute;
  top: 5.5%;
  left: 5.5%;
  right: 5.5%;
  bottom: 6.7%;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 11%;
  overflow: visible;
  pointer-events: none;
}

.onb-welcome__screen :deep(.cf-loading-logo) {
  height: clamp(4.25rem, 58%, 7rem);
  width: auto;
}

.onb-welcome__mockup {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 2;
  pointer-events: none;
  user-select: none;
}

.onb-date-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text-muted);
}

.onb-date-field :deep(.cf-date-input) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.onb-date-field :deep(.cf-date-input-trigger) {
  border-radius: 1rem;
}

.onb-measure-block {
  margin-bottom: 1.15rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.onb-measure-block--weight {
  margin-bottom: 0;
}

.onb-measure-label {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.onb-step--complete {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.onb-complete-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5.5rem;
  height: 5.5rem;
  margin-bottom: 1.25rem;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, #eef0eb, #f8f0ed 55%, #e8f0fb);
}

.onb-complete-icon {
  width: 2rem;
  height: 2rem;
  color: var(--cf-green-dark);
}

.onb-privacy-card {
  width: 100%;
  margin-top: 1.35rem;
  padding: 1rem 1.05rem;
  border-radius: 1.15rem;
  background: #f3f4f6;
  text-align: center;
}

.onb-privacy-icon {
  width: 1.1rem;
  height: 1.1rem;
  margin-bottom: 0.55rem;
  color: var(--cf-green-dark);
}

.onb-privacy-card strong {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.88rem;
}

.onb-privacy-card p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.onb-error {
  margin: 1rem 0 0;
  padding: 0.75rem 0.85rem;
  border-radius: 0.85rem;
  background: #fef2f2;
  color: #b42318;
  font-size: 0.78rem;
  line-height: 1.4;
}
</style>
