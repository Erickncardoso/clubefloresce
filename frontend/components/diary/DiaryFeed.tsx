'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Pencil, Send, Trash2, X } from 'lucide-react'
import { getCachedUser } from '@/lib/auth'
import {
  deleteDiaryComment,
  fetchDiaryComments,
  formatDiaryCommentWhen,
  updateDiaryComment,
  type DiaryComment,
  type DiaryFeedEntry,
} from '@/lib/diary-feed'
import { AnimatedDialog } from '@/components/overlays'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { DiaryFeedCard } from './DiaryFeedCard'
import styles from './DiaryFeed.module.scss'

function shortName(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Paciente'
  return parts.slice(0, 2).join(' ')
}

type Props = {
  entries: DiaryFeedEntry[]
  loading?: boolean
  error?: string
  likingId?: string | null
  formatDistance: (date: string) => string
  onToggleLike: (entryId: string) => void
  onChangeDraft: (entryId: string, value: string) => void
  onSubmitComment: (entryId: string) => void | Promise<void>
  onCommentDeleted?: (entryId: string, commentId: string) => void
  onCommentUpdated?: (entryId: string, comment: DiaryComment) => void
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  focusEntryId?: string | null
}

export function DiaryFeed({
  entries,
  loading,
  error,
  likingId,
  formatDistance,
  onToggleLike,
  onChangeDraft,
  onSubmitComment,
  onCommentDeleted,
  onCommentUpdated,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
  focusEntryId = null,
}: Props) {
  const [lightboxUrl, setLightboxUrl] = useState('')
  const [commentEntryId, setCommentEntryId] = useState<string | null>(null)
  const [modalComments, setModalComments] = useState<DiaryComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [sending, setSending] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const focusedOnce = useRef<string | null>(null)
  const currentUserId = getCachedUser()?.id || null

  const commentEntry = commentEntryId
    ? entries.find((e) => e.id === commentEntryId) || null
    : null

  // Only handle lightbox Escape — comment dialog Escape is handled via onOpenChange
  useEffect(() => {
    if (!lightboxUrl) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxUrl('')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxUrl])

  useEffect(() => {
    if (!focusEntryId || loading) return
    if (focusedOnce.current === focusEntryId) return
    const el = document.getElementById(`diary-post-${focusEntryId}`)
    if (!el) return
    focusedOnce.current = focusEntryId
    setHighlightId(focusEntryId)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = window.setTimeout(() => setHighlightId(null), 2400)
    return () => window.clearTimeout(t)
  }, [focusEntryId, loading, entries])

  useEffect(() => {
    if (!commentEntryId) {
      setModalComments([])
      setEditingCommentId(null)
      setEditDraft('')
      return
    }
    let alive = true
    setLoadingComments(true)
    fetchDiaryComments(commentEntryId)
      .then((list) => {
        if (alive) setModalComments(list)
      })
      .catch(() => {
        if (alive) setModalComments(commentEntry?.commentsPreview || [])
      })
      .finally(() => {
        if (alive) setLoadingComments(false)
      })
    const t = window.setTimeout(() => commentInputRef.current?.focus(), 40)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reconsulta ao abrir o entryId
  }, [commentEntryId])

  async function submitComment(entryId: string) {
    if (!entryId || sending) return
    setSending(true)
    try {
      await onSubmitComment(entryId)
      const list = await fetchDiaryComments(entryId)
      setModalComments(list)
    } catch {
      /* keep open with draft */
    } finally {
      setSending(false)
    }
  }

  function startEditComment(comment: DiaryComment) {
    setEditingCommentId(comment.id)
    setEditDraft(comment.content)
  }

  function cancelEditComment() {
    setEditingCommentId(null)
    setEditDraft('')
  }

  async function saveEditComment() {
    if (!commentEntryId || !editingCommentId || !editDraft.trim() || savingEdit) return
    setSavingEdit(true)
    try {
      const updated = await updateDiaryComment(editingCommentId, editDraft.trim())
      setModalComments((list) =>
        list.map((c) => (c.id === updated.id ? { ...c, ...updated, content: updated.content } : c)),
      )
      onCommentUpdated?.(commentEntryId, updated)
      cancelEditComment()
    } catch {
      /* keep draft */
    } finally {
      setSavingEdit(false)
    }
  }

  async function removeComment(commentId: string) {
    if (!commentEntryId || deletingCommentId) return
    setConfirmingDeleteId(null)
    setDeletingCommentId(commentId)
    try {
      await deleteDiaryComment(commentId)
      setModalComments((list) => list.filter((c) => c.id !== commentId))
      if (editingCommentId === commentId) cancelEditComment()
      onCommentDeleted?.(commentEntryId, commentId)
    } catch {
      /* keep */
    } finally {
      setDeletingCommentId(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.skeletonGrid} aria-busy>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <p>{error}</p>
        {onRetry ? (
          <button type="button" className={styles.send} onClick={onRetry}>
            Tentar de novo
          </button>
        ) : null}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className={styles.empty}>
        <p>Ainda não há fotos no diário</p>
      </div>
    )
  }

  const patient = commentEntry?.patient

  return (
    <>
      <div className={styles.feed}>
        {entries.map((entry, index) => (
          <DiaryFeedCard
            key={entry.id}
            entry={entry}
            index={index}
            liking={likingId === entry.id}
            formatDistance={formatDistance}
            onToggleLike={onToggleLike}
            onOpenPhoto={setLightboxUrl}
            onOpenComment={setCommentEntryId}
            commenting={commentEntryId === entry.id}
            highlight={highlightId === entry.id}
          />
        ))}
        {likingId ? (
          <span className="sr-only" aria-live="polite">
            <Loader2 />
            Atualizando…
          </span>
        ) : null}
      </div>

      {hasMore && onLoadMore ? (
        <div className={styles.moreWrap}>
          <button
            type="button"
            className={styles.moreBtn}
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className={styles.spin} aria-hidden />
                Carregando…
              </>
            ) : (
              'Ver mais'
            )}
          </button>
        </div>
      ) : null}

      {/* Comment modal — Radix Dialog handles backdrop, centering and Escape */}
      <AnimatedDialog
        open={!!commentEntryId}
        onOpenChange={(o) => {
          if (!o) {
            // First Escape cancels editing; second Escape closes the dialog
            if (editingCommentId) {
              cancelEditComment()
            } else {
              setCommentEntryId(null)
            }
          }
        }}
        title="Comentários"
        contentClassName={styles.commentOnPhoto}
      >
        {commentEntry ? (
          <>
            <div className={styles.commentOnPhotoHead}>
              <div className={styles.commentPatientChip}>
                <PatientAvatar src={patient?.avatar} name={patient?.name} size="xs" circle />
                <span>{shortName(patient?.name)}</span>
              </div>
              <button
                type="button"
                className={styles.commentOnPhotoClose}
                aria-label="Fechar"
                onClick={() => setCommentEntryId(null)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className={styles.commentOnPhotoList}>
              {loadingComments ? (
                <p className={styles.commentListEmpty}>
                  <Loader2 size={16} className={styles.spin} aria-hidden /> Carregando…
                </p>
              ) : modalComments.length ? (
                modalComments.map((c) => {
                  const isMine = Boolean(currentUserId && c.author?.id === currentUserId)
                  const isEditing = editingCommentId === c.id
                  const when =
                    typeof c.createdAt === 'string'
                      ? c.createdAt
                      : c.createdAt
                        ? new Date(c.createdAt).toISOString()
                        : ''
                  return (
                    <div key={c.id} className={styles.commentRow}>
                      <PatientAvatar src={c.author?.avatar} name={c.author?.name} size="xs" circle />
                      <div className={styles.commentBody}>
                        <div className={styles.commentMeta}>
                          <strong>{shortName(c.author?.name) || 'Nutri'}</strong>
                          {when ? (
                            <time className={styles.commentWhen} dateTime={when}>
                              {formatDiaryCommentWhen(when)}
                            </time>
                          ) : null}
                          {isMine && !isEditing ? (
                            <div className={styles.commentActions}>
                              <button
                                type="button"
                                className={styles.commentActionBtn}
                                aria-label="Editar comentário"
                                onClick={() => startEditComment(c)}
                              >
                                <Pencil size={12} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className={styles.commentActionBtn}
                                aria-label="Apagar comentário"
                                disabled={deletingCommentId === c.id}
                                onClick={() => setConfirmingDeleteId(c.id)}
                              >
                                {deletingCommentId === c.id ? (
                                  <Loader2 size={12} className={styles.spin} aria-hidden />
                                ) : (
                                  <Trash2 size={12} aria-hidden />
                                )}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {isEditing ? (
                          <div className={styles.commentEditBox}>
                            <textarea
                              className={styles.commentEditInput}
                              rows={2}
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  cancelEditComment()
                                  return
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  void saveEditComment()
                                }
                              }}
                            />
                            <div className={styles.commentEditActions}>
                              <button
                                type="button"
                                className={styles.commentEditCancel}
                                onClick={cancelEditComment}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className={styles.commentEditSave}
                                disabled={!editDraft.trim() || savingEdit}
                                onClick={() => void saveEditComment()}
                              >
                                {savingEdit ? (
                                  <Loader2 size={12} className={styles.spin} aria-hidden />
                                ) : (
                                  <Check size={12} aria-hidden />
                                )}
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span>{c.content}</span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className={styles.commentListEmpty}>Nenhum comentário ainda.</p>
              )}
            </div>

            <form
              className={styles.commentOnPhotoForm}
              onSubmit={(e) => {
                e.preventDefault()
                void submitComment(commentEntryId!)
              }}
            >
              <textarea
                ref={commentInputRef}
                className={styles.commentOnPhotoInput}
                rows={2}
                value={commentEntry.newComment || ''}
                placeholder="Escreva um comentário…"
                onChange={(e) => onChangeDraft(commentEntryId!, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || e.shiftKey) return
                  e.preventDefault()
                  void submitComment(commentEntryId!)
                }}
              />
              <button
                type="submit"
                className={styles.commentOnPhotoSend}
                disabled={!commentEntry.newComment?.trim() || sending}
              >
                <Send size={14} aria-hidden />
                Enviar
              </button>
            </form>
          </>
        ) : null}
      </AnimatedDialog>

      {/* Lightbox keeps portal — skip per instructions */}
      {lightboxUrl && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label="Foto ampliada"
              onClick={() => setLightboxUrl('')}
            >
              <button
                type="button"
                className={styles.lightboxClose}
                aria-label="Fechar"
                onClick={() => setLightboxUrl('')}
              >
                <X size={18} aria-hidden />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt=""
                className={styles.lightboxImg}
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}

      {/* Delete confirm — Radix Dialog handles backdrop and Escape */}
      <AnimatedDialog
        open={!!confirmingDeleteId}
        onOpenChange={(o) => !o && setConfirmingDeleteId(null)}
        title="Confirmar exclusão"
        contentClassName={styles.deleteDialog}
      >
        <p className={styles.deleteDialogText}>Apagar este comentário?</p>
        <div className={styles.deleteDialogActions}>
          <button
            type="button"
            className={styles.deleteDialogCancel}
            onClick={() => setConfirmingDeleteId(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.deleteDialogConfirm}
            disabled={!!deletingCommentId}
            onClick={() => confirmingDeleteId && void removeComment(confirmingDeleteId)}
          >
            {deletingCommentId ? (
              <Loader2 size={13} className={styles.spin} aria-hidden />
            ) : null}
            Apagar
          </button>
        </div>
      </AnimatedDialog>
    </>
  )
}
