'use client'
import { Loader } from 'lucide-react'
import type { QuickReply } from '@/lib/whatsapp/quick-replies'
import { AnimatedDialog } from '@/components/overlays'
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

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      title="Apagar resposta rápida"
      overlayClassName={styles.waOverlay}
      contentClassName={styles.modal}
    >
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
    </AnimatedDialog>
  )
}
