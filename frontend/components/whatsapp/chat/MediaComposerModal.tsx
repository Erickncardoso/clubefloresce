'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Send, Loader2, Plus } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface MediaComposerFile {
  id: string
  file: File
  previewUrl: string
  type: 'image' | 'video' | 'document' | 'audio'
  name: string
  sizeLabel: string
  extensionLabel: string
}

interface Props {
  open: boolean
  files: MediaComposerFile[]
  activeIndex: number
  caption: string
  sending: boolean
  onClose: () => void
  onSend: () => void
  onAddMore: () => void
  onSelectFile: (idx: number) => void
  onCaptionChange: (val: string) => void
}

function buildLabel(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC'
  return ext.slice(0, 4)
}

function buildSize(file: File): string {
  const kb = file.size / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function buildMediaComposerFile(file: File): MediaComposerFile {
  const id = `mc_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/')
    ? URL.createObjectURL(file)
    : ''
  let type: MediaComposerFile['type'] = 'document'
  if (file.type.startsWith('image/')) type = 'image'
  else if (file.type.startsWith('video/')) type = 'video'
  else if (file.type.startsWith('audio/')) type = 'audio'

  return {
    id,
    file,
    previewUrl,
    type,
    name: file.name,
    sizeLabel: buildSize(file),
    extensionLabel: buildLabel(file),
  }
}

export function MediaComposerModal({
  open,
  files,
  activeIndex,
  caption,
  sending,
  onClose,
  onSend,
  onAddMore,
  onSelectFile,
  onCaptionChange,
}: Props) {
  const captionRef = useRef<HTMLInputElement>(null)
  const current = files[activeIndex] ?? files[0] ?? null

  useEffect(() => {
    if (open) setTimeout(() => captionRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="media-composer-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="media-composer-modal">
        {/* Header */}
        <header className="media-composer-header">
          <button type="button" className="media-composer-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
          <h3>{current?.name || 'Prévia indisponível'}</h3>
        </header>

        {/* Preview */}
        <section className="media-composer-preview">
          {current?.previewUrl && current.type === 'image' ? (
            <img
              src={current.previewUrl}
              alt="Prévia"
              className="media-composer-preview-image"
            />
          ) : current?.previewUrl && current.type === 'video' ? (
            <video src={current.previewUrl} controls className="media-composer-preview-image" />
          ) : (
            <div className="media-composer-preview-fallback">
              <div className="media-composer-preview-icon">{current?.extensionLabel || 'DOC'}</div>
              <strong>Prévia indisponível</strong>
              <small>{current?.sizeLabel} {current?.extensionLabel}</small>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="media-composer-footer">
          <div className="media-composer-caption-row">
            <input
              ref={captionRef}
              type="text"
              className="media-composer-caption"
              placeholder="Adicionar legenda…"
              value={caption}
              disabled={sending}
              onChange={(e) => onCaptionChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            />
          </div>
          <div className="media-composer-actions">
            <div className="media-composer-file-strip">
              {files.map((f, idx) => (
                <button
                  key={f.id}
                  type="button"
                  className={`media-composer-file-pill${idx === activeIndex ? ' is-active' : ''}`}
                  onClick={() => onSelectFile(idx)}
                >
                  {f.extensionLabel}
                </button>
              ))}
              <button
                type="button"
                className="media-composer-file-pill media-composer-file-pill--plus"
                onClick={onAddMore}
                aria-label="Adicionar mais arquivos"
              >
                <Plus size={18} />
              </button>
            </div>

            <button
              type="button"
              className="media-composer-send"
              disabled={sending || !files.length}
              aria-label={sending ? 'Enviando…' : 'Enviar'}
              onClick={onSend}
            >
              {sending ? (
                <Loader2 size={20} className="media-composer-send-loading-icon" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

/** Hook para gerenciar o estado do MediaComposer */
export function useMediaComposer() {
  const [files, setFiles] = useState<MediaComposerFile[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [caption, setCaption] = useState('')
  const [open, setOpen] = useState(false)
  const addMoreInputRef = useRef<HTMLInputElement>(null)

  const openWith = (incoming: MediaComposerFile[]) => {
    // Revoke URLs antigas
    files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
    setFiles(incoming)
    setActiveIndex(0)
    setCaption('')
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
    setFiles([])
    setCaption('')
  }

  const addMore = (incoming: MediaComposerFile[]) => {
    setFiles((prev) => [...prev, ...incoming])
  }

  return { open, files, activeIndex, caption, setCaption, setActiveIndex, openWith, close, addMore, addMoreInputRef }
}
