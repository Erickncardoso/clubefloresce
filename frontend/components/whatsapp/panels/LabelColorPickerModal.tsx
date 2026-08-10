'use client'
import { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'
import { AnimatedDialog } from '@/components/overlays'
import type { WaLabel } from '@/lib/whatsapp/labels'
import { WA_LABEL_COLOR_HEX, resolveLabelColorIndex } from '@/lib/whatsapp/labels'
import styles from './LabelColorPickerModal.module.scss'

interface Props {
  open: boolean
  saving: boolean
  label: WaLabel | null
  onCancel: () => void
  onSave: (payload: { labelid: string; name: string; color: number }) => void
}

export function LabelColorPickerModal({ open, saving, label, onCancel, onSave }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setSelectedIndex(label ? resolveLabelColorIndex(label as unknown as Record<string, unknown>) : 0)
  }, [open, label])

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title="Escolher cor"
      overlayClassName={styles.waOverlay}
      contentClassName={styles.modal}
    >
      <header className={styles.header}>
        <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onCancel}>
          <X size={20} />
        </button>
        <h2 className={styles.title}>Escolher cor</h2>
      </header>

      <div className={styles.grid} role="listbox" aria-label="Cores disponíveis">
        {WA_LABEL_COLOR_HEX.map((hex, idx) => (
          <button
            key={`${hex}-${idx}`}
            type="button"
            className={`${styles.swatch}${selectedIndex === idx ? ` ${styles.selected}` : ''}`}
            style={{ backgroundColor: hex }}
            aria-label={`Cor ${idx + 1}`}
            aria-selected={selectedIndex === idx}
            role="option"
            onClick={() => setSelectedIndex(idx)}
          />
        ))}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={saving}
          onClick={() =>
            onSave({
              labelid: String(label?.labelid || label?.id || ''),
              name: String(label?.name || '').trim(),
              color: selectedIndex,
            })
          }
        >
          {saving && <Loader size={16} className={styles.spinner} />}
          Salvar
        </button>
      </footer>
    </AnimatedDialog>
  )
}
