<template>
  <div class="typeform-checkin">
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
      <button
        v-if="stepIndex > 0"
        type="button"
        class="typeform-back"
        aria-label="Voltar"
        @click="prevStep"
      >
        <ChevronUp aria-hidden="true" />
      </button>
      <span v-else class="typeform-back-spacer" aria-hidden="true" />
      <span class="typeform-counter">{{ stepIndex + 1 }} / {{ flowSteps.length }}</span>
    </header>

    <main class="typeform-main">
      <Transition name="typeform-slide" mode="out-in">
        <section :key="currentStep.id" class="typeform-step">
          <p class="typeform-kicker">{{ currentStep.label }}</p>
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
                  aria-label="Remover um copo"
                  @click="form[currentStep.id] = Math.max(0, (form[currentStep.id] || 0) - 1)"
                >
                  −
                </button>
                <div class="typeform-water-value">
                  <strong>{{ form[currentStep.id] ?? 0 }}</strong>
                  <span>{{ (form[currentStep.id] ?? 0) === 1 ? 'copo' : 'copos' }}</span>
                </div>
                <button
                  type="button"
                  class="typeform-water-btn"
                  aria-label="Adicionar um copo"
                  @click="form[currentStep.id] = Math.min(12, (form[currentStep.id] || 0) + 1)"
                >
                  +
                </button>
              </div>
            </div>

            <div v-else-if="stepType === 'exercise'" class="typeform-choices">
              <button
                type="button"
                class="typeform-choice"
                :class="{ 'typeform-choice--selected': form[currentStep.id] === true }"
                @click="selectValue(currentStep.id, true, true)"
              >
                <span class="typeform-choice-label">Sim, pratiquei hoje</span>
              </button>
              <button
                type="button"
                class="typeform-choice"
                :class="{ 'typeform-choice--selected': form[currentStep.id] === false }"
                @click="selectValue(currentStep.id, false, true)"
              >
                <span class="typeform-choice-label">Não pratiquei hoje</span>
              </button>
            </div>

            <div
              v-else-if="stepType === 'scale'"
              class="typeform-stars"
              role="group"
              :aria-label="currentStep.label"
            >
              <button
                v-for="n in scaleMax"
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
              </button>
            </div>

            <div v-else class="typeform-text">
              <textarea
                v-model="form[currentStep.id]"
                rows="4"
                class="typeform-textarea"
                :placeholder="currentStep.hint || 'Digite sua resposta...'"
              />
            </div>
          </div>
        </section>
      </Transition>
    </main>

    <footer v-if="showOkButton" class="typeform-foot">
      <button
        type="button"
        class="typeform-ok"
        :disabled="!canAdvance || saving"
        :aria-label="okLabel"
        @click="handleOk"
      >
        <ArrowRight v-if="!isLastStep && !saving" aria-hidden="true" />
        <Check v-else-if="!saving" aria-hidden="true" />
      </button>
      <span class="typeform-ok-hint">{{ okHint }}</span>
    </footer>

    <p v-if="error" class="typeform-error">{{ error }}</p>
    <NuxtLink v-if="showHistoryLink && stepIndex === 0" to="/check-in/historico" class="typeform-history-link">
      Ver histórico
    </NuxtLink>
  </div>
</template>

<script setup>
import { ArrowRight, Check, ChevronUp } from 'lucide-vue-next'
import { CHECKIN_DEFAULT_STEPS } from '~/utils/checkin-default-steps'

const props = defineProps({
  steps: { type: Array, default: () => CHECKIN_DEFAULT_STEPS },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  showHistoryLink: { type: Boolean, default: false },
})

const emit = defineEmits(['submit'])

const form = reactive({})
const stepIndex = ref(0)

const flowSteps = computed(() => {
  const list = props.steps?.length ? props.steps : CHECKIN_DEFAULT_STEPS
  return list.map((step, index) => ({
    id: step.id || `step_${index + 1}`,
    type: step.type || step.id || 'text',
    label: step.label || `Pergunta ${index + 1}`,
    question: step.question || '',
    hint: step.hint || '',
    min: step.min ?? 1,
    max: step.max ?? 5,
    options: step.options,
  }))
})

const currentStep = computed(() => flowSteps.value[stepIndex.value] || flowSteps.value[0])
const stepType = computed(() => currentStep.value.type)
const isLastStep = computed(() => stepIndex.value === flowSteps.value.length - 1)
const progressPct = computed(() => Math.round(((stepIndex.value + 1) / flowSteps.value.length) * 100))
const scaleMax = computed(() => Math.max(1, Number(currentStep.value.max) || 5))

const choiceOptions = computed(() => {
  const raw = currentStep.value.options
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (typeof item === 'string') return { value: item, label: item }
    const value = item?.value ?? item?.label ?? `opt_${index}`
    return { value, label: item?.label ?? String(value) }
  })
})

const showOkButton = computed(() => stepType.value === 'water' || stepType.value === 'text')

const canAdvance = computed(() => {
  const id = currentStep.value.id
  const type = stepType.value
  const value = form[id]
  if (type === 'food' || type === 'exercise' || type === 'scale' || type === 'choice') {
    return value != null
  }
  if (type === 'water') return Number(value) >= 0
  if (type === 'text') return String(value || '').trim().length > 0
  return false
})

const okLabel = computed(() => {
  if (props.saving) return 'Salvando'
  if (isLastStep.value) return 'Concluir check-in'
  return 'Continuar'
})

const okHint = computed(() => (props.saving ? 'Salvando...' : 'continuar'))

function initForm() {
  for (const key of Object.keys(form)) delete form[key]
  for (const step of flowSteps.value) {
    form[step.id] = step.type === 'water' ? 6 : null
  }
  stepIndex.value = 0
}

watch(flowSteps, initForm, { immediate: true, deep: true })

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
  if (props.saving) return
  emit('submit', buildPayload())
}

function handleOk() {
  if (!canAdvance.value || props.saving) return
  if (isLastStep.value) {
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

function selectValue(id, value, advance = false) {
  form[id] = value
  if (isLastStep.value) {
    window.setTimeout(submitNow, 320)
    return
  }
  if (advance) autoAdvance()
}

function selectScale(value) {
  form[currentStep.value.id] = value
  if (isLastStep.value) {
    window.setTimeout(submitNow, 320)
    return
  }
  autoAdvance()
}

function onKeydown(event) {
  if (event.key !== 'Enter') return
  if (!showOkButton.value) return
  event.preventDefault()
  handleOk()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.typeform-checkin {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 1.35rem 0.5rem;
  box-sizing: border-box;
  background: var(--cf-bg);
}

.typeform-progress {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 3px;
  margin: 0 -1.35rem;
  background: var(--cf-track);
}

.typeform-progress-fill {
  height: 100%;
  background: var(--cf-pink);
  transition: width 0.35s ease;
}

.typeform-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 0 0.25rem;
}

.typeform-back-spacer {
  width: 2rem;
  height: 2rem;
}

.typeform-back {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
}

.typeform-back :deep(svg) {
  width: 1.15rem;
  height: 1.15rem;
}

.typeform-back:active {
  background: var(--cf-track);
}

.typeform-counter {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cf-text-muted);
  font-variant-numeric: tabular-nums;
}

.typeform-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  min-height: 0;
  overflow-y: auto;
}

.typeform-step {
  width: 100%;
  max-width: 26rem;
  margin-inline: auto;
  text-align: center;
}

.typeform-kicker {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cf-pink-dark);
  text-align: center;
}

.typeform-question {
  margin: 0 0 1rem;
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
  max-width: 32ch;
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
  gap: 0.85rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 4px;
  background: var(--cf-surface);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
}

.typeform-choice:active {
  transform: scale(0.995);
}

.typeform-choice--selected {
  border-color: var(--cf-pink);
  background: var(--cf-pink-soft);
}

.typeform-choice-label {
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--cf-text);
  line-height: 1.35;
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

.typeform-textarea {
  width: 100%;
  min-height: 7rem;
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-surface);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--cf-text);
  resize: vertical;
  box-sizing: border-box;
}

.typeform-foot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  width: 100%;
  padding: 0.75rem 0 0.25rem;
  margin-top: auto;
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
</style>
