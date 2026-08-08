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
  onConfirm: (groupName: string, selectedIds: string[]) => void
}

export function CreateGroupModal({ open, contacts, sending, feedback, onCancel, onConfirm }: Props) {
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      setGroupName('')
      setSearchQuery('')
      setSelectedIds([])
    }
  }, [open])

  if (!open) return null

  const filtered = contacts.filter((c) => {
    const q = searchQuery.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.number.includes(q)
  })

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const canSubmit = groupName.trim().length > 0 && selectedIds.length > 0

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(8,15,22,.72)',
        display: 'grid', placeItems: 'center', zIndex: 9090,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 'min(520px,calc(100vw - 32px))', maxHeight: 'min(86vh,760px)',
          overflow: 'hidden', borderRadius: 16, background: '#111b21',
          border: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#e9edef' }}>Criar novo grupo</h3>
          <button onClick={onCancel} style={closeBtnStyle}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          <label style={labelStyle}>Nome do grupo</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex.: Grupo de suporte"
            disabled={sending}
            style={inputStyle}
          />

          <label style={labelStyle}>Participantes</label>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou número..."
            disabled={sending}
            style={inputStyle}
          />

          <div style={{
            border: '1px solid rgba(255,255,255,.08)', borderRadius: 12,
            background: '#0b141a', overflow: 'auto', maxHeight: 320,
          }}>
            {filtered.length === 0 ? (
              <p style={{ margin: 10, color: '#8696a0', fontSize: '.86rem' }}>Nenhum contato encontrado.</p>
            ) : filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                disabled={sending}
                style={{
                  width: '100%', border: 'none', background: selectedIds.includes(c.id)
                    ? 'rgba(37,211,102,.14)' : 'transparent',
                  color: '#e9edef', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
                }}
              >
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt={c.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: '#3b4a54',
                    display: 'grid', placeItems: 'center', color: '#d1d7db', fontWeight: 700, fontSize: 14,
                  }}>
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '.78rem', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.number}</div>
                </div>
              </button>
            ))}
          </div>

          <p style={{ margin: 0, color: '#8696a0', fontSize: '.78rem' }}>Selecione ao menos 1 participante além de você.</p>
          {feedback && <p style={{ margin: 0, color: '#ffb4ab', fontSize: '.85rem' }}>{feedback}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={sending} style={secondaryBtnStyle}>Cancelar</button>
          <button
            onClick={() => onConfirm(groupName, selectedIds)}
            disabled={sending || !canSubmit}
            style={{ ...primaryBtnStyle, opacity: (sending || !canSubmit) ? .55 : 1 }}
          >
            {sending ? 'Criando...' : 'Criar grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#aebac1', cursor: 'pointer', fontSize: '1rem',
}

const labelStyle: React.CSSProperties = { color: '#d1d7db', fontSize: '.86rem' }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,.12)',
  background: '#202c33', color: '#e9edef', padding: '0 12px', outline: 'none', boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  border: 'none', height: 38, padding: '0 14px', borderRadius: 10, fontWeight: 600,
  cursor: 'pointer', background: '#25d366', color: '#04130a',
}

const secondaryBtnStyle: React.CSSProperties = {
  border: 'none', height: 38, padding: '0 14px', borderRadius: 10, fontWeight: 600,
  cursor: 'pointer', background: '#202c33', color: '#d1d7db',
}
