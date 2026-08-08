// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import type { WaContactForPicker } from '@/lib/whatsapp/groups'

interface Props {
  open: boolean
  contacts: WaContactForPicker[]
  sending?: boolean
  feedback?: string
  onCancel: () => void
  onConfirm: (selectedIds: string[]) => void
}

export function SendContactsModal({ open, contacts, sending, feedback, onCancel, onConfirm }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) { setSearchQuery(''); setSelectedIds([]) }
  }, [open])

  if (!open) return null

  const filtered = contacts.filter((c) => {
    const q = searchQuery.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.number.includes(q)
  })

  const toggle = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Enviar contatos"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #e9edef', background: '#f0f2f5' }}>
          <button onClick={onCancel} style={closeBtnStyle}>✕</button>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111b21', flex: 1, textAlign: 'center' }}>Enviar contatos</h3>
          <span style={{ width: 32 }} />
        </header>

        {/* Search */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e9edef' }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar nome ou número"
            disabled={sending}
            style={searchInputStyle}
          />
        </div>

        {feedback && (
          <p style={{ margin: 0, padding: '8px 16px', color: '#b3261e', fontSize: '.86rem', background: '#fce8e6' }}>{feedback}</p>
        )}

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.map((c) => {
            const sel = selectedIds.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                disabled={sending}
                style={{
                  width: '100%', border: 'none', background: sel ? 'rgba(37,211,102,.06)' : 'transparent',
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f0f2f5',
                }}
              >
                {/* Checkbox */}
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: sel ? '6px solid #25d366' : '2px solid #b2bec3', background: '#fff',
                  display: 'inline-block',
                }} />

                {/* Avatar */}
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt={c.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dfe5e7', display: 'grid', placeItems: 'center', color: '#54656f', fontWeight: 600, flexShrink: 0 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#111b21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.number && <div style={{ fontSize: '.82rem', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.number}</div>}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ margin: 0, padding: '20px 16px', color: '#8696a0', fontSize: '.9rem', textAlign: 'center' }}>Nenhum contato encontrado.</p>
          )}
        </div>

        {/* Footer */}
        <footer style={{ padding: '12px 16px', borderTop: '1px solid #e9edef', background: '#f0f2f5' }}>
          <button
            onClick={() => onConfirm(selectedIds)}
            disabled={sending || selectedIds.length === 0}
            style={{
              width: '100%', height: 44, border: 'none', borderRadius: 10, fontWeight: 600,
              fontSize: '.95rem', cursor: 'pointer', background: '#25d366', color: '#04130a',
              opacity: (sending || selectedIds.length === 0) ? .55 : 1,
            }}
          >
            {sending ? 'Enviando...' : `Enviar contato${selectedIds.length > 1 ? 's' : ''}${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
          </button>
        </footer>
      </section>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10080, background: 'rgba(17,27,33,.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
}

const modalStyle: React.CSSProperties = {
  width: 'min(420px,calc(100vw - 32px))', maxHeight: 'min(88vh,640px)', background: '#fff',
  borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(11,20,26,.2)',
  display: 'flex', flexDirection: 'column',
}

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#54656f', cursor: 'pointer', fontSize: '1.15rem',
  width: 32, height: 32, display: 'grid', placeItems: 'center',
}

const searchInputStyle: React.CSSProperties = {
  width: '100%', height: 40, border: '1px solid #e9edef', borderRadius: 8,
  padding: '0 12px', outline: 'none', fontSize: '.9rem', color: '#111b21',
  background: '#fff', boxSizing: 'border-box',
}
