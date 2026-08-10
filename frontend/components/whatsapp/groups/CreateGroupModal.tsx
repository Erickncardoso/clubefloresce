'use client'
import { useState, useEffect } from 'react'
import { AnimatedDialog } from '@/components/overlays'
import type { WaContactForPicker } from '@/lib/whatsapp/groups'
import styles from './CreateGroupModal.module.scss'

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
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title="Criar novo grupo"
      overlayClassName={styles.waOverlay}
      contentClassName={styles.modal}
    >
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Criar novo grupo</h3>
        <button onClick={onCancel} className={styles.closeBtn}>✕</button>
      </div>

      <div className={styles.body}>
        <label className={styles.label}>Nome do grupo</label>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Ex.: Grupo de suporte"
          disabled={sending}
          className={styles.input}
        />

        <label className={styles.label}>Participantes</label>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome ou número..."
          disabled={sending}
          className={styles.input}
        />

        <div className={styles.contactList}>
          {filtered.length === 0 ? (
            <p className={styles.contactEmpty}>Nenhum contato encontrado.</p>
          ) : filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              disabled={sending}
              className={`${styles.contactItem}${selectedIds.includes(c.id) ? ` ${styles.selected}` : ''}`}
            >
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt={c.name} className={styles.contactAvatar} />
              ) : (
                <div className={styles.contactAvatarFallback}>
                  {c.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div className={styles.contactName}>{c.name}</div>
                <div className={styles.contactNumber}>{c.number}</div>
              </div>
            </button>
          ))}
        </div>

        <p className={styles.hint}>Selecione ao menos 1 participante além de você.</p>
        {feedback && <p className={styles.feedback}>{feedback}</p>}
      </div>

      <div className={styles.footer}>
        <button onClick={onCancel} disabled={sending} className={styles.btnSecondary}>Cancelar</button>
        <button
          onClick={() => onConfirm(groupName, selectedIds)}
          disabled={sending || !canSubmit}
          className={styles.btnPrimary}
        >
          {sending ? 'Criando...' : 'Criar grupo'}
        </button>
      </div>
    </AnimatedDialog>
  )
}
