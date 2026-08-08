'use client'
import { useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip, X, Image, FileText, Music } from 'lucide-react'
import { useWhatsapp } from '@/lib/whatsapp/context'
import { MediaComposerModal, useMediaComposer, buildMediaComposerFile } from './MediaComposerModal'

export function ChatFooter() {
  const {
    selectedChat,
    draftText,
    setDraftText,
    sending,
    sendText,
    sendMedia,
    replyTarget,
    clearReply,
  } = useWhatsapp()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const composer = useMediaComposer()

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draftText])

  // Focus textarea when reply target is set
  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus()
  }, [replyTarget])

  if (!selectedChat) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendText()
    }
    if (e.key === 'Escape' && replyTarget) {
      e.preventDefault()
      clearReply()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || [])
    e.target.value = ''
    if (!rawFiles.length) return
    const mediaFiles = rawFiles.map(buildMediaComposerFile)
    composer.openWith(mediaFiles)
  }

  const handleSendMedia = async () => {
    const current = composer.files[composer.activeIndex] ?? composer.files[0]
    if (!current) return
    await sendMedia({ file: current.file, caption: composer.caption })
    composer.close()
  }

  const handleAddMore = () => {
    fileInputRef.current?.click()
  }

  const handleAddMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || [])
    e.target.value = ''
    if (!rawFiles.length) return
    const mediaFiles = rawFiles.map(buildMediaComposerFile)
    composer.addMore(mediaFiles)
  }

  // Icon for reply media kind
  const ReplyIcon = () => {
    if (!replyTarget) return null
    if (replyTarget.kind === 'image') return <Image size={14} style={{ flexShrink: 0 }} />
    if (replyTarget.kind === 'audio') return <Music size={14} style={{ flexShrink: 0 }} />
    if (replyTarget.kind === 'file') return <FileText size={14} style={{ flexShrink: 0 }} />
    return null
  }

  return (
    <div className="chat-footer-shell">
      {/* Reply bar */}
      {replyTarget && (
        <div className="replying-to-bar">
          <div className="replying-to-accent" />
          <div className="replying-to-body">
            <span className="replying-to-author">{replyTarget.authorLabel}</span>
            {replyTarget.kind === 'text' ? (
              <p className="replying-to-preview">{replyTarget.preview}</p>
            ) : (
              <p className="replying-to-preview replying-to-preview--media">
                <ReplyIcon />
                {replyTarget.mediaLine || replyTarget.preview}
              </p>
            )}
          </div>
          {replyTarget.thumbUrl && (
            <img src={replyTarget.thumbUrl} alt="" className="replying-to-thumb" />
          )}
          <button
            type="button"
            className="replying-to-close"
            aria-label="Cancelar resposta"
            onClick={clearReply}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <footer className="chat-footer">
        {/* Attach button */}
        <div className="footer-plus-wrap" style={{ marginRight: 6 }}>
          <button
            type="button"
            className="compose-pill-btn"
            aria-label="Anexar arquivo"
            disabled={sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="compose-pill">
          <textarea
            ref={textareaRef}
            className="compose-input"
            placeholder="Digite uma mensagem"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={sending}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              fontSize: 15,
              lineHeight: '20px',
              color: '#111b21',
              fontFamily: "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              padding: '6px 4px',
              maxHeight: 160,
              overflowY: 'auto',
            }}
          />
        </div>
        <button
          type="button"
          className="btn-icon compose-send-btn"
          aria-label="Enviar mensagem"
          disabled={!draftText.trim() || sending}
          onClick={() => void sendText()}
          style={{
            marginLeft: 8,
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: draftText.trim() ? '#008069' : '#b9c1c7',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: draftText.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {sending ? (
            <Loader2 size={18} style={{ animation: 'chat-sync-spin 1.1s linear infinite' }} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </footer>

      {/* Media Composer Modal */}
      <MediaComposerModal
        open={composer.open}
        files={composer.files}
        activeIndex={composer.activeIndex}
        caption={composer.caption}
        sending={sending}
        onClose={composer.close}
        onSend={() => void handleSendMedia()}
        onAddMore={handleAddMore}
        onSelectFile={composer.setActiveIndex}
        onCaptionChange={composer.setCaption}
      />

      {/* Hidden input for "add more" inside composer */}
      {composer.open && (
        <input
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          multiple
          style={{ display: 'none' }}
          onChange={handleAddMoreChange}
          ref={composer.addMoreInputRef}
        />
      )}
    </div>
  )
}
