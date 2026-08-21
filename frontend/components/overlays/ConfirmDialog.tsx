'use client'

import type { ReactNode } from 'react'
import { AppModal } from '@/components/overlays/AppModal'
import styles from './ConfirmDialog.module.scss'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Conteúdo extra abaixo da descrição */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo do botão confirmar (destrutivo = vermelho) */
  tone?: 'primary' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

/**
 * Confirmação no visual do admin — nunca use window.confirm / alert.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  function handleCancel() {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel?.()
        onOpenChange(next)
      }}
      title={title}
      description={description}
      showClose={!busy}
    >
      {children}
      <div className={styles.actions}>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={handleCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === 'danger' ? styles.dangerBtn : 'btn-primary'}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </AppModal>
  )
}
