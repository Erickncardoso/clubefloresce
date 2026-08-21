'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  GripVertical,
  Maximize2,
  Mic,
  Minimize2,
  Minus,
  Pause,
  Play,
  SpellCheck,
  Square,
  X,
} from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import type { Anamnese, PatientUser } from '@/lib/types'
import {
  PatientAnamneseRichEditor,
  type RichEditorHandle,
} from '@/components/patients/PatientAnamneseRichEditor'
import {
  DICTATION_MAX_SECONDS,
  useAnamneseLiveDictation,
} from '@/components/patients/useAnamneseLiveDictation'
import s from './PatientWorkspace.module.scss'

function formatClock(value?: string | null): string {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function isEmptyHtml(html: string): boolean {
  return !String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dialogueTextToHtml(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(Paciente|Nutricionista)\]\s*:?\s*(.*)$/i)
      if (match) {
        const role = match[1].toLowerCase() === 'paciente' ? 'Paciente' : 'Nutricionista'
        const body = escapeHtml(match[2].trim())
        return `<p><strong>${role}:</strong> ${body}</p>`
      }
      return `<p>${escapeHtml(line)}</p>`
    })
    .join('')
}

function joinHtml(base: string, addition: string): string {
  const left = String(base || '').trim()
  const right = String(addition || '').trim()
  if (!left) return right
  if (!right) return left
  return `${left}${right}`
}

function formatElapsed(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec))
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

type DraftSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

// ── AnamneseEditorModal ───────────────────────────────────────────────────────

export function AnamneseEditorModal({
  anamnese,
  user,
  minimized,
  onMinimizedChange,
  onClose,
  onSave,
}: {
  anamnese: Anamnese | null
  user: PatientUser
  minimized: boolean
  onMinimizedChange: (value: boolean) => void
  onClose: () => void
  onSave: (item: Anamnese) => Promise<void>
}) {
  const isNew = !anamnese?.id
  const startedCompleted = anamnese?.status === 'completed'
  const [title, setTitle] = useState(anamnese?.title || '')
  const [content, setContent] = useState(anamnese?.content || '')
  const [draftId, setDraftId] = useState(anamnese?.id || '')
  const [createdAt, setCreatedAt] = useState(anamnese?.createdAt || '')
  const [lastSavedAt, setLastSavedAt] = useState(anamnese?.updatedAt || anamnese?.createdAt || '')
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<DraftSaveState>(anamnese?.id ? 'saved' : 'idle')
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [dockPos, setDockPos] = useState<{ left: number; top: number } | null>(null)
  const [interimText, setInterimText] = useState('')
  const [organizing, setOrganizing] = useState(false)
  const editorRef = useRef<RichEditorHandle>(null)
  const contentBeforeDictationRef = useRef('')
  const liveSessionTextRef = useRef('')
  const dockDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
    moved: boolean
    barW: number
    barH: number
  } | null>(null)

  const appendLiveText = useCallback((text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return
    liveSessionTextRef.current = `${liveSessionTextRef.current} ${clean}`.trim()
    editorRef.current?.appendText(clean)
  }, [])

  const organizeDialogue = useCallback(async () => {
    const raw = liveSessionTextRef.current.trim()
    if (!raw) return
    setOrganizing(true)
    setError('')
    try {
      const res = await apiFetch<{ text: string }>(
        `/patients/${user.id}/anamnese/format-dialogue`,
        {
          method: 'POST',
          body: JSON.stringify({ text: raw }),
        },
      )
      const formatted = String(res.text || '').trim()
      if (!formatted) return
      const nextHtml = joinHtml(contentBeforeDictationRef.current, dialogueTextToHtml(formatted))
      setContent(nextHtml)
      editorRef.current?.setHtml(nextHtml)
      liveSessionTextRef.current = ''
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : (err as { message?: string })?.message ||
            'Não foi possível organizar o diálogo.'
      setError(msg)
    } finally {
      setOrganizing(false)
    }
  }, [user.id])

  const dictation = useAnamneseLiveDictation({
    patientId: user.id,
    onTranscript: appendLiveText,
    onInterim: setInterimText,
    onError: (message) => setError(message),
  })

  const toggleDictation = useCallback(() => {
    if (dictation.listening) {
      dictation.stop()
      void organizeDialogue()
      return
    }
    contentBeforeDictationRef.current = content
    liveSessionTextRef.current = ''
    setInterimText('')
    void dictation.start()
  }, [content, dictation, organizeDialogue])

  const stopDictationAndOrganize = useCallback(() => {
    if (!dictation.listening && !organizing) return
    dictation.stop()
    void organizeDialogue()
  }, [dictation, organizeDialogue])

  useEffect(() => {
    if (!dictation.listening) return
    if (dictation.elapsedSec < DICTATION_MAX_SECONDS) return
    stopDictationAndOrganize()
  }, [dictation.elapsedSec, dictation.listening, stopDictationAndOrganize])

  const onSaveRef = useRef(onSave)
  const draftMetaRef = useRef({
    draftId,
    createdAt,
    formData: anamnese?.formData ?? null,
    foodRestrictions: anamnese?.foodRestrictions ?? null,
    interpretation: anamnese?.interpretation ?? null,
    authorName: anamnese?.authorName || 'Nutricionista',
  })
  const skipAutosaveRef = useRef(true)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autosaveSeqRef = useRef(0)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    draftMetaRef.current = {
      ...draftMetaRef.current,
      draftId,
      createdAt,
    }
  }, [draftId, createdAt])

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return
    }

    const hasContent = Boolean(title.trim()) || !isEmptyHtml(content)
    if (!hasContent && !draftMetaRef.current.draftId) {
      setSaveState('idle')
      return
    }

    setSaveState('dirty')
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)

    autosaveTimerRef.current = setTimeout(() => {
      void (async () => {
        const seq = ++autosaveSeqRef.current
        setSaveState('saving')
        try {
          const now = new Date().toISOString()
          const meta = draftMetaRef.current
          const id = meta.draftId || crypto.randomUUID()
          const created = meta.createdAt || now
          const item: Anamnese = {
            id,
            title: title.trim() || 'Nova anamnese',
            content,
            formData: meta.formData,
            foodRestrictions: meta.foodRestrictions,
            interpretation: meta.interpretation,
            status: startedCompleted ? 'completed' : 'draft',
            authorName: meta.authorName,
            createdAt: created,
            updatedAt: now,
          }
          await onSaveRef.current(item)
          if (seq !== autosaveSeqRef.current) return
          if (!meta.draftId) setDraftId(id)
          if (!meta.createdAt) setCreatedAt(created)
          setLastSavedAt(now)
          setSaveState('saved')
          setError('')
        } catch (err: unknown) {
          if (seq !== autosaveSeqRef.current) return
          setSaveState('error')
          setError(
            (err as { message?: string })?.message || 'Erro ao salvar rascunho.',
          )
        }
      })()
    }, 900)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [title, content, startedCompleted])

  async function persist(
    nextStatus: 'draft' | 'completed',
    opts?: { requireTitle?: boolean },
  ) {
    const requireTitle = opts?.requireTitle ?? nextStatus === 'completed'
    const trimmedTitle = title.trim()
    if (requireTitle && !trimmedTitle) {
      setTitleError(true)
      setError('Precisa adicionar o título da anamnese.')
      return
    }

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveSeqRef.current += 1

    setSaving(true)
    setSaveState('saving')
    setError('')
    setTitleError(false)
    try {
      const now = new Date().toISOString()
      const meta = draftMetaRef.current
      const id = meta.draftId || crypto.randomUUID()
      const created = meta.createdAt || now
      const item: Anamnese = {
        id,
        title: trimmedTitle || 'Nova anamnese',
        content,
        formData: meta.formData,
        foodRestrictions: meta.foodRestrictions,
        interpretation: meta.interpretation,
        status: nextStatus,
        authorName: meta.authorName,
        createdAt: created,
        updatedAt: now,
      }
      await onSave(item)
      if (!meta.draftId) setDraftId(id)
      if (!meta.createdAt) setCreatedAt(created)
      setLastSavedAt(now)
      setSaveState('saved')
      // Mantém o modal aberto após salvar
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: string; message?: string }; message?: string })?.data?.error ||
        (err as { data?: { message?: string } })?.data?.message ||
        (err as { message?: string })?.message ||
        'Erro ao salvar anamnese.'
      setSaveState('error')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function reviewText() {
    if (reviewing || saving || isEmptyHtml(content)) return
    setReviewing(true)
    setError('')
    try {
      const res = await apiFetch<{ html: string }>(
        `/patients/${user.id}/documentos/rewrite`,
        {
          method: 'POST',
          body: JSON.stringify({
            html: content,
            mode: 'proofread',
          }),
        },
      )
      const next = String(res.html || '').trim()
      if (!next) {
        setError('A revisão voltou vazia. Tente novamente.')
        return
      }
      setContent(next)
      editorRef.current?.setHtml(next)
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : (err as { message?: string })?.message ||
            'Não foi possível revisar o texto.'
      setError(msg)
    } finally {
      setReviewing(false)
    }
  }

  const saveLabel =
    saveState === 'saving'
      ? startedCompleted
        ? 'Salvando…'
        : 'Salvando rascunho…'
      : saveState === 'saved'
        ? startedCompleted
          ? `Salvo às ${formatClock(lastSavedAt)}`
          : `Rascunho salvo às ${formatClock(lastSavedAt)}`
        : saveState === 'dirty'
          ? 'Alterações não salvas'
          : saveState === 'error'
            ? 'Erro ao salvar rascunho'
            : ''

  const dockPatient = String(user.name || '').trim() || 'Paciente'
  const dockDoc = title.trim() || 'Nova anamnese'
  const dockTitle = `${dockDoc} · ${dockPatient}`

  function clampDock(left: number, top: number, width = 280, height = 64) {
    const maxLeft = Math.max(12, window.innerWidth - width - 12)
    const maxTop = Math.max(12, window.innerHeight - height - 12)
    return {
      left: Math.min(Math.max(12, left), maxLeft),
      top: Math.min(Math.max(12, top), maxTop),
    }
  }

  function onDockPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget.parentElement
    const rect = el?.getBoundingClientRect()
    const width = el?.getBoundingClientRect().width || 280
    const height = el?.getBoundingClientRect().height || 64
    const left = dockPos?.left ?? rect?.left ?? window.innerWidth - width - 24
    const top = dockPos?.top ?? rect?.top ?? window.innerHeight - height - 24
    dockDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: left,
      originTop: top,
      moved: false,
      barW: width,
      barH: height,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onDockPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dockDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setDockPos(clampDock(drag.originLeft + dx, drag.originTop + dy, drag.barW, drag.barH))
  }

  function onDockPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dockDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dockDragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function restoreFromDock() {
    onMinimizedChange(false)
  }

  function minimizeToBackground() {
    setExpanded(false)
    onMinimizedChange(true)
  }

  function handleClose() {
    dictation.stop()
    liveSessionTextRef.current = ''
    setInterimText('')
    onClose()
  }

  const showRecBar = dictation.listening || organizing
  const showSimpleDock = minimized && !showRecBar

  const floatingBar =
    typeof document !== 'undefined' && (showRecBar || showSimpleDock)
      ? createPortal(
          showRecBar ? (
            <div
              className={s.recBar}
              style={
                dockPos
                  ? {
                      left: dockPos.left,
                      top: dockPos.top,
                      right: 'auto',
                      bottom: 'auto',
                      transform: 'none',
                    }
                  : undefined
              }
              role="status"
              aria-live="polite"
            >
              <button
                type="button"
                className={s.recBarGrip}
                aria-label="Arrastar"
                title="Arrastar"
                onPointerDown={onDockPointerDown}
                onPointerMove={onDockPointerMove}
                onPointerUp={onDockPointerUp}
                onPointerCancel={onDockPointerUp}
              >
                <GripVertical size={16} aria-hidden />
              </button>

              <div className={s.recBarInfo}>
                <strong>{dockDoc}</strong>
                <span>
                  {minimized
                    ? 'Em segundo plano'
                    : dictation.busy
                      ? 'Transcrevendo…'
                      : dockPatient}
                </span>
              </div>

              <button
                type="button"
                className={s.recBarGhost}
                onClick={() => {
                  if (minimized) restoreFromDock()
                  else minimizeToBackground()
                }}
              >
                {minimized ? 'Abrir' : 'Segundo plano'}
              </button>

              <div className={s.recBarSep} aria-hidden />

              <div className={s.recBarCenter}>
                <span className={s.recBarStatus}>
                  {organizing ? 'Organizando' : dictation.paused ? 'Pausado' : 'Gravando'}
                </span>
                <span className={s.recBarWaves} aria-hidden>
                  {dictation.levels.map((level, index) => (
                    <i
                      key={index}
                      style={{ transform: `scaleY(${dictation.paused ? 0.18 : Math.max(0.18, level)})` }}
                    />
                  ))}
                </span>
                <span className={s.recBarTimer}>
                  {formatElapsed(dictation.elapsedSec)} / {formatElapsed(DICTATION_MAX_SECONDS)}
                </span>
                <button
                  type="button"
                  className={s.recBarIconBtn}
                  disabled={organizing || !dictation.listening}
                  aria-label={dictation.paused ? 'Continuar' : 'Pausar'}
                  title={dictation.paused ? 'Continuar' : 'Pausar'}
                  onClick={() => {
                    if (dictation.paused) dictation.resume()
                    else dictation.pause()
                  }}
                >
                  {dictation.paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
                </button>
                <button
                  type="button"
                  className={`${s.recBarIconBtn} ${s.recBarStop}`}
                  disabled={organizing}
                  aria-label="Parar e organizar"
                  title="Parar e organizar diálogo"
                  onClick={() => stopDictationAndOrganize()}
                >
                  <Square size={13} aria-hidden />
                </button>
              </div>

              <div className={s.recBarSep} aria-hidden />

              <div className={s.recBarRight}>
                <Mic size={15} aria-hidden />
                <button
                  type="button"
                  className={s.recBarIconBtn}
                  aria-label="Fechar gravação"
                  title="Fechar gravação"
                  disabled={organizing}
                  onClick={() => {
                    dictation.stop()
                    liveSessionTextRef.current = ''
                    setInterimText('')
                  }}
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={s.composerDock}
              style={
                dockPos
                  ? { left: dockPos.left, top: dockPos.top, right: 'auto', bottom: 'auto' }
                  : undefined
              }
              role="status"
              aria-live="polite"
            >
              <button
                type="button"
                className={s.composerDockGrip}
                aria-label="Arrastar"
                title="Arrastar"
                onPointerDown={onDockPointerDown}
                onPointerMove={onDockPointerMove}
                onPointerUp={onDockPointerUp}
                onPointerCancel={onDockPointerUp}
              >
                <GripVertical size={16} aria-hidden />
              </button>
              <button type="button" className={s.composerDockBody} onClick={restoreFromDock}>
                <strong title={dockTitle}>{dockTitle}</strong>
                <span>Clique aqui para visualizar</span>
              </button>
            </div>
          ),
          document.body,
        )
      : null

  return (
    <>
      {floatingBar}
      <div
        className={`${s.composerBackdrop}${expanded ? ` ${s.composerBackdropExpanded}` : ''}${
          minimized ? ` ${s.composerBackdropHidden}` : ''
        }`}
        hidden={minimized}
        aria-hidden={minimized}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
      <div
        className={`${s.composer}${expanded ? ` ${s.composerExpanded}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Nova anamnese' : 'Editar anamnese'}
      >
        <div className={s.composerTop}>
          <div className={s.composerFields}>
            <input
              type="text"
              className={`${s.composerTitle}${titleError ? ` ${s.composerTitleError}` : ''}`}
              maxLength={160}
              value={title}
              placeholder="Nova anamnese"
              aria-label="Título da anamnese"
              aria-invalid={titleError}
              autoFocus
              spellCheck
              lang="pt-BR"
              autoCorrect="on"
              autoCapitalize="sentences"
              onChange={(e) => {
                setTitle(e.target.value)
                if (titleError) setTitleError(false)
                if (error) setError('')
              }}
            />
            <div className={s.composerEditor}>
              <PatientAnamneseRichEditor
                ref={editorRef}
                variant="composer"
                value={content}
                onChange={setContent}
                placeholder="Adicionar descrição..."
                ariaLabel="Descrição da anamnese"
              />
            </div>
          </div>

          <div className={s.composerIcons}>
            <button
              type="button"
              className={s.composerIconBtn}
              aria-label="Minimizar"
              title="Minimizar (segundo plano)"
              onClick={minimizeToBackground}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              className={s.composerIconBtn}
              aria-label={expanded ? 'Recolher' : 'Expandir'}
              title={expanded ? 'Recolher' : 'Expandir'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              className={s.composerIconBtn}
              aria-label="Fechar"
              title="Fechar"
              onClick={handleClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {error ? <p className={`${s.error} ${s.composerError}`}>{error}</p> : null}

        <div className={s.composerFoot}>
          <div className={s.composerFootMeta}>
            <div className={s.dictationBar} role="group" aria-label="Ditado por voz">
              <button
                type="button"
                className={`${s.dictationMic}${
                  dictation.listening || organizing ? ` ${s.dictationMicLive}` : ''
                }`}
                disabled={saving || reviewing || organizing}
                onClick={() => toggleDictation()}
                title={
                  dictation.listening
                    ? 'Parar e organizar diálogo'
                    : 'Gravar conversa (Nutri + Paciente)'
                }
                aria-pressed={dictation.listening}
              >
                <Mic size={15} aria-hidden />
                {organizing
                  ? 'Organizando…'
                  : dictation.listening
                    ? 'Parar'
                    : 'Gravar conversa'}
              </button>
            </div>

            {dictation.listening || organizing ? (
              <span className={`${s.composerSaveStatusBusy} ${s.dictationInterim}`}>
                {organizing
                  ? 'Separando Nutricionista e Paciente…'
                  : interimText
                    ? interimText
                    : 'Controles na barra flutuante'}
              </span>
            ) : saveLabel ? (
              <span
                className={`${s.composerSaveStatus}${
                  saveState === 'saving' ? ` ${s.composerSaveStatusBusy}` : ''
                }${saveState === 'error' ? ` ${s.composerSaveStatusError}` : ''}`}
              >
                {saveLabel}
              </span>
            ) : null}
          </div>

          <div className={s.composerFootActions}>
            <button
              type="button"
              className={s.composerReview}
              disabled={
                saving ||
                reviewing ||
                organizing ||
                dictation.listening ||
                isEmptyHtml(content)
              }
              onClick={() => void reviewText()}
              title="Corrige ortografia e concordância com IA, sem mudar tabelas nem o sentido"
            >
              <SpellCheck size={15} aria-hidden />
              {reviewing ? 'Revisando…' : 'Revisar texto'}
            </button>
            <button type="button" className={s.composerCancel} onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={saving || reviewing || organizing || dictation.listening}
              onClick={() => void persist('draft', { requireTitle: false })}
            >
              {saving ? 'Salvando…' : 'Salvar rascunho'}
            </button>
            <button
              type="button"
              className={`btn-primary ${s.composerSubmit}`}
              disabled={saving || reviewing || organizing || dictation.listening}
              onClick={() => void persist('completed', { requireTitle: true })}
            >
              {saving ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

