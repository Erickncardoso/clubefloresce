'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Sparkles } from 'lucide-react'
import {
  generateLessonSummary,
  isManagedVideoUrl,
  syncLessonTranscription,
  updateLesson,
  type CourseLesson,
} from '@/lib/courses'
import {
  formatLessonSummaryHtml,
  hasLessonSummaryContent,
} from '@/lib/lesson-summary'
import styles from './LessonSummaryPanel.module.scss'

type Props = {
  lessonId: string
  lessonTitle?: string
  videoUrl?: string
  content?: string
  transcription?: unknown
  onSaved?: (lesson: CourseLesson) => void
}

export function LessonSummaryPanel({
  lessonId,
  videoUrl = '',
  content = '',
  transcription,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(content || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'warn'>('info')
  const [transcriptionLines, setTranscriptionLines] = useState(
    Array.isArray(transcription) ? transcription.length : 0,
  )

  useEffect(() => {
    setDraft(content || '')
    setIsEditing(false)
    setTranscriptionLines(Array.isArray(transcription) ? transcription.length : 0)
    setStatusMessage('')
  }, [lessonId, content, transcription])

  const canUseAi = isManagedVideoUrl(videoUrl)
  const hasChanges = draft.trim() !== String(content || '').trim()
  const showPreview = !isEditing && hasLessonSummaryContent(draft)
  const previewHtml = useMemo(() => formatLessonSummaryHtml(draft), [draft])

  async function generateWithAi() {
    if (!canUseAi) {
      setStatusTone('warn')
      setStatusMessage('Disponível apenas para vídeos enviados pelo upload da plataforma.')
      return
    }
    setGenerating(true)
    setStatusMessage('')
    try {
      await syncLessonTranscription(lessonId).catch(() => null)
      const result = await generateLessonSummary(lessonId)
      setDraft(result.content || '')
      setIsEditing(false)
      setTranscriptionLines(result.transcriptionLines || transcriptionLines)
      setStatusTone('success')
      setStatusMessage('Resumo gerado. Revise o texto e clique em Salvar resumo.')
    } catch (err) {
      setStatusTone('warn')
      setStatusMessage(err instanceof Error ? err.message : 'Não foi possível gerar o resumo.')
    } finally {
      setGenerating(false)
    }
  }

  async function saveSummary() {
    setSaving(true)
    setStatusMessage('')
    try {
      const lesson = await updateLesson(lessonId, {
        content: draft.trim() || null,
      })
      setIsEditing(false)
      setStatusTone('success')
      setStatusMessage('Resumo salvo com sucesso.')
      onSaved?.(lesson)
    } catch (err) {
      setStatusTone('warn')
      setStatusMessage(err instanceof Error ? err.message : 'Erro ao salvar resumo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h3>Resumo didático</h3>
          <p>Escreva manualmente ou gere com IA a partir da transcrição do vídeo.</p>
        </div>
        <div className={styles.actions}>
          {showPreview ? (
            <button
              type="button"
              className={`btn-secondary cf-squircle cf-squircle--control ${styles.ghost}`}
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={15} />
              Editar
            </button>
          ) : null}
          <button
            type="button"
            className={`btn-secondary cf-squircle cf-squircle--control ${styles.ghost}`}
            disabled={generating || saving || !canUseAi}
            title={
              canUseAi
                ? 'Gera o resumo a partir da transcrição do vídeo'
                : 'Disponível apenas para vídeos enviados pelo upload da plataforma'
            }
            onClick={() => void generateWithAi()}
          >
            <Sparkles size={15} />
            {generating ? 'Gerando…' : 'Gerar com IA'}
          </button>
          <button
            type="button"
            className={`btn-primary cf-squircle cf-squircle--control ${styles.primary}`}
            disabled={saving || generating || !hasChanges}
            onClick={() => void saveSummary()}
          >
            {saving ? 'Salvando…' : 'Salvar resumo'}
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p className={`${styles.status} ${styles[`tone_${statusTone}`]}`}>{statusMessage}</p>
      ) : null}

      {showPreview ? (
        <div className={styles.preview}>
          <div
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <button type="button" className={styles.editLink} onClick={() => setIsEditing(true)}>
            Editar texto
          </button>
        </div>
      ) : (
        <>
          <textarea
            className={styles.textarea}
            rows={10}
            value={draft}
            maxLength={8000}
            placeholder="Descreva o que o paciente vai aprender nesta aula…"
            onChange={(e) => setDraft(e.target.value)}
          />
          {draft.trim() ? (
            <button type="button" className={styles.editLink} onClick={() => setIsEditing(false)}>
              Ver formatado
            </button>
          ) : null}
        </>
      )}

      {transcriptionLines > 0 ? (
        <p className={styles.meta}>
          Transcrição disponível: {transcriptionLines} trechos sincronizados.
        </p>
      ) : null}
    </div>
  )
}
