'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader } from 'lucide-react'
import type { QuickReply, SaveQuickReplyPayload } from '@/lib/whatsapp/quick-replies'
import styles from './QuickReplyFormModal.module.scss'

interface Props {
  open: boolean
  saving: boolean
  error: string
  reply: QuickReply | null
  onCancel: () => void
  onSave: (payload: SaveQuickReplyPayload) => void
}

const EMPTY_FORM: SaveQuickReplyPayload = {
  id: undefined,
  shortCut: '',
  type: 'text',
  text: '',
  file: '',
  docName: '',
}

export function QuickReplyFormModal({ open, saving, error, reply, onCancel, onSave }: Props) {
  const [form, setForm] = useState<SaveQuickReplyPayload>(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm({
      id: reply?.id || undefined,
      shortCut: String(reply?.shortCut || '').trim(),
      type: String(reply?.type || 'text').toLowerCase(),
      text: String(reply?.text || '').trim(),
      file: String(reply?.file || '').trim(),
      docName: String(reply?.docName || '').trim(),
    })
  }, [open, reply])

  const title = reply?.id ? 'Editar resposta rápida' : 'Adicionar resposta rápida'

  const set = (key: keyof SaveQuickReplyPayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: form.id || undefined,
      shortCut: form.shortCut.trim(),
      type: form.type,
      text: form.text.trim(),
      file: form.file.trim(),
      docName: form.docName.trim(),
    })
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onCancel}>
            <X size={20} />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Atalho</span>
            <div className={styles.shortcutRow}>
              <input
                className={styles.input}
                type="text"
                maxLength={25}
                required
                placeholder="saudacao"
                value={form.shortCut}
                onChange={(e) => set('shortCut', e.target.value)}
              />
              <span className={styles.counter}>{form.shortCut.length}</span>
            </div>
          </label>

          {form.type !== 'text' && (
            <label className={styles.field}>
              <span className={styles.label}>Tipo</span>
              <select
                className={styles.input}
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
              >
                <option value="text">Texto</option>
                <option value="image">Imagem</option>
                <option value="document">Documento</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
              </select>
            </label>
          )}

          {form.type !== 'text' && (
            <label className={styles.field}>
              <span className={styles.label}>URL do arquivo</span>
              <input
                className={styles.input}
                type="text"
                required
                placeholder="https://..."
                value={form.file}
                onChange={(e) => set('file', e.target.value)}
              />
            </label>
          )}

          {form.type === 'document' && (
            <label className={styles.field}>
              <span className={styles.label}>Nome do arquivo (opcional)</span>
              <input
                className={styles.input}
                type="text"
                value={form.docName}
                onChange={(e) => set('docName', e.target.value)}
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.label}>
              {form.type === 'text' ? 'Mensagem da resposta' : 'Legenda (opcional)'}
            </span>
            <textarea
              className={styles.textarea}
              rows={5}
              required={form.type === 'text'}
              placeholder="Digite a mensagem..."
              value={form.text}
              onChange={(e) => set('text', e.target.value)}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <footer className={styles.footer}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving}
            >
              {saving && <Loader size={16} className={styles.spinner} />}
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
