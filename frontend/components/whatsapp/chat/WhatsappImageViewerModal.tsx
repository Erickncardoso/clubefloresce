'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react'
import type { WaMessage } from '@/lib/whatsapp/messages'

interface Props {
  open: boolean
  items: WaMessage[]
  index: number
  senderName?: string
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelect: (idx: number) => void
}

function formatTs(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoje às ${time}`
  return `${d.toLocaleDateString('pt-BR')} às ${time}`
}

function resolveDisplayUrl(msg: WaMessage | null): string {
  if (!msg) return ''
  const raw = msg._raw as Record<string, unknown>
  // Try nested content paths first
  const content = raw.content && typeof raw.content === 'object' ? raw.content as Record<string, unknown> : {}
  const imgMsg = content.imageMessage as Record<string, unknown> | undefined
  const videoMsg = content.videoMessage as Record<string, unknown> | undefined
  const docMsg = content.documentMessage as Record<string, unknown> | undefined

  return (
    String(msg.mediaUrl || '') ||
    String(imgMsg?.url || imgMsg?.jpegThumbnail || '') ||
    String(videoMsg?.url || '') ||
    String(docMsg?.url || '') ||
    ''
  )
}

function resolveDocumentName(msg: WaMessage): string {
  const raw = msg._raw as Record<string, unknown>
  const content = raw.content && typeof raw.content === 'object' ? raw.content as Record<string, unknown> : {}
  const docMsg = content.documentMessage as Record<string, unknown> | undefined
  return String(docMsg?.fileName || msg.text || 'Documento').trim()
}

function resolveDocumentBadge(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'PDF'
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'DOC'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'XLS'
  return 'DOC'
}

export function WhatsappImageViewerModal({ open, items, index, senderName = '', onClose, onPrev, onNext, onSelect }: Props) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  const current = items[index] ?? null
  const mediaType = String(current?.mediaType || '').toLowerCase()
  const isVideo = mediaType === 'video'
  const isDocument = mediaType === 'document'
  const displayUrl = resolveDisplayUrl(current)

  // Reset zoom/rotation when image changes
  useEffect(() => { setZoom(1); setRotation(0) }, [open, index])

  // Scroll active thumb into view
  useEffect(() => {
    if (!open) return
    const el = thumbRefs.current[index]
    el?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [open, index, items.length])

  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev() }
    if (e.key === 'ArrowRight') { e.preventDefault(); onNext() }
  }, [open, onClose, onPrev, onNext])

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleKeydown])

  const handleDownload = () => {
    if (!displayUrl) return
    const a = document.createElement('a')
    a.href = displayUrl
    a.download = current ? (resolveDocumentName(current) || '') : ''
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const senderInitial = (senderName.charAt(0) || '?').toUpperCase()
  const timestampLabel = current?.timestamp ? formatTs(current.timestamp) : ''
  const docName = current ? resolveDocumentName(current) : ''
  const docBadge = resolveDocumentBadge(docName)

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="msg-image-viewer msg-image-viewer--light"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de mídia"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <header className="msg-image-viewer-top">
        <div className="msg-image-viewer-identity">
          <span className="msg-image-viewer-avatar msg-image-viewer-avatar--fallback" aria-hidden="true">
            {senderInitial}
          </span>
          <div className="msg-image-viewer-identity-text">
            <div className="msg-image-viewer-sender">{senderName || 'Contato'}</div>
            {timestampLabel && <div className="msg-image-viewer-meta">{timestampLabel}</div>}
          </div>
        </div>
        <div className="msg-image-viewer-toolbar">
          {!isVideo && (
            <>
              <button type="button" className="msg-image-viewer-tool" title="Diminuir zoom" onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                <ZoomOut className="msg-image-viewer-tool-icon" />
              </button>
              <button type="button" className="msg-image-viewer-tool" title="Aumentar zoom" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                <ZoomIn className="msg-image-viewer-tool-icon" />
              </button>
              <button type="button" className="msg-image-viewer-tool" title="Girar" onClick={() => setRotation((r) => (r - 90 + 360) % 360)}>
                <RotateCcw className="msg-image-viewer-tool-icon" />
              </button>
            </>
          )}
          <button type="button" className="msg-image-viewer-tool" title="Baixar" onClick={handleDownload}>
            <Download className="msg-image-viewer-tool-icon" />
          </button>
          <button type="button" className="msg-image-viewer-close" title="Fechar" onClick={onClose}>
            <X className="msg-image-viewer-close-icon" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="msg-image-viewer-body">
        <div className="msg-image-viewer-stage">
          {items.length > 1 && (
            <button type="button" className="msg-image-viewer-nav msg-image-viewer-nav--prev" onClick={onPrev}>‹</button>
          )}

          {isVideo && displayUrl ? (
            <video
              key={`viewer-video-${current?.id || index}`}
              src={displayUrl}
              className="msg-image-viewer-photo msg-image-viewer-video"
              controls
              playsInline
            />
          ) : displayUrl && !isDocument ? (
            <img
              src={displayUrl}
              className="msg-image-viewer-photo"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              alt="Imagem ampliada"
              draggable={false}
            />
          ) : isDocument ? (
            <div className="msg-image-viewer-doc-stage">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  className="msg-image-viewer-photo msg-image-viewer-doc-preview"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  alt="Prévia do documento"
                />
              ) : (
                <div className="msg-image-viewer-doc-fallback">
                  <span className="msg-image-viewer-doc-badge">{docBadge}</span>
                  <p className="msg-image-viewer-doc-name">{docName}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#667781', fontSize: 14 }}>Mídia indisponível</div>
          )}

          {items.length > 1 && (
            <button type="button" className="msg-image-viewer-nav msg-image-viewer-nav--next" onClick={onNext}>›</button>
          )}
        </div>

        {current?.text && (
          <p className="msg-image-viewer-caption">{current.text}</p>
        )}
      </div>

      {/* Strip */}
      {items.length > 1 && (
        <div ref={stripRef} className="msg-image-viewer-strip">
          {items.map((item, idx) => {
            const thumbUrl = resolveDisplayUrl(item)
            const mType = String(item.mediaType || '').toLowerCase()
            const isVid = mType === 'video'
            const isDoc = mType === 'document'

            return (
              <button
                key={item.id || idx}
                ref={(el) => { thumbRefs.current[idx] = el }}
                type="button"
                className={`msg-image-viewer-thumb${idx === index ? ' is-active' : ''}`}
                onClick={() => onSelect(idx)}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt="" decoding="async" loading="lazy" />
                ) : (
                  <span className="msg-image-viewer-thumb-fallback">
                    {isVid ? 'Vídeo' : isDoc ? 'DOC' : 'Img'}
                  </span>
                )}
                {isVid && <span className="msg-image-viewer-thumb-badge" aria-hidden="true">▶</span>}
                {isDoc && <span className="msg-image-viewer-thumb-badge msg-image-viewer-thumb-badge--doc" aria-hidden="true">DOC</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Hook para gerenciar o estado do ImageViewer */
export function useImageViewer() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<WaMessage[]>([])
  const [index, setIndex] = useState(0)

  const openViewer = (mediaMessages: WaMessage[], startIndex = 0) => {
    setItems(mediaMessages)
    setIndex(Math.max(0, Math.min(startIndex, mediaMessages.length - 1)))
    setOpen(true)
  }

  const close = () => setOpen(false)
  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(items.length - 1, i + 1))
  const select = (idx: number) => setIndex(Math.max(0, Math.min(items.length - 1, idx)))

  return { open, items, index, openViewer, close, prev, next, select }
}
