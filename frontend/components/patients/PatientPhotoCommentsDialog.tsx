'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { AnimatedDialog } from '@/components/overlays'
import {
  addDiaryComment,
  fetchDiaryComments,
  formatDiaryCommentWhen,
  type DiaryComment,
} from '@/lib/diary-feed'
import styles from './PatientPhotoCommentsDialog.module.scss'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId: string | null
  mealLabel?: string | null
  onCommentAdded?: () => void
}

export function PatientPhotoCommentsDialog({
  open,
  onOpenChange,
  entryId,
  mealLabel,
  onCommentAdded,
}: Props) {
  const [comments, setComments] = useState<DiaryComment[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open || !entryId) {
      setComments([])
      setDraft('')
      return
    }
    let alive = true
    setLoading(true)
    fetchDiaryComments(entryId)
      .then((list) => {
        if (alive) setComments(list)
      })
      .catch(() => {
        if (alive) setComments([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open, entryId])

  async function submit() {
    if (!entryId || !draft.trim() || sending) return
    setSending(true)
    try {
      const comment = await addDiaryComment(entryId, draft.trim())
      setComments((prev) => [...prev, comment])
      setDraft('')
      onCommentAdded?.()
    } catch {
      /* ignore — toast optional */
    } finally {
      setSending(false)
    }
  }

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mealLabel || 'Comentários'}
      bare
      contentClassName={styles.card}
      overlayClassName={styles.overlay}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>{mealLabel || 'Comentários'}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Fechar"
          onClick={() => onOpenChange(false)}
        >
          ×
        </button>
      </header>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.empty}>
            <Loader2 size={16} className={styles.spin} aria-hidden /> Carregando…
          </p>
        ) : comments.length ? (
          comments.map((c) => (
            <article key={c.id} className={styles.row}>
              <strong>{c.author?.name || 'Nutri'}</strong>
              <p>{c.content}</p>
              <time dateTime={c.createdAt}>{formatDiaryCommentWhen(c.createdAt)}</time>
            </article>
          ))
        ) : (
          <p className={styles.empty}>Nenhum comentário ainda.</p>
        )}
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <textarea
          className={styles.input}
          rows={2}
          value={draft}
          placeholder="Escreva um comentário…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey) return
            e.preventDefault()
            void submit()
          }}
        />
        <button
          type="submit"
          className={styles.send}
          disabled={!draft.trim() || sending}
          aria-label="Enviar comentário"
        >
          {sending ? <Loader2 size={16} className={styles.spin} aria-hidden /> : <Send size={16} />}
        </button>
      </form>
    </AnimatedDialog>
  )
}
