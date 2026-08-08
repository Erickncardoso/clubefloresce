'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ArrowRight, Check, ChevronUp, Loader2 } from 'lucide-react'
import {
  normalizeFlowStep,
  type FlowStep,
  type StepApiPayload,
} from '@/lib/checkin-step-schema'
import { FoodMoodPicker } from './FoodMoodPicker'
import styles from './CheckinTypeformFlow.module.scss'

type Props = {
  steps?: Array<Partial<StepApiPayload> & Record<string, unknown>>
  preview?: boolean
  initialStepIndex?: number
  saving?: boolean
  submitted?: boolean
  error?: string
  onStepChange?: (index: number) => void
  onSubmit?: (answers: Record<string, unknown>) => void
}

function formatStepperValue(value: unknown) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  if (rounded % 1 === 0) return String(rounded)
  return rounded
    .toFixed(2)
    .replace(/0$/, '')
    .replace(/\.$/, '')
    .replace('.', ',')
}

function stepperConfigForStep(step: FlowStep) {
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
}

export function CheckinTypeformFlow({
  steps = [],
  preview = false,
  initialStepIndex = 0,
  saving = false,
  submitted = false,
  error = '',
  onStepChange,
  onSubmit,
}: Props) {
  const flowSteps = useMemo(
    () => (steps.length ? steps : []).map((step, index) => normalizeFlowStep(step, index)),
    [steps],
  )

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [submitLocked, setSubmitLocked] = useState(false)
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const prevStepIdsRef = useRef('')

  const currentStep = flowSteps[stepIndex] || flowSteps[0]
  const stepType = currentStep?.type || 'text'
  const isLastStep = stepIndex === Math.max(0, flowSteps.length - 1)
  const progressPct = flowSteps.length
    ? Math.round(((stepIndex + 1) / flowSteps.length) * 100)
    : 0

  const scaleMin = Math.max(0, Number(currentStep?.min) || 1)
  const scaleMax = Math.max(scaleMin, Number(currentStep?.max) || 5)
  const scaleRange = useMemo(() => {
    const values: number[] = []
    for (let n = scaleMin; n <= scaleMax; n += 1) values.push(n)
    return values
  }, [scaleMin, scaleMax])

  const stepperConfig = useMemo(
    () => (currentStep ? stepperConfigForStep(currentStep) : { min: 0, max: 5, step: 0.25, defaultValue: 0, unit: '' }),
    [currentStep],
  )

  const stepperHint = useMemo(() => {
    const { step } = stepperConfig
    if (stepType === 'water') {
      const label = step % 1 === 0 ? `${step} L` : `${String(step).replace('.', ',')} L`
      return `+${label} por toque`
    }
    if (stepType === 'number') {
      const unit = currentStep?.unit ? ` ${currentStep.unit}` : ''
      return `+${formatStepperValue(step)}${unit} por toque`
    }
    return ''
  }, [stepperConfig, stepType, currentStep?.unit])

  const choiceOptions = useMemo(() => {
    const raw = currentStep?.options
    if (!Array.isArray(raw)) return [] as Array<{ value: string; label: string }>
    return raw.map((item, index) => {
      if (typeof item === 'string') return { value: item, label: item }
      const obj = item as { value?: string; label?: string }
      const value = obj?.value ?? obj?.label ?? `opt_${index}`
      return { value: String(value), label: String(obj?.label ?? value) }
    })
  }, [currentStep?.options])

  const showFootOkButton =
    stepType !== 'text' && (stepType === 'water' || stepType === 'number' || isLastStep)

  const canAdvance = useMemo(() => {
    if (!currentStep) return false
    const value = form[currentStep.id]
    if (stepType === 'food' || stepType === 'exercise' || stepType === 'scale' || stepType === 'choice') {
      return value != null
    }
    if (stepType === 'water' || stepType === 'number') {
      return Number(value) >= stepperConfig.min
    }
    if (stepType === 'text') return String(value || '').trim().length > 0
    return false
  }, [currentStep, form, stepType, stepperConfig.min])

  const actionLocked = saving || submitted || submitLocked
  const submitActionDisabled = actionLocked || (!preview && !canAdvance)

  const okLabel = saving ? 'Salvando...' : isLastStep ? 'Responder' : 'Avançar'
  const okHint = saving ? 'Enviando...' : isLastStep ? 'concluir' : 'continuar'

  const waterUnitLabel = useMemo(() => {
    const value = Number(form[currentStep?.id ?? ''] ?? 0)
    if (stepType === 'water') return value === 1 ? 'litro' : 'litros'
    return currentStep?.unit?.trim() || ''
  }, [form, currentStep, stepType])

  const initForm = useCallback(
    (keepId?: string) => {
      const next: Record<string, unknown> = {}
      for (const step of flowSteps) {
        if (step.type === 'water' || step.type === 'number') {
          next[step.id] = Number.isFinite(Number(step.defaultValue))
            ? Number(step.defaultValue)
            : stepperConfigForStep(step).defaultValue
        } else {
          next[step.id] = null
        }
      }
      setForm(next)
      setSubmitLocked(false)
      if (preview) {
        const fromId = keepId ? flowSteps.findIndex((s) => s.id === keepId) : -1
        const fromProp = Math.min(
          Math.max(0, initialStepIndex),
          Math.max(0, flowSteps.length - 1),
        )
        setStepIndex(fromId >= 0 ? fromId : fromProp)
      } else {
        setStepIndex(0)
      }
    },
    [flowSteps, preview, initialStepIndex],
  )

  useEffect(() => {
    const ids = flowSteps.map((s) => `${s.id}:${s.type}`).join('|')
    if (ids === prevStepIdsRef.current) return
    const previousId = flowSteps[stepIndex]?.id
    prevStepIdsRef.current = ids
    if (saving || submitted) return
    initForm(previousId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowSteps, saving, submitted, initForm])

  useEffect(() => {
    if (!preview) return
    const next = Math.min(Math.max(0, initialStepIndex), Math.max(0, flowSteps.length - 1))
    setStepIndex((cur) => (cur === next ? cur : next))
  }, [initialStepIndex, preview, flowSteps.length])

  useEffect(() => {
    if (preview) onStepChange?.(stepIndex)
  }, [stepIndex, preview, onStepChange])

  const resizeTextAnswer = useCallback(() => {
    const el = textRef.current
    if (!el) return
    const value = String(el.value ?? '').trim()
    if (preview && !value) {
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
  }, [preview])

  useEffect(() => {
    resizeTextAnswer()
  }, [stepIndex, stepType, form, resizeTextAnswer])

  function nextStep() {
    if (!canAdvance || stepIndex >= flowSteps.length - 1) return
    setStepIndex((i) => i + 1)
  }

  function prevStep() {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }

  function submitNow() {
    if (preview) return
    if (saving || submitted || submitLocked) return
    if (!canAdvance) return
    setSubmitLocked(true)
    onSubmit?.(form)
  }

  function handleOk() {
    if (!canAdvance || saving || submitted || submitLocked) return
    if (isLastStep) {
      if (preview) return
      submitNow()
      return
    }
    nextStep()
  }

  function selectValue(id: string, value: unknown, advance = false) {
    if (saving || submitted || submitLocked) return
    setForm((prev) => ({ ...prev, [id]: value }))
    if (isLastStep) {
      if (!preview) window.setTimeout(() => submitNow(), 280)
      return
    }
    if (advance) {
      window.setTimeout(() => {
        setStepIndex((i) => Math.min(i + 1, flowSteps.length - 1))
      }, 320)
    }
  }

  function selectScale(value: number) {
    if (!currentStep) return
    selectValue(currentStep.id, value, true)
  }

  function adjustStepper(delta: number) {
    if (!currentStep) return
    const { min, max } = stepperConfig
    setForm((prev) => {
      const current = Number(prev[currentStep.id] || 0)
      const next = Math.round((current + delta) * 100) / 100
      return { ...prev, [currentStep.id]: Math.max(min, Math.min(max, next)) }
    })
  }

  if (submitted) {
    return (
      <div className={styles.success}>
        <div className={styles.successCircle}>
          <Check className={styles.successIcon} aria-hidden />
        </div>
        <h2 className={styles.successTitle}>Enviado com sucesso!</h2>
        <p className={styles.successText}>
          Suas respostas foram registradas. Redirecionando para o início…
        </p>
      </div>
    )
  }

  if (!flowSteps.length || !currentStep) {
    return null
  }

  return (
    <div className={`${styles.checkin} ${preview ? styles.preview : ''}`}>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <header className={styles.top}>
        <span className={styles.counter}>
          {stepIndex + 1} / {flowSteps.length}
        </span>
      </header>

      <main className={styles.main}>
        <section
          key={currentStep.id}
          className={`${styles.step} ${stepType === 'text' ? styles.stepText : ''}`}
        >
          <h1 className={styles.question}>{currentStep.question}</h1>
          {currentStep.hint ? <p className={styles.hint}>{currentStep.hint}</p> : null}

          <div className={styles.answer}>
            {stepType === 'food' ? (
              <FoodMoodPicker
                value={typeof form[currentStep.id] === 'number' ? (form[currentStep.id] as number) : null}
                onChange={(v) => selectValue(currentStep.id, v, true)}
              />
            ) : null}

            {stepType === 'water' || stepType === 'number' ? (
              <div className={styles.water}>
                <div className={styles.waterControl}>
                  <button
                    type="button"
                    className={styles.waterBtn}
                    aria-label={`Diminuir ${formatStepperValue(stepperConfig.step)}`}
                    onClick={() => adjustStepper(-stepperConfig.step)}
                  >
                    −
                  </button>
                  <div className={styles.waterValue}>
                    <strong>{formatStepperValue(form[currentStep.id])}</strong>
                    {waterUnitLabel ? <span>{waterUnitLabel}</span> : null}
                  </div>
                  <button
                    type="button"
                    className={styles.waterBtn}
                    aria-label={`Aumentar ${formatStepperValue(stepperConfig.step)}`}
                    onClick={() => adjustStepper(stepperConfig.step)}
                  >
                    +
                  </button>
                </div>
                {stepperHint ? <p className={styles.waterHint}>{stepperHint}</p> : null}
              </div>
            ) : null}

            {stepType === 'exercise' ? (
              <div className={styles.choices}>
                <button
                  type="button"
                  className={`${styles.choice} ${form[currentStep.id] === true ? styles.choiceSelected : ''}`}
                  onClick={() => selectValue(currentStep.id, true, true)}
                >
                  <span className={styles.choiceLabel}>{currentStep.yesLabel}</span>
                  <span className={styles.choiceCheck} aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.choice} ${form[currentStep.id] === false ? styles.choiceSelected : ''}`}
                  onClick={() => selectValue(currentStep.id, false, true)}
                >
                  <span className={styles.choiceLabel}>{currentStep.noLabel}</span>
                  <span className={styles.choiceCheck} aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              </div>
            ) : null}

            {stepType === 'scale' ? (
              <div className={styles.stars} role="group" aria-label={currentStep.question}>
                {scaleRange.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.star} ${(Number(form[currentStep.id]) || 0) >= n ? styles.starFilled : ''}`}
                    aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                    aria-pressed={(Number(form[currentStep.id]) || 0) >= n}
                    onClick={() => selectScale(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            ) : null}

            {stepType === 'choice' ? (
              <div className={styles.choices}>
                {choiceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.choice} ${form[currentStep.id] === option.value ? styles.choiceSelected : ''}`}
                    onClick={() => selectValue(currentStep.id, option.value, true)}
                  >
                    <span className={styles.choiceLabel}>{option.label}</span>
                    <span className={styles.choiceCheck} aria-hidden>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {stepType === 'text' ? (
              <div className={styles.text}>
                <div className={styles.textField}>
                  <textarea
                    ref={textRef}
                    rows={1}
                    className={styles.textarea}
                    placeholder={currentStep.placeholder}
                    value={String(form[currentStep.id] ?? '')}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, [currentStep.id]: e.target.value }))
                      resizeTextAnswer()
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.submit}
                  disabled={submitActionDisabled}
                  onClick={handleOk}
                >
                  {saving ? <Loader2 className={styles.spin} size={12} aria-hidden /> : null}
                  <span>{okLabel}</span>
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {stepIndex > 0 || showFootOkButton ? (
        <footer
          className={`${styles.foot} ${stepIndex > 0 && showFootOkButton ? styles.footSplit : ''}`}
        >
          {stepIndex > 0 ? (
            <button
              type="button"
              className={styles.back}
              aria-label="Voltar"
              onClick={prevStep}
            >
              <ChevronUp size={14} aria-hidden />
              <span>Voltar</span>
            </button>
          ) : null}

          {showFootOkButton ? (
            <div className={styles.footOk}>
              <button
                type="button"
                className={styles.ok}
                disabled={submitActionDisabled}
                aria-label={okLabel}
                onClick={handleOk}
              >
                {saving ? (
                  <Loader2 className={styles.spin} size={16} aria-hidden />
                ) : !isLastStep ? (
                  <ArrowRight size={16} aria-hidden />
                ) : (
                  <Check size={16} aria-hidden />
                )}
              </button>
              <span className={styles.okHint}>{okHint}</span>
            </div>
          ) : null}
        </footer>
      ) : null}

      {preview && isLastStep && canAdvance ? (
        <p className={styles.previewNote}>Fim da prévia — no app o paciente envia aqui.</p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
