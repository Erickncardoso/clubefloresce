'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApiError } from '@/lib/api'
import { formatRelative } from '@/lib/patient-slug'
import {
  addDiaryComment,
  fetchDiaryFeed,
  toggleDiaryLike,
  type DiaryComment,
  type DiaryFeedEntry,
} from '@/lib/diary-feed'
import { DiaryFeed } from '@/components/diary/DiaryFeed'
import styles from './diario.module.scss'

const PAGE_SIZE = 10

function DiarioPageInner() {
  const searchParams = useSearchParams()
  const focusEntryId = searchParams.get('post')

  const [entries, setEntries] = useState<DiaryFeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [likingId, setLikingId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextSkip, setNextSkip] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchDiaryFeed(PAGE_SIZE, 0)
      setEntries(data.entries)
      setHasMore(data.hasMore)
      setNextSkip(data.nextSkip)
      setError('')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Não foi possível carregar o diário.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    if (!hasMore || nextSkip == null || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await fetchDiaryFeed(PAGE_SIZE, nextSkip)
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id))
        const extra = data.entries.filter((e) => !seen.has(e.id))
        return [...prev, ...extra]
      })
      setHasMore(data.hasMore)
      setNextSkip(data.nextSkip)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Não foi possível carregar mais fotos.'
      setError(msg)
    } finally {
      setLoadingMore(false)
    }
  }

  async function onToggleLike(entryId: string) {
    setLikingId(entryId)
    const prev = entries.find((e) => e.id === entryId)
    if (prev) {
      setEntries((list) =>
        list.map((e) =>
          e.id === entryId
            ? {
                ...e,
                likedByMe: !e.likedByMe,
                likesCount: e.likedByMe ? Math.max(0, e.likesCount - 1) : e.likesCount + 1,
              }
            : e,
        ),
      )
    }
    try {
      const res = await toggleDiaryLike(entryId)
      setEntries((list) =>
        list.map((e) =>
          e.id === entryId
            ? { ...e, likedByMe: res.likedByMe, likesCount: res.likesCount }
            : e,
        ),
      )
    } catch {
      if (prev) {
        setEntries((list) => list.map((e) => (e.id === entryId ? prev : e)))
      }
    } finally {
      setLikingId(null)
    }
  }

  function onChangeDraft(entryId: string, value: string) {
    setEntries((list) =>
      list.map((e) => (e.id === entryId ? { ...e, newComment: value } : e)),
    )
  }

  async function onSubmitComment(entryId: string) {
    const entry = entries.find((e) => e.id === entryId)
    const content = entry?.newComment?.trim()
    if (!content) return
    const comment = await addDiaryComment(entryId, content)
    setEntries((list) =>
      list.map((e) => {
        if (e.id !== entryId) return e
        const preview = [...(e.commentsPreview || []), comment].slice(-2)
        return {
          ...e,
          newComment: '',
          commentsCount: e.commentsCount + 1,
          commentsPreview: preview,
        }
      }),
    )
  }

  function onCommentDeleted(entryId: string, commentId: string) {
    setEntries((list) =>
      list.map((e) => {
        if (e.id !== entryId) return e
        return {
          ...e,
          commentsCount: Math.max(0, e.commentsCount - 1),
          commentsPreview: (e.commentsPreview || []).filter((c) => c.id !== commentId),
        }
      }),
    )
  }

  function onCommentUpdated(entryId: string, comment: DiaryComment) {
    setEntries((list) =>
      list.map((e) => {
        if (e.id !== entryId) return e
        return {
          ...e,
          commentsPreview: (e.commentsPreview || []).map((c) =>
            c.id === comment.id ? { ...c, content: comment.content } : c,
          ),
        }
      }),
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>Diário</h1>
        <p>Fotos recentes das pacientes — curta e comente.</p>
      </header>
      <DiaryFeed
        entries={entries}
        loading={loading}
        error={error}
        likingId={likingId}
        formatDistance={formatRelative}
        onToggleLike={onToggleLike}
        onChangeDraft={onChangeDraft}
        onSubmitComment={onSubmitComment}
        onCommentDeleted={onCommentDeleted}
        onCommentUpdated={onCommentUpdated}
        onRetry={load}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        focusEntryId={focusEntryId}
      />
    </div>
  )
}

export default function DiarioPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <header className={styles.head}>
            <h1>Diário</h1>
            <p>Fotos recentes das pacientes — curta e comente.</p>
          </header>
        </div>
      }
    >
      <DiarioPageInner />
    </Suspense>
  )
}
