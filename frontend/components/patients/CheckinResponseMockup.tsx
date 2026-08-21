'use client'

import { useMemo, useState } from 'react'
import { CheckinTypeformFlow } from '@/components/checkin/CheckinTypeformFlow'
import { PatientPhotosPanel } from '@/components/patients/PatientPhotosPanel'
import type { StepApiPayload } from '@/lib/checkin-step-schema'
import styles from './CheckinResponseMockup.module.scss'

type StepLike = {
  id: string
  type?: string
  label?: string
  question?: string
  hint?: string
  options?: unknown
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  unit?: string
  yesLabel?: string
  noLabel?: string
  placeholder?: string
}

type Props = {
  steps?: StepLike[] | null
  answers?: Record<string, unknown> | null
  title?: string
  patientId?: string
}

function toFlowSteps(steps: StepLike[]): StepApiPayload[] {
  return steps.map((step, index) => ({
    id: step.id || `step_${index}`,
    type: step.type || 'text',
    question: step.question || step.label || `Pergunta ${index + 1}`,
    hint: step.hint || '',
    options: step.options as StepApiPayload['options'],
    min: step.min,
    max: step.max,
    step: step.step,
    defaultValue: step.defaultValue,
    unit: step.unit,
    yesLabel: step.yesLabel,
    noLabel: step.noLabel,
    placeholder: step.placeholder,
  }))
}

export function CheckinResponseMockup({
  steps = [],
  answers = null,
  title,
  patientId,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const flowSteps = useMemo(() => toFlowSteps(steps || []), [steps])

  if (!flowSteps.length) {
    return <p className={styles.empty}>Sem perguntas neste check-in.</p>
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <strong>{title || 'Respostas no celular'}</strong>
        <span>Passe as perguntas como a paciente viu no app</span>
      </div>

      <div className={styles.desk}>
        <div className={styles.phoneShell}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imgs/mockup-isa.png"
            alt=""
            className={styles.phoneMockup}
            width={486}
            height={978}
            draggable={false}
          />
          <div className={styles.phoneScreen}>
            <CheckinTypeformFlow
              preview
              steps={flowSteps}
              initialAnswers={answers}
              initialStepIndex={stepIndex}
              onStepChange={setStepIndex}
            />
          </div>
        </div>

        {patientId ? (
          <div className={styles.photoDesk} aria-label="Fotos de refeições">
            <PatientPhotosPanel patientId={patientId} compact limit={12} />
          </div>
        ) : null}
      </div>

      <p className={styles.hint}>
        Use Voltar / Avançar, as setas do teclado (← →) ou deslize o dedo no celular.
      </p>
    </div>
  )
}
