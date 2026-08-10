'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Film,
  ImagePlus,
  Link as LinkIcon,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  type CourseLesson,
  type LessonMaterial,
  uploadImage,
  uploadLessonVideo,
} from '@/lib/courses'
import { extractYoutubeId } from '@/lib/course-slug'
import { FloatField } from '@/components/ui/FloatField'
import { AnimatedDialog } from '@/components/overlays'
import styles from './LessonFormModal.module.scss'

export type LessonSavePayload = {
  title: string
  videoUrl: string
  content: string
  thumbnail: string | null
  duration: string | null
  materials: LessonMaterial[]
}

type LessonFormContext = {
  courseTitle?: string
  moduleTitle?: string
  lessonCount?: number
}

type Props = {
  open: boolean
  mode?: 'create' | 'edit'
  lesson?: CourseLesson | null
  context?: LessonFormContext
  saving?: boolean
  error?: string
  onClose: () => void
  onSave: (payload: LessonSavePayload) => void
}

type VideoTab = 'link' | 'upload'
type ThumbTab = 'upload' | 'frame' | 'youtube'

const STEPS = [
  { id: 1, label: 'Vídeo' },
  { id: 2, label: 'Capa' },
  { id: 3, label: 'Info' },
] as const

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(file.name)
}

function formatSecondsToDuration(totalSeconds: number) {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return ''
  const total = Math.round(totalSeconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    const parts = [`${hours}h`, `${minutes}min`]
    if (seconds > 0) parts.push(`${seconds}s`)
    return parts.join(' ')
  }
  if (minutes > 0) return seconds > 0 ? `${minutes} min ${seconds} seg` : `${minutes} min`
  return `${seconds} seg`
}

function inferTitleFromFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!base) return ''
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function youtubeThumbUrl(videoUrl: string) {
  const id = extractYoutubeId(videoUrl)
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : ''
}

export function LessonFormModal({
  open,
  mode = 'create',
  lesson = null,
  context,
  saving = false,
  error = '',
  onClose,
  onSave,
}: Props) {
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const frameVideoRef = useRef<HTMLVideoElement>(null)

  const [step, setStep] = useState(1)
  const [videoTab, setVideoTab] = useState<VideoTab>('link')
  const [thumbTab, setThumbTab] = useState<ThumbTab>('upload')
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [content, setContent] = useState('')
  const [duration, setDuration] = useState('')
  const [durationFromVideo, setDurationFromVideo] = useState(false)
  const [links, setLinks] = useState<LessonMaterial[]>([])
  const [thumbPreview, setThumbPreview] = useState('')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoObjectUrl, setVideoObjectUrl] = useState('')
  const [videoUploadStatus, setVideoUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [frameDuration, setFrameDuration] = useState(0)
  const [frameSeek, setFrameSeek] = useState(0)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const youtubeId = useMemo(() => extractYoutubeId(videoUrl), [videoUrl])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setLocalError('')
    setBusy(false)
    setVideoUploadStatus('idle')
    setThumbFile(null)
    setVideoFile(null)
    setDurationFromVideo(false)
    setFrameDuration(0)
    setFrameSeek(0)

    const existingUrl = lesson?.videoUrl || ''
    const yt = extractYoutubeId(existingUrl)
    setTitle(lesson?.title || '')
    setVideoUrl(existingUrl)
    setContent(lesson?.content || '')
    setDuration(lesson?.duration || '')
    setLinks(
      Array.isArray(lesson?.materials)
        ? lesson!.materials!.map((m) => ({ name: m.name || '', url: m.url || '' }))
        : [],
    )
    setThumbPreview(lesson?.thumbnail || '')
    setVideoTab(yt || existingUrl ? 'link' : 'link')
    setThumbTab(yt ? 'youtube' : 'upload')

    return () => {
      /* revoke on close below */
    }
  }, [open, lesson])

  useEffect(() => {
    return () => {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl)
      if (thumbPreview.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
    }
  }, [videoObjectUrl, thumbPreview])

  function resetVideoObjectUrl(next?: string) {
    setVideoObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next || ''
    })
  }

  async function applyVideoFile(file: File | undefined) {
    if (!file) return
    if (!isVideoFile(file)) {
      setLocalError('Selecione um arquivo de vídeo (MP4, MOV ou WEBM).')
      return
    }
    setLocalError('')
    setVideoTab('upload')
    setVideoFile(file)
    resetVideoObjectUrl(URL.createObjectURL(file))
    setThumbTab('frame')
    setVideoUrl('')
    setDuration('')
    setDurationFromVideo(false)
    if (!title.trim()) {
      const inferred = inferTitleFromFileName(file.name)
      if (inferred) setTitle(inferred)
    }
    setVideoUploadStatus('uploading')
    try {
      const uploaded = await uploadLessonVideo(file)
      setVideoUrl(uploaded.url)
      setVideoUploadStatus('done')
    } catch (err) {
      setVideoUploadStatus('error')
      setLocalError(err instanceof Error ? err.message : 'Erro no upload do vídeo.')
    }
  }

  function onProbeMetadata(seconds: number) {
    if (!seconds || !Number.isFinite(seconds)) return
    setFrameDuration(seconds)
    setDurationFromVideo(true)
    setDuration(formatSecondsToDuration(seconds))
  }

  function captureFrame() {
    const video = frameVideoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'frame_capture.jpg', { type: 'image/jpeg' })
        if (thumbPreview.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
        setThumbFile(file)
        setThumbPreview(URL.createObjectURL(blob))
        setThumbTab('frame')
      },
      'image/jpeg',
      0.92,
    )
  }

  function selectYoutubeThumb() {
    const url = youtubeThumbUrl(videoUrl)
    if (!url) return
    if (thumbPreview.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
    setThumbFile(null)
    setThumbPreview(url)
    setThumbTab('youtube')
  }

  function canLeaveStep(from: number) {
    if (from === 1) {
      if (videoTab === 'link') {
        if (!/^https?:\/\//i.test(videoUrl.trim())) {
          setLocalError('Cole um link válido de vídeo (http/https).')
          return false
        }
      } else if (videoUploadStatus === 'uploading') {
        setLocalError('Aguarde o upload do vídeo terminar.')
        return false
      } else if (!videoUrl.trim() && !videoFile) {
        setLocalError('Faça upload do vídeo ou cole um link.')
        return false
      } else if (!videoUrl.trim() && videoUploadStatus === 'error') {
        setLocalError('O upload falhou. Selecione o vídeo novamente.')
        return false
      }
    }
    setLocalError('')
    return true
  }

  function goNext() {
    if (!canLeaveStep(step)) return
    if (step === 1 && youtubeId && !thumbPreview) {
      selectYoutubeThumb()
    }
    setStep((s) => Math.min(3, s + 1))
  }

  async function submit(skipThumb: boolean) {
    if (!title.trim()) {
      setStep(3)
      setLocalError('Informe o título da aula.')
      return
    }
    if (!canLeaveStep(1)) {
      setStep(1)
      return
    }
    if (videoUploadStatus === 'uploading') {
      setLocalError('Aguarde o upload do vídeo terminar.')
      setStep(1)
      return
    }
    if (!videoUrl.trim()) {
      setLocalError('Vídeo ainda sem URL. Faça upload ou cole o link.')
      setStep(1)
      return
    }

    setBusy(true)
    setLocalError('')
    try {
      let thumbnail: string | null = skipThumb ? null : thumbPreview || null
      if (!skipThumb && thumbFile) {
        const uploaded = await uploadImage(thumbFile)
        thumbnail = uploaded.url
      } else if (!skipThumb && !thumbnail && youtubeId) {
        thumbnail = youtubeThumbUrl(videoUrl)
      }

      const materials = links
        .map((item) => ({
          name: String(item.name || '').trim(),
          url: String(item.url || '').trim(),
        }))
        .filter((item) => item.name && item.url)

      onSave({
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        content: content.trim(),
        thumbnail,
        duration: duration.trim() || null,
        materials,
      })
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao salvar aula.')
    } finally {
      setBusy(false)
    }
  }

  const disabled = saving || busy

  const lessonTitle = mode === 'edit' ? 'Editar aula' : 'Nova aula'

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !disabled) onClose()
      }}
      title={lessonTitle}
      contentClassName={`modal-card cf-admin-radius cf-squircle cf-squircle--control ${styles.card}`}
    >
        <header className={styles.head}>
          <div>
            {context?.courseTitle ? (
              <p className={styles.crumb}>
                {context.courseTitle}
                {context.moduleTitle ? ` / ${context.moduleTitle}` : ''}
              </p>
            ) : null}
            <h2>{mode === 'edit' ? 'Editar aula' : 'Nova aula'}</h2>
            <p className={styles.sub}>
              {mode === 'create'
                ? `Aula ${(context?.lessonCount || 0) + 1} neste módulo`
                : 'Atualize vídeo, capa e informações da aula'}
            </p>
          </div>
          <button type="button" className={styles.close} aria-label="Fechar" disabled={disabled} onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className={styles.steps} aria-label="Progresso do formulário">
          {STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.step} ${step === item.id ? styles.stepActive : ''} ${step > item.id ? styles.stepDone : ''}`}
              onClick={() => {
                if (item.id < step || canLeaveStep(step)) setStep(item.id)
              }}
            >
              <span className={styles.stepNum}>{item.id}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {step === 1 ? (
            <section className={styles.pane}>
              <div className={styles.field}>
                <span className={styles.label}>Fonte do vídeo</span>
                <div className={styles.pills}>
                  <button
                    type="button"
                    className={`cf-squircle cf-squircle--control ${styles.pill} ${videoTab === 'link' ? styles.pillActive : ''}`}
                    onClick={() => setVideoTab('link')}
                  >
                    <LinkIcon size={14} /> YouTube / link
                  </button>
                  <button
                    type="button"
                    className={`cf-squircle cf-squircle--control ${styles.pill} ${videoTab === 'upload' ? styles.pillActive : ''}`}
                    onClick={() => setVideoTab('upload')}
                  >
                    <Upload size={14} /> Upload
                  </button>
                </div>
              </div>

              {videoTab === 'link' ? (
                <div className={styles.fieldBlock}>
                  <FloatField
                    label="Link do vídeo"
                    type="url"
                    value={videoUrl}
                    placeholder="https://youtube.com/watch?v=..."
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  {youtubeId ? (
                    <p className={`${styles.hint} ${styles.hintOk}`}>
                      Link do YouTube detectado — a capa será sugerida no próximo passo.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className={styles.field}>
                  <span className={styles.label}>Arquivo de vídeo</span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv"
                    hidden
                    onChange={(e) => void applyVideoFile(e.target.files?.[0])}
                  />
                  {!videoFile ? (
                    <button
                      type="button"
                      className={`${styles.drop} cf-squircle cf-squircle--control`}
                      onClick={() => videoInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        void applyVideoFile(e.dataTransfer.files?.[0])
                      }}
                    >
                      <Film size={28} />
                      <span>Clique ou arraste o vídeo aqui</span>
                      <small>MP4, MOV ou WEBM</small>
                    </button>
                  ) : (
                    <div className={`${styles.fileSelected} cf-squircle cf-squircle--control`}>
                      <Film size={16} />
                      <span>{videoFile.name}</span>
                      <button type="button" className={styles.textBtn} onClick={() => videoInputRef.current?.click()}>
                        Trocar
                      </button>
                    </div>
                  )}
                  {videoUploadStatus === 'uploading' ? (
                    <p className={styles.hint}>Enviando vídeo… isso pode levar alguns minutos.</p>
                  ) : null}
                  {videoUploadStatus === 'done' ? (
                    <p className={`${styles.hint} ${styles.hintOk}`}>Vídeo pronto — pode continuar.</p>
                  ) : null}
                  {videoUploadStatus === 'error' ? (
                    <p className={`${styles.hint} ${styles.hintErr}`}>Erro no upload. Tente novamente.</p>
                  ) : null}
                </div>
              )}

              <div className={styles.fieldBlock}>
                <FloatField
                  label="Duração"
                  type="text"
                  value={duration}
                  readOnly={durationFromVideo}
                  placeholder={durationFromVideo ? ' ' : 'Detectada ao carregar o vídeo'}
                  onChange={(e) => {
                    setDurationFromVideo(false)
                    setDuration(e.target.value)
                  }}
                />
                {durationFromVideo ? (
                  <p className={`${styles.hint} ${styles.hintOk}`}>Preenchida automaticamente a partir do vídeo.</p>
                ) : null}
              </div>

              {videoObjectUrl ? (
                <video
                  src={videoObjectUrl}
                  className={styles.srOnly}
                  preload="metadata"
                  muted
                  onLoadedMetadata={(e) => onProbeMetadata(e.currentTarget.duration)}
                />
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className={styles.pane}>
              <div className={styles.field}>
                <span className={styles.label}>Miniatura da aula</span>
                <div className={styles.pills}>
                  <button
                    type="button"
                    className={`cf-squircle cf-squircle--control ${styles.pill} ${thumbTab === 'upload' ? styles.pillActive : ''}`}
                    onClick={() => setThumbTab('upload')}
                  >
                    <ImagePlus size={14} /> Imagem
                  </button>
                  <button
                    type="button"
                    className={`cf-squircle cf-squircle--control ${styles.pill} ${thumbTab === 'frame' ? styles.pillActive : ''}`}
                    disabled={!videoObjectUrl}
                    title={videoObjectUrl ? '' : 'Disponível após upload de vídeo'}
                    onClick={() => setThumbTab('frame')}
                  >
                    <Camera size={14} /> Frame
                  </button>
                  {youtubeId ? (
                    <button
                      type="button"
                      className={`cf-squircle cf-squircle--control ${styles.pill} ${thumbTab === 'youtube' ? styles.pillActive : ''}`}
                      onClick={selectYoutubeThumb}
                    >
                      <Play size={14} /> YouTube
                    </button>
                  ) : null}
                </div>
              </div>

              {thumbTab === 'upload' ? (
                <div className={styles.field}>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (thumbPreview.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
                      setThumbFile(file)
                      setThumbPreview(URL.createObjectURL(file))
                    }}
                  />
                  <button type="button" className={`${styles.thumbPicker} cf-squircle cf-squircle--control`} onClick={() => thumbInputRef.current?.click()}>
                    {thumbPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbPreview} alt="" />
                    ) : (
                      <span>
                        <ImagePlus size={20} />
                        Escolher imagem de capa
                      </span>
                    )}
                  </button>
                </div>
              ) : null}

              {thumbTab === 'frame' ? (
                <div className={styles.field}>
                  {videoObjectUrl ? (
                    <div className={styles.frameBox}>
                      <video
                        ref={frameVideoRef}
                        src={videoObjectUrl}
                        className={styles.frameVideo}
                        preload="metadata"
                        muted
                        onLoadedMetadata={(e) => {
                          const d = e.currentTarget.duration || 0
                          setFrameDuration(d)
                          onProbeMetadata(d)
                          e.currentTarget.currentTime = Math.min(frameSeek, d || 0)
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={frameDuration || 1}
                        step={0.1}
                        value={frameSeek}
                        className={styles.frameSlider}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          setFrameSeek(value)
                          if (frameVideoRef.current) frameVideoRef.current.currentTime = value
                        }}
                      />
                      <button type="button" className="btn-secondary" onClick={captureFrame}>
                        <Camera size={14} /> Capturar frame
                      </button>
                      {thumbPreview && thumbTab === 'frame' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbPreview} alt="" className={styles.framePreview} />
                      ) : null}
                    </div>
                  ) : (
                    <p className={styles.hint}>Faça upload do vídeo no passo Vídeo para capturar um frame.</p>
                  )}
                </div>
              ) : null}

              {thumbTab === 'youtube' ? (
                <div className={styles.field}>
                  {thumbPreview ? (
                    <div className={styles.thumbPicker}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbPreview} alt="" />
                    </div>
                  ) : null}
                  <p className={styles.hint}>Capa extraída automaticamente do YouTube.</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 3 ? (
            <section className={styles.pane}>
              <FloatField
                label="Título da aula"
                type="text"
                value={title}
                maxLength={160}
                placeholder="Ex: A importância das proteínas"
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className={styles.fieldBlock}>
                <FloatField
                  as="textarea"
                  label="Resumo da aula (opcional)"
                  rows={4}
                  value={content}
                  maxLength={2000}
                  placeholder="Texto exibido na aba Resumo do player…"
                  onChange={(e) => setContent(e.target.value)}
                />
                <p className={styles.hint}>O resumo aparece para o paciente na aba Resumo enquanto assiste.</p>
              </div>

              <div className={styles.linksField}>
                <div className={styles.linksHead}>
                  <span className={styles.label}>
                    Links da aula <em>(opcional)</em>
                  </span>
                  <button
                    type="button"
                    className={styles.textBtn}
                    onClick={() => setLinks((prev) => [...prev, { name: '', url: '' }])}
                  >
                    <Plus size={14} /> Adicionar link
                  </button>
                </div>
                <p className={styles.hint}>Aparecem na aba Links do player.</p>
                {links.length ? (
                  <div className={styles.linksList}>
                    {links.map((link, index) => (
                      <div key={`link-${index}`} className={styles.linkRow}>
                        <FloatField
                          label="Título"
                          type="text"
                          maxLength={120}
                          value={link.name}
                          placeholder=" "
                          onChange={(e) =>
                            setLinks((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                            )
                          }
                        />
                        <FloatField
                          label="URL"
                          type="url"
                          value={link.url}
                          placeholder="https://..."
                          onChange={(e) =>
                            setLinks((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, url: e.target.value } : item)),
                            )
                          }
                        />
                        <button
                          type="button"
                          className={`${styles.linkRemove} cf-squircle cf-squircle--control`}
                          aria-label="Remover link"
                          onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.hint}>Nenhum link adicionado.</p>
                )}
              </div>
            </section>
          ) : null}

          {localError || error ? <p className={styles.error}>{localError || error}</p> : null}
        </div>

        <footer className={styles.foot}>
          {step > 1 ? (
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => setStep((s) => s - 1)}>
              Voltar
            </button>
          ) : null}
          <button type="button" className="btn-secondary" disabled={disabled} onClick={onClose}>
            Cancelar
          </button>
          <div className={styles.footSpacer} />
          {step < 3 ? (
            <button type="button" className="btn-primary" disabled={disabled} onClick={goNext}>
              Continuar
            </button>
          ) : null}
          {step === 2 && mode === 'create' ? (
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => void submit(true)}>
              Pular capa
            </button>
          ) : null}
          {step === 3 || mode === 'edit' ? (
            <button type="button" className="btn-primary" disabled={disabled} onClick={() => void submit(false)}>
              {saving || busy ? 'Salvando aula…' : mode === 'create' ? 'Criar aula' : 'Salvar alterações'}
            </button>
          ) : null}
        </footer>
    </AnimatedDialog>
  )
}
