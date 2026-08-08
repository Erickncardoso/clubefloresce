'use client'
import { useRef, useState } from 'react'
import { Check, CheckCheck, Clock, Reply, Copy, Image, Music, FileText, Video } from 'lucide-react'
import type { WaMessage, MessageStatus } from '@/lib/whatsapp/messages'
import { useWhatsapp, type ReplyTarget } from '@/lib/whatsapp/context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMsgTime(tsMs: number): string {
  if (!tsMs) return ''
  return new Date(tsMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function DeliveryTick({ status }: { status: MessageStatus }) {
  if (status === 'pending') return <Clock size={12} className="msg-tick msg-tick--pending" />
  if (status === 'read') return <CheckCheck size={14} className="msg-tick msg-tick--read" />
  if (status === 'delivered') return <CheckCheck size={14} className="msg-tick msg-tick--delivered" />
  return <Check size={14} className="msg-tick" />
}

function resolveMediaUrl(msg: WaMessage): string {
  if (msg.mediaUrl) return msg.mediaUrl
  const raw = msg._raw as Record<string, unknown>
  const content = raw.content && typeof raw.content === 'object' ? raw.content as Record<string, unknown> : {}
  const img = content.imageMessage as Record<string, unknown> | undefined
  const vid = content.videoMessage as Record<string, unknown> | undefined
  return String(img?.url || vid?.url || '')
}

function buildReplyTarget(msg: WaMessage, chat: { chatJid?: string } | null): ReplyTarget {
  const raw = msg._raw as Record<string, unknown>
  const preview = msg.text?.slice(0, 200) || '[Mídia]'
  const authorLabel = msg.direction === 'out' ? 'Você' : String(
    (raw.pushName ?? raw.notifyName ?? (chat as Record<string, unknown> | null)?.['name'] ?? 'Contato') || 'Contato'
  ).trim()
  const mid = String((raw.messageid ?? raw.messageId ?? msg.id) || '').trim()

  let kind: ReplyTarget['kind'] = 'text'
  let mediaLine = ''
  let thumbUrl = ''
  const mt = msg.mediaType?.toLowerCase()
  if (mt === 'image') { kind = 'image'; mediaLine = 'Foto'; thumbUrl = resolveMediaUrl(msg) }
  else if (mt === 'video') { kind = 'video'; mediaLine = 'Vídeo' }
  else if (mt === 'audio') { kind = 'audio'; mediaLine = 'Áudio' }
  else if (mt === 'document') { kind = 'file'; mediaLine = 'Documento' }
  else if (msg.mediaType) { kind = 'file'; mediaLine = msg.mediaType }

  return { id: msg.id, messageid: mid, preview, authorLabel, kind, mediaLine, thumbUrl }
}

// ─── Media content in bubble ──────────────────────────────────────────────────

function MediaContent({ msg, onImageClick }: { msg: WaMessage; onImageClick: (msg: WaMessage) => void }) {
  const mt = msg.mediaType?.toLowerCase() || ''
  const url = resolveMediaUrl(msg)

  if (mt === 'image') {
    return (
      <button
        type="button"
        className="msg-image-trigger"
        aria-label="Abrir imagem"
        onClick={() => onImageClick(msg)}
      >
        {url ? (
          <div className="msg-image-wrap msg-image-wrap--loaded">
            <img
              src={url}
              alt="Imagem"
              className="msg-image msg-image--full is-visible"
              style={{ maxWidth: 280, maxHeight: 220, display: 'block', objectFit: 'cover', borderRadius: 6 }}
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="msg-image-wrap msg-image-wrap--thumb-only"
            style={{ width: 200, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#e9edef' }}
          >
            <Image size={32} style={{ color: '#667781' }} />
          </div>
        )}
      </button>
    )
  }

  if (mt === 'video') {
    return url ? (
      <video
        src={url}
        controls
        className="msg-video"
        style={{ maxWidth: 280, borderRadius: 6, display: 'block' }}
      />
    ) : (
      <span className="msg-text msg-media-label" style={{ color: '#667781', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Video size={14} /> Vídeo
      </span>
    )
  }

  if (mt === 'audio') {
    return url ? (
      <audio controls style={{ width: '100%', maxWidth: 260 }}>
        <source src={url} />
      </audio>
    ) : (
      <span className="msg-text msg-media-label" style={{ color: '#667781', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Music size={14} /> Áudio
      </span>
    )
  }

  if (mt === 'document') {
    const raw = msg._raw as Record<string, unknown>
    const content = raw.content && typeof raw.content === 'object' ? raw.content as Record<string, unknown> : {}
    const docMsg = content.documentMessage as Record<string, unknown> | undefined
    const fileName = String(docMsg?.fileName || msg.text || 'Documento').trim()
    return (
      <a
        href={url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="msg-document-card"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', textDecoration: 'none' }}
      >
        <div className="msg-document-icon"><FileText size={14} /></div>
        <div className="msg-document-texts">
          <strong style={{ color: 'inherit', fontSize: '0.9rem' }}>{fileName}</strong>
        </div>
      </a>
    )
  }

  if (msg.mediaType) {
    return (
      <span className="msg-text msg-media-label" style={{ color: '#667781', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        📎 {msg.mediaType}
      </span>
    )
  }

  return null
}

// ─── Context menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  msg: WaMessage
  onReply: () => void
  onCopy: () => void
  onClose: () => void
  style: React.CSSProperties
}

function BubbleContextMenu({ msg, onReply, onCopy, onClose, style }: ContextMenuProps) {
  return (
    <div
      className="chat-context-menu"
      style={{ position: 'absolute', zIndex: 50, minWidth: 180, ...style }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="chat-context-menu-item"
        onClick={() => { onReply(); onClose() }}
      >
        <Reply size={16} className="chat-context-menu-icon" />
        Responder
      </button>
      {msg.text && (
        <button
          type="button"
          className="chat-context-menu-item"
          onClick={() => { onCopy(); onClose() }}
        >
          <Copy size={16} className="chat-context-menu-icon" />
          Copiar
        </button>
      )}
    </div>
  )
}

// ─── Main MessageBubble ───────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: WaMessage
  onImageClick?: (msg: WaMessage) => void
}

export function MessageBubble({ msg, onImageClick }: MessageBubbleProps) {
  const { setReplyTarget, selectedChat } = useWhatsapp()
  const isOut = msg.direction === 'out'
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hasMedia = Boolean(msg.mediaType)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    // Position relative to wrapper
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const placeRight = x > rect.width / 2
    const placeBelow = y < rect.height / 2
    setMenuPos({
      ...(placeBelow ? { top: y } : { bottom: rect.height - y }),
      ...(placeRight ? { right: 0 } : { left: 0 }),
    })
    setMenuOpen(true)
  }

  const handleReply = () => {
    const target = buildReplyTarget(msg, selectedChat as Record<string, unknown> | null)
    setReplyTarget(target)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text || '')
    } catch {
      // silencioso
    }
  }

  const handleImageClick = (m: WaMessage) => {
    onImageClick?.(m)
  }

  return (
    <div
      ref={wrapperRef}
      className={`message-bubble-wrapper ${isOut ? 'message-out' : 'message-in'}`}
      style={{ position: 'relative' }}
      onContextMenu={handleContextMenu}
      onClick={() => { if (menuOpen) setMenuOpen(false) }}
    >
      <div className={`message-bubble${hasMedia && msg.mediaType === 'image' ? ' message-bubble--image' : ''}`}>
        {/* Quoted/reply context from _raw */}
        {(() => {
          const raw = msg._raw as Record<string, unknown>
          const ctx = raw.contextInfo && typeof raw.contextInfo === 'object' ? raw.contextInfo as Record<string, unknown> : null
          const quotedMsg = ctx?.quotedMessage && typeof ctx.quotedMessage === 'object' ? ctx.quotedMessage as Record<string, unknown> : null
          const quotedText = ctx ? String(quotedMsg?.conversation || ctx.quotedBody || '').trim() : ''
          if (!quotedText) return null
          return (
            <div className="msg-quote">
              <div className="msg-quote-accent" />
              <div className="msg-quote-inner">
                <div className="msg-quote-main">
                  <p className="msg-quote-line msg-quote-line--text">{quotedText}</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Media */}
        {hasMedia && <MediaContent msg={msg} onImageClick={handleImageClick} />}

        {/* Text */}
        {msg.text ? (
          <p className="msg-text" style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {msg.text}
          </p>
        ) : !hasMedia ? (
          <span className="msg-text" style={{ color: '#667781', fontSize: 13 }}>
            [mensagem sem texto]
          </span>
        ) : null}

        {/* Footer */}
        <div className="msg-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
          <span className="msg-time" style={{ fontSize: 11, color: isOut ? 'rgba(17,27,33,0.55)' : '#667781', flexShrink: 0 }}>
            {formatMsgTime(msg.timestamp)}
          </span>
          {isOut && <DeliveryTick status={msg.status} />}
        </div>
      </div>

      {/* Context menu */}
      {menuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setMenuOpen(false)}
          />
          <BubbleContextMenu
            msg={msg}
            onReply={handleReply}
            onCopy={handleCopy}
            onClose={() => setMenuOpen(false)}
            style={menuPos}
          />
        </>
      )}
    </div>
  )
}
