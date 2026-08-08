'use client'
import { ArrowLeft, Loader, User, BellOff } from 'lucide-react'
import type { WaChat } from '@/lib/whatsapp/chats'
import styles from './ArchivedChatsSidebarPanel.module.scss'

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
  chats: WaChat[]
  loading: boolean
  onClose: () => void
  onSelectChat: (chat: WaChat) => void
}

export function ArchivedChatsSidebarPanel({ chats, loading, onClose, onSelectChat }: Props) {
  return (
    <div className={styles.sidebar}>
      <header className={styles.header}>
        <button type="button" className={styles.iconBtn} aria-label="Voltar" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h2 className={styles.title}>Arquivadas</h2>
        <span className={styles.spacer} aria-hidden="true" />
      </header>

      <p className={styles.hint}>
        Essas conversas são desarquivadas quando você recebe novas mensagens. Para mudar essa
        configuração, abra o WhatsApp no seu celular e acesse{' '}
        <strong>Configurações &gt; Conversas</strong>.
      </p>

      {loading ? (
        <div className={styles.stateBox}>
          <Loader size={28} className={styles.spinner} />
        </div>
      ) : chats.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.emptyText}>Nenhuma conversa arquivada.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {chats.map((chat) => (
            <div
              key={chat.chatJid}
              className={styles.chatItem}
              role="button"
              tabIndex={0}
              onClick={() => onSelectChat(chat)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectChat(chat)}
            >
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
                  <div className={styles.meta}>
                    <span className={styles.time}>{formatTime(chat.lastMessageAt)}</span>
                    <div className={styles.metaBottom}>
                      {/* mute icon placeholder — muteEndTime not in WaChat yet */}
                    </div>
                  </div>
                </div>
                <p className={styles.preview}>{chat.lastMessagePreview || 'Nenhuma mensagem'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
