'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { isManagedVideoUrl, syncLessonTranscription } from '@/lib/courses'
import {
  getTranscriptionDisplayLines,
  getTranscriptionLineState,
  isKaraokeWordSpoken,
  splitTranscriptionWords,
} from '@/lib/transcription'
import styles from './LessonTranscriptionPanel.module.scss'

type Props = {
  lessonId: string
  videoUrl?: string
  transcription?: unknown
  currentTime?: number
  canSync?: boolean
  onSeek?: (seconds: number) => void
  onUpdated?: (transcription: unknown) => void
}

function KaraokeText({
  text,
  progress,
  active,
}: {
  text: string
  progress: number
  active: boolean
}) {
  const parts = useMemo(() => splitTranscriptionWords(text), [text])
  const wordCount = useMemo(
    () => parts.filter((part) => part.trim().length > 0).length,
    [parts],
  )

  if (!active) return <>{text}</>

  let wordIndex = 0
  return (
    <>
      {parts.map((part, index) => {
        if (!part.trim()) return <span key={`s-${index}`}>{part}</span>
        const currentWord = wordIndex
        wordIndex += 1
        const spoken = isKaraokeWordSpoken(currentWord, wordCount, progress)
        return (
          <span
            key={`w-${index}`}
            className={spoken ? styles.wordSpoken : styles.wordPending}
          >
            {part}
          </span>
        )
      })}
    </>
  )
}

export function LessonTranscriptionPanel({
  lessonId,
  videoUrl = '',
  transcription,
  currentTime = 0,
  canSync = false,
  onSeek,
  onUpdated,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const [syncing, setSyncing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [localTranscription, setLocalTranscription] = useState<unknown>(transcription)
  const lastScrolled = useRef(-1)

  useEffect(() => {
    setLocalTranscription(transcription)
    setStatusMessage('')
    setSearchQuery('')
    lastScrolled.current = -1
  }, [lessonId, transcription])

  const hasManagedVideo = isManagedVideoUrl(videoUrl)
  const displayLines = useMemo(
    () => getTranscriptionDisplayLines(localTranscription),
    [localTranscription],
  )

  const filteredLines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return displayLines
    return displayLines.filter(
      (chunk) => chunk.text.toLowerCase().includes(query) || chunk.time.toLowerCase().includes(query),
    )
  }, [displayLines, searchQuery])

  const lineStates = useMemo(
    () =>
      filteredLines.map((chunk, index) =>
        getTranscriptionLineState(chunk, index, filteredLines, currentTime),
      ),
    [filteredLines, currentTime],
  )

  useEffect(() => {
    if (searchQuery.trim()) return
    const activeIndex = lineStates.findIndex((state) => state.state === 'active')
    if (activeIndex < 0 || activeIndex === lastScrolled.current) return
    lastScrolled.current = activeIndex
    const list = listRef.current
    if (!list) return
    const rows = list.querySelectorAll('[data-row]')
    const activeRow = rows[activeIndex] as HTMLElement | undefined
    if (!activeRow) return
    const rowTop = activeRow.offsetTop
    const rowBottom = rowTop + activeRow.offsetHeight
    const viewTop = list.scrollTop
    const viewBottom = viewTop + list.clientHeight
    const padding = 10
    if (rowTop < viewTop + padding) list.scrollTop = Math.max(0, rowTop - padding)
    else if (rowBottom > viewBottom - padding) {
      list.scrollTop = rowBottom - list.clientHeight + padding
    }
  }, [lineStates, searchQuery])

  async function onSync() {
    if (!canSync || syncing) return
    setSyncing(true)
    setStatusMessage('')
    try {
      const result = await syncLessonTranscription(lessonId)
      if (Array.isArray(result?.transcription) && result.transcription.length) {
        setLocalTranscription(result.transcription)
        onUpdated?.(result.transcription)
        return
      }
      if (result?.status === 'pending') {
        setStatusMessage(
          'A transcrição ainda está sendo gerada. Tente novamente em alguns minutos.',
        )
        return
      }
      setStatusMessage('Não foi possível obter a transcrição desta aula.')
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Erro ao atualizar transcrição.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            placeholder="Buscar trecho na aula..."
            autoComplete="off"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        {canSync ? (
          <button type="button" className={styles.sync} disabled={syncing} onClick={() => void onSync()}>
            <RefreshCw size={14} className={syncing ? styles.spin : undefined} />
            {syncing ? 'Atualizando…' : 'Atualizar'}
          </button>
        ) : null}
      </div>

      {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}

      {!statusMessage && !displayLines.length && hasManagedVideo ? (
        <p className={styles.empty}>
          A transcrição ainda está sendo gerada. Aguarde alguns minutos após o upload e toque em
          atualizar.
        </p>
      ) : null}

      {!statusMessage && !displayLines.length && !hasManagedVideo ? (
        <p className={styles.empty}>Nenhuma transcrição disponível para esta aula.</p>
      ) : null}

      {!statusMessage && displayLines.length > 0 && !filteredLines.length ? (
        <p className={styles.empty}>Nenhum trecho encontrado para “{searchQuery.trim()}”.</p>
      ) : null}

      {!statusMessage && filteredLines.length > 0 ? (
        <div ref={listRef} className={styles.list}>
          {filteredLines.map((chunk, index) => {
            const state = lineStates[index]?.state || 'upcoming'
            const progress = lineStates[index]?.progress || 0
            return (
              <button
                key={`${chunk.seconds}-${index}`}
                type="button"
                data-row
                className={`${styles.row} ${state === 'active' ? styles.rowActive : ''} ${state === 'past' ? styles.rowPast : ''}`}
                onClick={() => onSeek?.(chunk.seconds)}
              >
                <span className={styles.time}>{chunk.time}</span>
                <span className={`${styles.text} ${styles[`text_${state}`]}`}>
                  <KaraokeText text={chunk.text} progress={progress} active={state === 'active'} />
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
