'use client'
import { Loader } from 'lucide-react'
import { AnimatedDialog } from '@/components/overlays'
import styles from './LabelDeleteConfirmModal.module.scss'

interface Props {
  open: boolean
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LabelDeleteConfirmModal({ open, saving, onCancel, onConfirm }: Props) {
  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title="Deseja apagar a etiqueta?"
      overlayClassName={styles.waOverlay}
      contentClassName={styles.modal}
    >
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
    </AnimatedDialog>
  )
}
