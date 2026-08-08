'use client'
import { createPortal } from 'react-dom'
import { Loader } from 'lucide-react'
import type { QuickReply } from '@/lib/whatsapp/quick-replies'
import styles from './QuickReplyDeleteConfirmModal.module.scss'

interface Props {
  open: boolean
  saving: boolean
  reply: QuickReply | null
  onCancel: () => void
  onConfirm: () => void
}

export function QuickReplyDeleteConfirmModal({ open, saving, reply, onCancel, onConfirm }: Props) {
  const shortcutLabel = String(reply?.shortCut || '').trim() || 'atalho'

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Apagar resposta rápida">
        <h2 className={styles.title}>Apagar resposta rápida?</h2>
        <p className={styles.text}>
          A resposta <strong>/{shortcutLabel}</strong> será removida permanentemente.
        </p>
        <footer className={styles.footer}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={saving}
            onClick={onConfirm}
          >
            {saving && <Loader size={16} className={styles.spinner} />}
            Apagar
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
