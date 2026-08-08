'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader } from 'lucide-react'
import type { WaLabel } from '@/lib/whatsapp/labels'
import { resolveLabelColorHex, WA_LABEL_COLOR_HEX } from '@/lib/whatsapp/labels'
import styles from './LabelFormModal.module.scss'

function LabelTagIconLarge({ colorHex }: { colorHex: string }) {
  return (
    <svg width="48" height="34" viewBox="0 0 48 34" aria-hidden="true" className={styles.tagIcon}>
      <path
        fill={colorHex || '#99b6c1'}
        d="M3 3C3 2.17 3.67 1.5 4.5 1.5H24c.6 0 1.15.24 1.57.66l16.5 13.7a2.03 2.03 0 0 1 0 3.08l-16.5 13.7c-.42.42-.97.66-1.57.66H4.5A3 3 0 0 1 1.5 31V3z"
      />
    </svg>
  )
}

interface Props {
  open: boolean
  saving: boolean
  error: string
  label: WaLabel | null
  onCancel: () => void
  onSave: (payload: { labelid: string; name: string; color: number }) => void
}

export function LabelFormModal({ open, saving, error, label, onCancel, onSave }: Props) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!open) return
    setName(String(label?.name || '').trim())
  }, [open, label])

  const previewColorHex = label?.colorHex
    ? resolveLabelColorHex(label as unknown as Record<string, unknown>)
    : WA_LABEL_COLOR_HEX[2]

  const title = label?.id ? 'Editar etiqueta' : 'Adicionar etiqueta'

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.header}>
          <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onCancel}>
            <X size={20} />
          </button>
          <h2 className={styles.title}>{title}</h2>
        </header>

        <form className={styles.body} onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ labelid: label?.id ? String(label.id) : 'new', name: name.trim(), color: label?.color ?? 2 }) }}>
          <div className={styles.fieldRow}>
            <LabelTagIconLarge colorHex={previewColorHex} />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Etiqueta</span>
              <input
                className={styles.input}
                type="text"
                maxLength={80}
                required
                autoFocus
                placeholder="Etiqueta"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <footer className={styles.footer}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving || !name.trim()}
            >
              {saving && <Loader size={16} className={styles.spinner} />}
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
