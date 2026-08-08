'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './PatientMealPlanDaySelectConfirmModal.module.scss'

interface Props {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function PatientMealPlanDaySelectConfirmModal({ open, onConfirm, onCancel }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      prev?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mped-day-confirm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div ref={panelRef} className={styles.panel} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>,
    document.body,
  )
}
