// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'

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

  if (!open) return null

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600, color: '#111b21' }}>
          Deseja bloquear {displayName}?
        </h3>
        <p style={{ margin: '0 0 16px', color: '#667781', fontSize: '.9rem', lineHeight: 1.45 }}>
          A pessoa não poderá mais fazer ligações nem enviar mensagens para você. Ela não saberá que foi bloqueada.
        </p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reportChecked}
            onChange={(e) => setReportChecked(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: '#25d366' }}
          />
          <span style={{ fontSize: '.88rem', color: '#111b21' }}>
            <strong style={{ display: 'block', marginBottom: 2 }}>Denunciar ao WhatsApp</strong>
            <span style={{ color: '#667781', fontSize: '.82rem' }}>
              As últimas cinco mensagens serão encaminhadas para o WhatsApp.
            </span>
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={loading} style={cancelBtnStyle}>Cancelar</button>
          <button
            onClick={() => onConfirm(reportChecked)}
            disabled={loading}
            style={{ ...dangerBtnStyle, opacity: loading ? .55 : 1 }}
          >
            {loading ? 'Bloqueando...' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
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
  if (!open) return null

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div role="dialog" aria-modal="true" style={{ ...modalStyle, maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: '0 0 20px', fontSize: '1rem', color: '#111b21' }}>
          Deseja desbloquear {displayName}?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={loading} style={cancelBtnStyle}>Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ ...primaryBtnStyle, opacity: loading ? .55 : 1 }}
          >
            {loading ? 'Desbloqueando...' : 'Desbloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10100, background: 'rgba(17,27,33,.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
}

const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '24px 20px', maxWidth: 420, width: '100%',
  boxShadow: '0 8px 32px rgba(11,20,26,.18)',
}

const cancelBtnStyle: React.CSSProperties = {
  border: 'none', height: 38, padding: '0 16px', borderRadius: 8, fontWeight: 600,
  cursor: 'pointer', background: '#f0f2f5', color: '#54656f',
}

const dangerBtnStyle: React.CSSProperties = {
  border: 'none', height: 38, padding: '0 16px', borderRadius: 8, fontWeight: 600,
  cursor: 'pointer', background: '#ea0038', color: '#fff',
}

const primaryBtnStyle: React.CSSProperties = {
  border: 'none', height: 38, padding: '0 16px', borderRadius: 8, fontWeight: 600,
  cursor: 'pointer', background: '#25d366', color: '#04130a',
}
