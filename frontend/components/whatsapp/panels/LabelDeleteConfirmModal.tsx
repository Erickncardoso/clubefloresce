'use client'
import { createPortal } from 'react-dom'
import { Loader } from 'lucide-react'
import styles from './LabelDeleteConfirmModal.module.scss'

interface Props {
  open: boolean
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LabelDeleteConfirmModal({ open, saving, onCancel, onConfirm }: Props) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Apagar etiqueta">
        <h2 className={styles.title}>Deseja apagar a etiqueta?</h2>
        <p className={styles.text}>
          A etiqueta será removida de todas as mensagens, dos contatos e da lista de etiquetas após
          ser apagada. Tem certeza de que deseja apagar essa etiqueta?
        </p>
        <footer className={styles.footer}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving}
            onClick={onConfirm}
          >
            {saving && <Loader size={16} className={styles.spinner} />}
            OK
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
