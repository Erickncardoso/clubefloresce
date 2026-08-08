'use client'

import { CheckinTypeformFlow } from './CheckinTypeformFlow'
import type { StepApiPayload } from '@/lib/checkin-step-schema'
import styles from './CheckinTemplateEditorPreview.module.scss'

type Props = {
  steps: StepApiPayload[]
  stepIndex: number
  onStepIndexChange: (index: number) => void
}

export function CheckinTemplateEditorPreview({
  steps,
  stepIndex,
  onStepIndexChange,
}: Props) {
  return (
    <div className={styles.preview}>
      <div className={styles.head}>
        <strong>Prévia ao vivo</strong>
        <span>Como o paciente verá no app</span>
      </div>

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
          {steps.length ? (
            <CheckinTypeformFlow
              preview
              steps={steps}
              initialStepIndex={stepIndex}
              onStepChange={onStepIndexChange}
            />
          ) : (
            <div className={styles.phoneEmpty}>
              <p>Adicione perguntas para visualizar o check-in.</p>
            </div>
          )}
        </div>
      </div>

      <p className={styles.hint}>
        Toque nas opções dentro do celular ou clique numa pergunta à esquerda para pular até ela.
      </p>
    </div>
  )
}
