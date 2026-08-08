'use client'
import { ArrowLeft, X, Tags, Tag, Loader, User } from 'lucide-react'
import type { WaLabel } from '@/lib/whatsapp/labels'
import type { WaChat } from '@/lib/whatsapp/chats'
import styles from './LabelChatsSidebarPanel.module.scss'

function formatTime(tsMs: number): string {
  if (!tsMs) return ''
  const now = new Date()
  const d = new Date(tsMs)
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  label: WaLabel | null
  chats: WaChat[]
  selectedKeys: string[]
  loading: boolean
  bulkSaving: boolean
  onBack: () => void
  onClearSelection: () => void
  onToggleSelect: (chat: WaChat) => void
  onAddLabel: () => void
  onRemoveLabel: () => void
  onOpenChat: (chat: WaChat) => void
}

export function LabelChatsSidebarPanel({
  label,
  chats,
  selectedKeys,
  loading,
  bulkSaving,
  onBack,
  onClearSelection,
  onToggleSelect,
  onAddLabel,
  onRemoveLabel,
  onOpenChat,
}: Props) {
  const selectionCount = Array.isArray(selectedKeys) ? selectedKeys.length : 0
  const selectionLabel = selectionCount === 1 ? '1 selecionada' : `${selectionCount} selecionadas`

  return (
    <div className={styles.sidebar}>
      <header className={`${styles.header}${selectionCount > 0 ? ` ${styles.headerSelection}` : ''}`}>
        {selectionCount > 0 ? (
          <>
            <button type="button" className={styles.iconBtn} aria-label="Limpar seleção" onClick={onClearSelection}>
              <X size={20} />
            </button>
            <h2 className={styles.title}>{selectionLabel}</h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Adicionar etiqueta"
                disabled={bulkSaving}
                onClick={onAddLabel}
              >
                <Tags size={20} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Remover etiqueta"
                disabled={bulkSaving}
                onClick={onRemoveLabel}
              >
                <Tag size={20} />
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className={styles.iconBtn} aria-label="Voltar" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>
            <div className={styles.titleWrap}>
              {label?.colorHex && (
                <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
                  <path
                    fill={label.colorHex}
                    d="M1.5 1.5C1.5 1.07 1.83.75 2.25.75h9.5c.28 0 .54.11.73.3l7.32 6.08a.9.9 0 0 1 0 1.38l-7.32 6.08c-.19.19-.45.3-.73.3H2.25A1.5 1.5 0 0 1 .75 13V1.5z"
                  />
                </svg>
              )}
              <h2 className={styles.title}>{label?.name || 'Etiqueta'}</h2>
            </div>
            <span className={styles.spacer} aria-hidden="true" />
          </>
        )}
      </header>

      {loading ? (
        <div className={styles.stateBox}>
          <Loader size={28} className={styles.spinner} />
        </div>
      ) : chats.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.emptyText}>Nenhuma conversa com esta etiqueta.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {chats.map((chat) => {
            const isSelected = selectedKeys.includes(chat.chatJid)
            return (
              <div
                key={chat.chatJid}
                className={`${styles.chatItem}${isSelected ? ` ${styles.selected}` : ''}`}
                onClick={(e) => {
                  const t = e.target as Element
                  if (t.closest(`.${styles.checkWrap}`)) return
                  if (selectionCount > 0) { onToggleSelect(chat); return }
                  onOpenChat(chat)
                }}
              >
                <label
                  className={styles.checkWrap}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className={styles.check}
                    checked={isSelected}
                    aria-label={`Selecionar ${chat.name}`}
                    onChange={() => onToggleSelect(chat)}
                  />
                </label>

                <div className={styles.avatar}>
                  {chat.avatarUrl ? (
                    <img src={chat.avatarUrl} alt={chat.name} className={styles.avatarImg} />
                  ) : (
                    <User size={24} className={styles.avatarFallback} />
                  )}
                </div>

                <div className={styles.copy}>
                  <div className={styles.top}>
                    <span className={styles.name}>{chat.name || chat.chatJid.split('@')[0]}</span>
                    <span className={styles.time}>{formatTime(chat.lastMessageAt)}</span>
                  </div>
                  <p className={styles.preview}>{chat.lastMessagePreview || 'Nenhuma mensagem'}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
