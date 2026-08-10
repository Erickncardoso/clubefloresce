'use client'

import { AnimatedDialog } from '@/components/overlays'
import styles from './PatientMealPlanDaySelectConfirmModal.module.scss'

interface Props {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function PatientMealPlanDaySelectConfirmModal({ open, onConfirm, onCancel }: Props) {
  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      title="Selecionar dia específico"
      contentClassName={styles.panel}
    >
      <h2 id="mped-day-confirm-title" className={styles.title}>
        Selecionar dia específico
      </h2>
      <p className={styles.message}>
        Ao selecionar um dia separado, a opção{' '}
        <strong>&quot;Todos os dias&quot;</strong>{' '}
        é automaticamente desabilitada. Deseja prosseguir?
      </p>
      <footer className={styles.actions}>
        <button type="button" className={`btn-secondary ${styles.btn}`} onClick={onCancel}>
          Não
        </button>
        <button type="button" className={`btn-primary ${styles.btn}`} onClick={onConfirm}>
          Sim
        </button>
      </footer>
    </AnimatedDialog>
  )
}
