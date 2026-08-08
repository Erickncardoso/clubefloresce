'use client'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useWhatsapp } from '@/lib/whatsapp/context'
import { MessageBubble } from './MessageBubble'
import { WhatsappImageViewerModal, useImageViewer } from './WhatsappImageViewerModal'
import type { WaMessage } from '@/lib/whatsapp/messages'

function groupByDate(messages: import('@/lib/whatsapp/messages').WaMessage[]) {
  const groups: { label: string; messages: typeof messages }[] = []
  let lastLabel = ''

  for (const msg of messages) {
    const d = msg.timestamp ? new Date(msg.timestamp) : null
    const label = d
      ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Desconhecido'
    if (label !== lastLabel) {
      groups.push({ label, messages: [] })
      lastLabel = label
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

export function ChatBody() {
  const { messages, loadingMessages, selectedChat } = useWhatsapp()
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevChatJidRef = useRef<string | null>(null)
  const viewer = useImageViewer()

  const handleImageClick = (msg: WaMessage) => {
    const mediaMessages = messages.filter((m) => m.mediaType === 'image' || m.mediaType === 'video')
    const idx = mediaMessages.findIndex((m) => m.id === msg.id)
    viewer.openViewer(mediaMessages, Math.max(0, idx))
  }

  // Scroll para o fundo ao trocar de chat ou receber mensagem nova
  useEffect(() => {
    const chatJid = selectedChat?.chatJid ?? null
    const changedChat = chatJid !== prevChatJidRef.current
    prevChatJidRef.current = chatJid
    if (!bottomRef.current) return
    if (changedChat || messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: changedChat ? 'instant' : 'smooth' })
    }
  }, [messages, selectedChat])

  if (loadingMessages) {
    return (
      <div className="chat-body">
        <div className="chat-body-scroll">
          <div className="chat-body-loading">
            <Loader2 className="chat-body-loading-icon" style={{ animation: 'chat-sync-spin 1.1s linear infinite' }} />
            <span>Carregando mensagens…</span>
          </div>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="chat-body">
        <div className="chat-body-scroll">
          <div className="chat-conversation-empty">
            <div className="chat-date-pill">Hoje</div>
            <div className="chat-e2e-notice">
              <span className="chat-e2e-notice__text">
                As mensagens são protegidas com criptografia de ponta a ponta.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const groups = groupByDate(messages)

  return (
    <div className="chat-body">
      <div className="chat-body-scroll">
        <div className="messages-container">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="chat-timeline-row">
                <div className="chat-date-pill">{group.label}</div>
              </div>
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onImageClick={handleImageClick} />
              ))}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Image viewer */}
      <WhatsappImageViewerModal
        open={viewer.open}
        items={viewer.items}
        index={viewer.index}
        senderName={selectedChat?.name || ''}
        onClose={viewer.close}
        onPrev={viewer.prev}
        onNext={viewer.next}
        onSelect={viewer.select}
      />
    </div>
  )
}
