<template>
  <div v-if="submitted" class="typeform-success">
    <div class="typeform-success-circle">
      <Check class="typeform-success-icon" aria-hidden="true" />
    </div>
    <h2 class="typeform-success-title">Enviado com sucesso!</h2>
    <p class="typeform-success-text">Suas respostas foram registradas. Redirecionando para o início…</p>
  </div>

  <div v-else class="typeform-checkin" :class="{ 'typeform-checkin--preview': preview }">
    <div
      class="typeform-progress"
      role="progressbar"
      :aria-valuenow="progressPct"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="typeform-progress-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <header class="typeform-top">
      <span class="typeform-counter">{{ stepIndex + 1 }} / {{ flowSteps.length }}</span>
    </header>

    <main class="typeform-main">
      <Transition name="typeform-slide" mode="out-in">
        <section
          :key="currentStep.id"
          class="typeform-step"
          :class="{ 'typeform-step--text': stepType === 'text' }"
        >
          <h1 class="typeform-question">{{ currentStep.question }}</h1>
          <p v-if="currentStep.hint" class="typeform-hint">{{ currentStep.hint }}</p>

          <div class="typeform-answer">
            <CheckinFoodMoodPicker
              v-if="stepType === 'food'"
              :model-value="form[currentStep.id]"
              @update:model-value="(v) => selectValue(currentStep.id, v, true)"
            />

            <div v-else-if="stepType === 'water'" class="typeform-water">
              <div class="typeform-water-control">
                <button
                  type="button"
                  class="typeform-water-btn"
                  :aria-label="`Remover ${formatStepperValue(stepperConfig.step)} litro`"
                  @click="adjustWater(-stepperConfig.step)"
                >
                  −
                </button>
                <div class="typeform-water-value">
                  <strong>{{ formatWaterLiters(form[currentStep.id]) }}</strong>
                  <span>{{ waterUnitLabel }}</span>
                </div>
                <button
                  type="button"
                  class="typeform-water-btn"
                  :aria-label="`Adicionar ${formatStepperValue(stepperConfig.step)} litro`"
                  @click="adjustWater(stepperConfig.step)"
                >
                  +
                </button>
              </div>
              <p v-if="stepperHint" class="typeform-water-hint">{{ stepperHint }}</p>
            </div>

            <div v-else-if="stepType === 'number'" class="typeform-water">
              <div class="typeform-water-control">
                <button
                  type="button"
                  class="typeform-water-btn"
                  :aria-label="`Diminuir ${formatStepperValue(stepperConfig.step)}`"
                  @click="adjustStepper(-stepperConfig.step)"
                >
                  −
                </button>
                <div class="typeform-water-value">
                  <strong>{{ formatStepperValue(form[currentStep.id]) }}</strong>
                  <span v-if="waterUnitLabel">{{ waterUnitLabel }}</span>
                </div>
                <button
                  type="button"
                  class="typeform-water-btn"
                  :aria-label="`Aumentar ${formatStepperValue(stepperConfig.step)}`"
                  @click="adjustStepper(stepperConfig.step)"
                >
                  +
                </button>
              </div>
              <p v-if="stepperHint" class="typeform-water-hint">{{ stepperHint }}</p>
            </div>

            <div v-else-if="stepType === 'exercise'" class="typeform-choices">
              <button
                type="button"
                class="typeform-choice"
                :class="{ 'typeform-choice--selected': form[currentStep.id] === true }"
                @click="selectValue(currentStep.id, true, true)"
              >
                <span class="typeform-choice-label">{{ currentStep.yesLabel }}</span>
                <span class="typeform-choice-check" aria-hidden="true">
                  <Check class="typeform-choice-check-icon" />
                </span>
              </button>
              <button
                type="button"
                class="typeform-choice"
                :class="{ 'typeform-choice--selected': form[currentStep.id] === false }"
                @click="selectValue(currentStep.id, false, true)"
              >
                <span class="typeform-choice-label">{{ currentStep.noLabel }}</span>
                <span class="typeform-choice-check" aria-hidden="true">
                  <Check class="typeform-choice-check-icon" />
                </span>
              </button>
            </div>

            <div
              v-else-if="stepType === 'scale'"
              class="typeform-stars"
              role="group"
              :aria-label="currentStep.question"
            >
              <button
                v-for="n in scaleRange"
                :key="n"
                type="button"
                class="typeform-star"
                :class="{ 'typeform-star--filled': (form[currentStep.id] || 0) >= n }"
                :aria-label="`${n} ${n === 1 ? 'estrela' : 'estrelas'}`"
                :aria-pressed="(form[currentStep.id] || 0) >= n"
                @click="selectScale(n)"
              >
                ★
              </button>
            </div>

            <div v-else-if="stepType === 'choice'" class="typeform-choices">
              <button
                v-for="option in choiceOptions"
                :key="option.value"
                type="button"
                class="typeform-choice"
                :class="{ 'typeform-choice--selected': form[currentStep.id] === option.value }"
                @click="selectValue(currentStep.id, option.value, true)"
              >
                <span class="typeform-choice-label">{{ option.label }}</span>
                <span class="typeform-choice-check" aria-hidden="true">
                  <Check class="typeform-choice-check-icon" />
                </span>
              </button>
            </div>

            <div v-else-if="stepType === 'text'" class="typeform-text">
              <div class="typeform-text-field">
                <textarea
                  ref="textAnswerRef"
                  v-model="form[currentStep.id]"
                  rows="1"
                  class="typeform-textarea"
                  :placeholder="currentStep.placeholder"
                  @input="resizeTextAnswer"
                />
              </div>
              <button
                type="button"
                class="typeform-submit"
                :disabled="submitActionDisabled"
                @click="handleOk"
              >
                <Loader2 v-if="saving" class="typeform-submit-spinner" aria-hidden="true" />
                <span>{{ okLabel }}</span>
              </button>
            </div>
          </div>
        </section>
      </Transition>
    </main>

    <footer
      v-if="stepIndex > 0 || showFootOkButton"
      class="typeform-foot"
      :class="{ 'typeform-foot--split': stepIndex > 0 && showFootOkButton }"
    >
      <button
        v-if="stepIndex > 0"
        type="button"
        class="typeform-back typeform-back--foot"
        aria-label="Voltar"
        @click="prevStep"
      >
        <ChevronUp aria-hidden="true" />
        <span>Voltar</span>
      </button>

      <div v-if="showFootOkButton" class="typeform-foot-ok">
        <button
          type="button"
          class="typeform-ok"
          :disabled="submitActionDisabled"
          :aria-label="okLabel"
          @click="handleOk"
        >
          <Loader2 v-if="saving" class="typeform-ok-spinner" aria-hidden="true" />
          <ArrowRight v-else-if="!isLastStep" aria-hidden="true" />
          <Check v-else aria-hidden="true" />
        </button>
        <span class="typeform-ok-hint">{{ okHint }}</span>
      </div>
    </footer>

    <div v-if="saving && !submitted" class="typeform-busy" aria-live="polite" aria-busy="true">
      <Loader2 class="typeform-busy-spinner" aria-hidden="true" />
      <p>Enviando check-in...</p>
    </div>

    <p v-if="preview && isLastStep && canAdvance" class="typeform-preview-note">
      Fim da prévia — no app o paciente envia aqui.
    </p>

    <p v-if="error" class="typeform-error">{{ error }}</p>
    <NuxtLink v-if="showHistoryLink && stepIndex === 0 && !preview" to="/check-in/historico" class="typeform-history-link">
      Ver histórico
    </NuxtLink>
  </div>
</template>

<script setup>
import { ArrowRight, Check, ChevronUp, Loader2 } from 'lucide-vue-next'
import { CHECKIN_DEFAULT_STEPS } from '~/utils/checkin-default-steps'
import { normalizeFlowStep } from '~/utils/checkin-step-schema'

const props = defineProps({
  steps: { type: Array, default: () => CHECKIN_DEFAULT_STEPS },
  saving: { type: Boolean, default: false },
  submitted: { type: Boolean, default: false },
  error: { type: String, default: '' },
  showHistoryLink: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
  initialStepIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['submit', 'step-change'])

const form = reactive({})
const stepIndex = ref(0)
const submitLocked = ref(false)
const textAnswerRef = ref(null)

const flowSteps = computed(() => {
  const list = props.steps?.length ? props.steps : CHECKIN_DEFAULT_STEPS
  return list.map((step, index) => normalizeFlowStep(step, index))
})

const currentStep = computed(() => flowSteps.value[stepIndex.value] || flowSteps.value[0])
const stepType = computed(() => currentStep.value.type)
const isLastStep = computed(() => stepIndex.value === flowSteps.value.length - 1)
const progressPct = computed(() => Math.round(((stepIndex.value + 1) / flowSteps.value.length) * 100))

const scaleMin = computed(() => Math.max(0, Number(currentStep.value.min) || 1))
const scaleMax = computed(() => Math.max(scaleMin.value, Number(currentStep.value.max) || 5))
const scaleRange = computed(() => {
  const values = []
  for (let n = scaleMin.value; n <= scaleMax.value; n += 1) values.push(n)
  return values
})

const stepperConfig = computed(() => {
  const step = currentStep.value
  const min = Number(step.min)
  const max = Number(step.max)
  const increment = Number(step.step)
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 5,
    step: Number.isFinite(increment) && increment > 0 ? increment : 0.25,
    defaultValue: Number.isFinite(Number(step.defaultValue)) ? Number(step.defaultValue) : 0,
    unit: step.unit || '',
  }
})

const stepperHint = computed(() => {
  const { step } = stepperConfig.value
  if (stepType.value === 'water') {
    const label = step % 1 === 0 ? `${step} L` : `${String(step).replace('.', ',')} L`
    return `+${label} por toque`
  }
  if (stepType.value === 'number') {
    const unit = currentStep.value.unit ? ` ${currentStep.value.unit}` : ''
    return `+${formatStepperValue(step)}${unit} por toque`
  }
  return ''
})

const choiceOptions = computed(() => {
  const raw = currentStep.value.options
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (typeof item === 'string') return { value: item, label: item }
    const value = item?.value ?? item?.label ?? `opt_${index}`
    return { value, label: item?.label ?? String(value) }
  })
})

const showFootOkButton = computed(() => {
  if (stepType.value === 'text') return false
  return stepType.value === 'water' || stepType.value === 'number' || isLastStep.value
})

const canUseOkAction = computed(
  () => stepType.value === 'text' || stepType.value === 'water' || stepType.value === 'number' || isLastStep.value,
)

const canAdvance = computed(() => {
  const id = currentStep.value.id
  const type = stepType.value
  const value = form[id]
  if (type === 'food' || type === 'exercise' || type === 'scale' || type === 'choice') {
    return value != null
  }
  if (type === 'water' || type === 'number') return Number(value) >= stepperConfig.value.min
  if (type === 'text') return String(value || '').trim().length > 0
  return false
})

const actionLocked = computed(() => props.saving || props.submitted || submitLocked.value)

/** Na prévia o botão fica ativo para mostrar o visual real do PWA. */
const submitActionDisabled = computed(() => {
  if (actionLocked.value) return true
  if (props.preview) return false
  return !canAdvance.value
})

const okLabel = computed(() => {
  if (props.saving) return 'Salvando...'
  if (isLastStep.value) return 'Responder'
  return 'Avançar'
})

const okHint = computed(() => {
  if (props.saving) return 'Enviando...'
  if (isLastStep.value) return 'concluir'
  return 'continuar'
})

const waterUnitLabel = computed(() => {
  const value = Number(form[currentStep.value.id] ?? 0)
  if (stepType.value === 'water') return value === 1 ? 'litro' : 'litros'
  const unit = currentStep.value.unit?.trim()
  return unit || ''
})

function formatStepperValue(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  if (rounded % 1 === 0) return String(rounded)
  return rounded.toFixed(2).replace(/0$/, '').replace(/\.$/, '').replace('.', ',')
}

function formatWaterLiters(value) {
  return formatStepperValue(value)
}

function adjustStepper(delta) {
  const id = currentStep.value.id
  const { min, max, step } = stepperConfig.value
  const next = Math.round(((form[id] || 0) + delta) * 100) / 100
  form[id] = Math.max(min, Math.min(max, next))
}

function adjustWater(delta) {
  adjustStepper(delta)
}

function initForm() {
  for (const key of Object.keys(form)) delete form[key]
  for (const step of flowSteps.value) {
    if (step.type === 'water' || step.type === 'number') {
      form[step.id] = Number.isFinite(Number(step.defaultValue)) ? Number(step.defaultValue) : stepperConfigForStep(step).defaultValue
    } else {
      form[step.id] = null
    }
  }
  stepIndex.value = 0
  submitLocked.value = false
}

function stepperConfigForStep(step) {
  const min = Number(step.min)
  const max = Number(step.max)
  const increment = Number(step.step)
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 5,
    step: Number.isFinite(increment) && increment > 0 ? increment : 0.25,
    defaultValue: Number.isFinite(Number(step.defaultValue)) ? Number(step.defaultValue) : 0,
  }
}

watch(flowSteps, () => {
  if (props.saving || props.submitted) return
  const previousId = flowSteps.value[stepIndex.value]?.id
  initForm()
  if (props.preview) {
    const fromProp = Math.min(Math.max(0, props.initialStepIndex), Math.max(0, flowSteps.value.length - 1))
    const fromId = previousId
      ? flowSteps.value.findIndex((step) => step.id === previousId)
      : -1
    stepIndex.value = fromId >= 0 ? fromId : fromProp
    emitStepChange()
  }
}, { immediate: true, deep: true })

watch(() => props.initialStepIndex, (index) => {
  if (!props.preview) return
  const next = Math.min(Math.max(0, index), Math.max(0, flowSteps.value.length - 1))
  if (next !== stepIndex.value) stepIndex.value = next
})

watch(stepIndex, () => {
  if (props.preview) emitStepChange()
  nextTick(() => resizeTextAnswer())
})

watch(
  () => (stepType.value === 'text' ? form[currentStep.value?.id] : null),
  () => nextTick(() => resizeTextAnswer()),
)

function emitStepChange() {
  emit('step-change', stepIndex.value)
}

function resizeTextAnswer(event) {
  const el = event?.target ?? textAnswerRef.value
  if (!el) return

  const value = String(el.value ?? '').trim()
  if (props.preview && !value) {
    el.style.height = ''
    return
  }

  const style = getComputedStyle(el)
  const fontSize = Number.parseFloat(style.fontSize) || 16
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.4
  const padBottom = Number.parseFloat(style.paddingBottom) || 0
  const minHeight = lineHeight + padBottom + 3

  el.style.height = 'auto'
  el.style.height = `${Math.ceil(Math.max(minHeight, el.scrollHeight + 3))}px`
}

watch(() => props.saving, (isSaving) => {
  if (!isSaving && !props.submitted && props.error) {
    submitLocked.value = false
  }
})

function buildPayload() {
  const payload = {}
  for (const step of flowSteps.value) {
    payload[step.id] = form[step.id]
  }
  return payload
}

function prevStep() {
  if (stepIndex.value > 0) stepIndex.value -= 1
}

function nextStep() {
  if (!canAdvance.value || stepIndex.value >= flowSteps.value.length - 1) return
  stepIndex.value += 1
}

function submitNow() {
  if (props.preview) return
  if (props.saving || props.submitted || submitLocked.value) return
  if (!canAdvance.value) return
  submitLocked.value = true
  emit('submit', buildPayload())
}

watch(() => [props.saving, props.error, props.submitted], () => {
  if (props.submitted) return
  if (!props.saving && props.error) submitLocked.value = false
})

function handleOk() {
  if (!canAdvance.value || props.saving || props.submitted || submitLocked.value) return
  if (isLastStep.value) {
    if (props.preview) return
    submitNow()
    return
  }
  nextStep()
}

function autoAdvance() {
  if (props.saving || isLastStep.value || !canAdvance.value) return
  window.setTimeout(() => {
    if (canAdvance.value) nextStep()
  }, 320)
}

function scheduleLastStepSubmit() {
  if (props.preview) return
  window.setTimeout(() => {
    submitNow()
  }, 280)
}

function selectValue(id, value, advance = false) {
  if (props.saving || props.submitted || submitLocked.value) return
  form[id] = value
  if (isLastStep.value) {
    if (!props.preview) scheduleLastStepSubmit()
    return
  }
  if (advance) autoAdvance()
}

function selectScale(value) {
  if (props.saving || props.submitted || submitLocked.value) return
  form[currentStep.value.id] = value
  if (isLastStep.value) {
    if (!props.preview) scheduleLastStepSubmit()
    return
  }
  autoAdvance()
}

function onKeydown(event) {
  if (event.key !== 'Enter') return
  if (!canUseOkAction.value) return
  if (stepType.value === 'text') {
    if (!event.ctrlKey && !event.metaKey) return
  }
  event.preventDefault()
  handleOk()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  nextTick(() => resizeTextAnswer())
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.typeform-success {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  width: 100%;
  padding: 2rem 1rem calc(2rem + env(safe-area-inset-bottom, 0px));
  padding-top: calc(2rem + env(safe-area-inset-top, 0px));
  text-align: center;
  background: var(--cf-bg);
  box-sizing: border-box;
}

.typeform-success-circle {
  width: 5rem;
  height: 5rem;
  margin-bottom: 1.25rem;
  border-radius: 50%;
  background: var(--cf-green, var(--cf-pink));
  display: flex;
  align-items: center;
  justify-content: center;
}

.typeform-success-icon {
  width: 2.35rem;
  height: 2.35rem;
  color: #fff;
  stroke-width: 2.5;
}

.typeform-success-title {
  margin: 0 0 0.65rem;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.typeform-success-text {
  margin: 0;
  max-width: 20rem;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--cf-text-muted);
}

.typeform-checkin {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  height: 100%;
  max-height: 100%;
  padding-top: calc(0.65rem + env(safe-area-inset-top, 0px));
  padding-inline: clamp(0.65rem, 5.5vw, 1.25rem);
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: var(--cf-bg);
}

.typeform-progress {
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
  height: 3px;
  margin: 0;
  background: var(--cf-track);
}

.typeform-progress-fill {
  height: 100%;
  background: var(--cf-pink);
  transition: width 0.35s ease;
}

.typeform-top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0.15rem 0.1rem 0.1rem;
}

.typeform-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
  font-family: inherit;
}

.typeform-back--foot {
  flex-shrink: 0;
  gap: 0.35rem;
  height: auto;
  width: auto;
  padding: 0.4rem 0.55rem;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.2;
}

.typeform-back--foot :deep(svg) {
  width: 1.05rem;
  height: 1.05rem;
}

.typeform-back:active {
  background: var(--cf-track);
}

.typeform-counter {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  font-variant-numeric: tabular-nums;
  padding-right: 0.05rem;
}

.typeform-main {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding: 0.5rem 0;
  min-height: 0;
  overflow-y: auto;
}

.typeform-main > * {
  width: 100%;
}

.typeform-step {
  width: 100%;
  max-width: none;
  margin-block: auto;
  margin-inline: auto;
  text-align: center;
}

.typeform-answer {
  width: 100%;
}

.typeform-kicker {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cf-pink-dark);
  text-align: center;
}

.typeform-question {
  margin: 0 0 0.45rem;
  font-size: clamp(1.65rem, 6vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.18;
  color: var(--cf-text);
  text-wrap: balance;
  text-align: center;
}

.typeform-hint {
  margin: 0 auto 2rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.55;
  color: var(--cf-text-muted);
  max-width: none;
  text-align: center;
}

.typeform-choices {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.typeform-choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 10px;
  background: var(--cf-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
}

.typeform-choice-label {
  flex: 1;
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--cf-text);
  line-height: 1.35;
}

.typeform-choice-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #c5c9c5;
  color: #fff;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.12s ease;
}

.typeform-choice-check-icon {
  width: 0.82rem;
  height: 0.82rem;
  stroke-width: 3;
}

.typeform-choice:active {
  transform: scale(0.995);
}

.typeform-choice--selected {
  border-color: #b8d4b4;
  background: var(--cf-pink-soft);
}

.typeform-choice--selected .typeform-choice-check {
  background: #62b054;
}

.typeform-choice--selected:active .typeform-choice-check {
  transform: scale(0.94);
}

.typeform-stars {
  display: flex;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.35rem 0;
}

.typeform-star {
  border: none;
  background: none;
  font-size: 2.35rem;
  color: var(--cf-track);
  cursor: pointer;
  line-height: 1;
  padding: 0.2rem;
  transition: transform 0.12s ease, color 0.12s ease;
}

.typeform-star--filled {
  color: #e8a54b;
}

.typeform-star:active {
  transform: scale(0.9);
}

.typeform-water-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.25rem 0;
}

.typeform-water-value {
  text-align: center;
  min-width: 5rem;
}

.typeform-water-btn {
  width: 2.75rem;
  height: 2.75rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 4px;
  background: var(--cf-surface);
  color: var(--cf-text);
  font-size: 1.35rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
}

.typeform-water-btn:active {
  background: var(--cf-track);
}

.typeform-water-value strong {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--cf-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.typeform-water-value span {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--cf-text-muted);
}

.typeform-water {
  text-align: center;
}

.typeform-water-hint {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--cf-text-muted);
  text-align: center;
}

.typeform-step--text {
  text-align: left;
}

.typeform-step--text .typeform-kicker,
.typeform-step--text .typeform-question,
.typeform-step--text .typeform-hint {
  text-align: left;
}

.typeform-step--text .typeform-question {
  margin-bottom: 0.35rem;
}

.typeform-text {
  width: 100%;
  max-width: 100%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.typeform-text-field {
  width: 100%;
  padding-bottom: 0.22rem;
  border-bottom: 2px solid color-mix(in srgb, var(--cf-pink-dark) 38%, var(--cf-border));
  transition: border-color 0.2s ease;
}

.typeform-text-field:focus-within {
  border-bottom-color: var(--cf-pink-dark);
}

.typeform-textarea {
  display: block;
  width: 100%;
  max-width: 100%;
  min-height: calc(1.4em + 0.1rem);
  height: auto;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  font-family: inherit;
  font-size: clamp(1.15rem, 4.8vw, 1.4rem);
  font-weight: 500;
  line-height: 1.4;
  color: var(--cf-pink-dark);
  text-align: left;
  vertical-align: top;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;
  outline: none;
  box-shadow: none;
  -webkit-appearance: none;
  appearance: none;
  transition: color 0.2s ease;
}

.typeform-textarea::placeholder {
  color: color-mix(in srgb, var(--cf-pink-dark) 52%, var(--cf-text-muted));
  opacity: 1;
}

.typeform-textarea:focus,
.typeform-textarea:focus-visible {
  outline: none;
  box-shadow: none;
  color: var(--cf-pink-dark);
}

.typeform-textarea:-webkit-autofill,
.typeform-textarea:-webkit-autofill:hover,
.typeform-textarea:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px var(--cf-bg) inset;
  box-shadow: 0 0 0 1000px var(--cf-bg) inset;
  -webkit-text-fill-color: var(--cf-pink-dark);
}

.typeform-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: auto;
  min-width: 6.5rem;
  align-self: flex-start;
  margin-top: 0.85rem;
  padding: 0.58rem 1rem;
  border: none;
  border-radius: 0.65rem;
  background: var(--cf-pink);
  color: #fff;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.15;
  cursor: pointer;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--cf-pink) 28%, transparent);
  transition:
    background 0.15s ease,
    opacity 0.15s ease,
    transform 0.12s ease,
    box-shadow 0.15s ease;
}

.typeform-submit-spinner {
  width: 0.95rem;
  height: 0.95rem;
  animation: typeform-spin 0.85s linear infinite;
}

.typeform-submit:active:not(:disabled) {
  transform: translateY(1px);
  background: var(--cf-pink-dark);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--cf-pink-dark) 28%, transparent);
}

.typeform-submit:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  box-shadow: none;
}

.typeform-foot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  width: 100%;
  padding: 0.25rem 0.15rem 0 0;
  margin-top: auto;
  box-sizing: border-box;
}

.typeform-foot--split {
  justify-content: space-between;
}

.typeform-foot:not(.typeform-foot--split) .typeform-back--foot {
  margin-right: auto;
}

.typeform-foot-ok {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-shrink: 0;
}

.typeform-ok-hint {
  order: 2;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--cf-text-muted);
}

.typeform-ok {
  order: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 4px;
  background: var(--cf-pink);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease, transform 0.12s ease;
}

.typeform-ok :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2.5;
}

.typeform-ok-spinner {
  animation: typeform-spin 0.85s linear infinite;
}

@keyframes typeform-spin {
  to { transform: rotate(360deg); }
}

.typeform-ok:active:not(:disabled) {
  transform: scale(0.96);
  background: var(--cf-pink-dark);
}

.typeform-ok:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.typeform-error {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pa-red, #d64545);
  text-align: center;
}

.typeform-busy {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  text-align: center;
  padding: 1.5rem;
}

.typeform-busy-spinner {
  width: 2.25rem;
  height: 2.25rem;
  color: var(--cf-pink);
  animation: typeform-spin 0.85s linear infinite;
}

.typeform-busy p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--cf-text);
}

.typeform-history-link {
  display: block;
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  text-decoration: none;
}

.typeform-slide-enter-active,
.typeform-slide-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.typeform-slide-enter-from {
  opacity: 0;
  transform: translateY(18px);
}

.typeform-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .typeform-progress-fill,
  .typeform-slide-enter-active,
  .typeform-slide-leave-active,
  .typeform-choice,
  .typeform-star,
  .typeform-ok {
    transition: none;
  }

  .typeform-slide-enter-from,
  .typeform-slide-leave-to,
  .typeform-choice:active,
  .typeform-star:active,
  .typeform-ok:active:not(:disabled) {
    transform: none;
  }
}

.typeform-checkin--preview {
  flex: 1;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  width: 100%;
  padding-top: 0.65rem;
  padding-inline: clamp(0.35rem, 5.5vw, 0.65rem);
  padding-bottom: 0.45rem;
  box-sizing: border-box;
  background: #fff;
}

.typeform-checkin--preview .typeform-top {
  padding: 0.15rem 0.1rem 0.1rem;
}

.typeform-checkin--preview .typeform-counter {
  font-size: 0.68rem;
  padding-right: 0.05rem;
}

.typeform-checkin--preview .typeform-progress {
  margin: 0;
  border-radius: 999px;
}

.typeform-checkin--preview .typeform-main {
  flex: 1;
  min-height: 0;
  padding: 0.35rem 0;
}

.typeform-checkin--preview .typeform-step--text .typeform-question {
  margin-bottom: 0.18rem;
  font-size: 0.82rem;
  line-height: 1.2;
}

.typeform-checkin--preview .typeform-step--text .typeform-kicker {
  margin-bottom: 0.3rem;
  font-size: 0.58rem;
}

.typeform-checkin--preview .typeform-text-field {
  border-bottom-width: 1.5px;
  padding-bottom: 0.18rem;
}

.typeform-checkin--preview .typeform-textarea {
  font-size: 0.72rem;
  line-height: 1.45;
  min-height: calc(1.45em + 0.12rem);
  height: auto;
  padding: 0;
}

.typeform-checkin--preview .typeform-submit {
  margin-top: 0.45rem;
  min-width: 4.25rem;
  padding: 0.34rem 0.6rem;
  font-size: 0.64rem;
  border-radius: 0.4rem;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--cf-pink) 24%, transparent);
}

.typeform-checkin--preview .typeform-submit:disabled {
  opacity: 1;
  background: var(--cf-pink);
  color: #fff;
  cursor: pointer;
}

.typeform-checkin--preview .typeform-submit-spinner {
  width: 0.65rem;
  height: 0.65rem;
}

.typeform-checkin--preview .typeform-ok:disabled {
  opacity: 0.42;
}

.typeform-checkin--preview .typeform-step {
  margin-block: auto;
  max-width: none;
}

.typeform-checkin--preview .typeform-foot {
  padding: 0.25rem 0.15rem 0 0;
  margin-top: auto;
  gap: 0.4rem;
}

.typeform-checkin--preview .typeform-back--foot {
  padding: 0.2rem 0.35rem;
  font-size: 0.62rem;
  gap: 0.25rem;
}

.typeform-checkin--preview .typeform-back--foot :deep(svg) {
  width: 0.78rem;
  height: 0.78rem;
}

.typeform-checkin--preview .typeform-foot-ok {
  gap: 0.4rem;
}

.typeform-checkin--preview .typeform-kicker {
  margin-bottom: 0.35rem;
  font-size: 0.62rem;
}

.typeform-checkin--preview .typeform-question {
  margin-bottom: 0.25rem;
  font-size: 1.05rem;
}

.typeform-checkin--preview .typeform-hint {
  margin-bottom: 0.75rem;
  font-size: 0.72rem;
  max-width: none;
}

.typeform-checkin--preview .typeform-choice {
  min-height: 2.35rem;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
}

.typeform-checkin--preview .typeform-choice-check {
  width: 1.2rem;
  height: 1.2rem;
}

.typeform-checkin--preview .typeform-choice-check-icon {
  width: 0.68rem;
  height: 0.68rem;
}

.typeform-checkin--preview .typeform-choice-label {
  font-size: 0.72rem;
}

.typeform-checkin--preview .typeform-star {
  font-size: 1.45rem;
}

.typeform-checkin--preview .typeform-water-value strong {
  font-size: 2.1rem;
}

.typeform-checkin--preview .typeform-water-hint {
  font-size: 0.62rem;
}

.typeform-checkin--preview .typeform-ok {
  width: 2.35rem;
  height: 2.35rem;
}

.typeform-checkin--preview .typeform-ok-hint {
  font-size: 0.58rem;
  white-space: nowrap;
}

.typeform-preview-note {
  margin: 0.35rem 0 0;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: var(--cf-pink-soft, #faecef);
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  color: var(--cf-pink-dark, #a06267);
}
</style>
