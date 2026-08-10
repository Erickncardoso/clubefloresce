'use client'
import { useState, useEffect } from 'react'
import { AnimatedDialog } from '@/components/overlays'
import styles from './BlockContactModal.module.scss'

// ─── Block modal ──────────────────────────────────────────────────────────────

interface BlockProps {
  open: boolean
  displayName?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: (reportContact: boolean) => void
}

export function BlockContactModal({ open, displayName = 'Contato', loading, onCancel, onConfirm }: BlockProps) {
  const [reportChecked, setReportChecked] = useState(false)

  useEffect(() => {
    if (open) setReportChecked(false)
  }, [open])

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title={`Bloquear ${displayName}`}
      overlayClassName={styles.waOverlay}
      contentClassName={styles.modal}
    >
      <h3 className={styles.title}>Deseja bloquear {displayName}?</h3>
      <p className={styles.body}>
        A pessoa não poderá mais fazer ligações nem enviar mensagens para você. Ela não saberá que foi bloqueada.
      </p>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={reportChecked}
          onChange={(e) => setReportChecked(e.target.checked)}
        />
        <span className={styles.checkboxText}>
          <strong style={{ display: 'block', marginBottom: 2 }}>Denunciar ao WhatsApp</strong>
          <span className={styles.checkboxSubtext}>
            As últimas cinco mensagens serão encaminhadas para o WhatsApp.
          </span>
        </span>
      </label>

      <div className={styles.footer}>
        <button onClick={onCancel} disabled={loading} className={styles.btnCancel}>Cancelar</button>
        <button
          onClick={() => onConfirm(reportChecked)}
          disabled={loading}
          className={styles.btnDanger}
        >
          {loading ? 'Bloqueando...' : 'Bloquear'}
        </button>
      </div>
    </AnimatedDialog>
  )
}

// ─── Unblock modal ────────────────────────────────────────────────────────────

interface UnblockProps {
  open: boolean
  displayName?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function UnblockContactModal({ open, displayName = 'Contato', loading, onCancel, onConfirm }: UnblockProps) {
  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title={`Desbloquear ${displayName}`}
      overlayClassName={styles.waOverlay}
      contentClassName={styles.unblockModal}
    >
      <p className={styles.body} style={{ marginBottom: 20 }}>
        Deseja desbloquear {displayName}?
      </p>
      <div className={styles.footer}>
        <button onClick={onCancel} disabled={loading} className={styles.btnCancel}>Cancelar</button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={styles.btnPrimary}
        >
          {loading ? 'Desbloqueando...' : 'Desbloquear'}
        </button>
      </div>
    </AnimatedDialog>
  )
}
