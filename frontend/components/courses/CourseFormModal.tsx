'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { FloatField } from '@/components/ui/FloatField'
import {
  type Course,
  type CoursePayload,
  DEFAULT_BANNER_THEME,
  buildCoursePayload,
  uploadImage,
} from '@/lib/courses'
import styles from './CourseFormModal.module.scss'
import { AnimatedDialog } from '@/components/overlays'

export type CourseEditMode = 'create' | 'card' | 'banner'

type Props = {
  open: boolean
  mode: CourseEditMode
  course?: Course | null
  saving?: boolean
  error?: string
  onClose: () => void
  onSave: (payload: CoursePayload) => void
}

export function CourseFormModal({
  open,
  mode,
  course = null,
  saving = false,
  error = '',
  onClose,
  onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [bannerImage, setBannerImage] = useState('')
  const [bannerKicker, setBannerKicker] = useState('')
  const [bannerTitle, setBannerTitle] = useState('')
  const [bannerSubtitle, setBannerSubtitle] = useState('')
  const [bannerCtaText, setBannerCtaText] = useState('')
  const [preview, setPreview] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setLocalError('')
    setPendingFile(null)
    if (mode === 'create' || !course) {
      setTitle('')
      setDescription('')
      setThumbnail('')
      setBannerImage('')
      setBannerKicker('Destaque da semana')
      setBannerTitle('')
      setBannerSubtitle('')
      setBannerCtaText('Continuar agora')
      setPreview('')
      return
    }
    setTitle(course.title || '')
    setDescription(course.description || '')
    setThumbnail(course.thumbnail || '')
    setBannerImage(course.bannerImage || '')
    setBannerKicker(course.bannerKicker || 'Destaque da semana')
    setBannerTitle(course.bannerTitle || course.title || '')
    setBannerSubtitle(course.bannerSubtitle || course.description || '')
    setBannerCtaText(course.bannerCtaText || 'Continuar agora')
    setPreview(mode === 'banner' ? course.bannerImage || '' : course.thumbnail || '')
  }, [open, mode, course])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setLocalError('Informe o título do curso.')
      return
    }
    setUploading(true)
    setLocalError('')
    try {
      let imageUrl = mode === 'banner' ? bannerImage : thumbnail
      if (pendingFile) {
        const uploaded = await uploadImage(pendingFile)
        imageUrl = uploaded.url
      }

      const base = buildCoursePayload({
        ...(course || {}),
        title: title.trim(),
        description: description.trim() || null,
        thumbnail: mode === 'banner' ? course?.thumbnail || thumbnail || null : imageUrl || null,
        bannerImage: mode === 'banner' ? imageUrl || null : course?.bannerImage || bannerImage || null,
        bannerKicker: mode === 'banner' ? bannerKicker.trim() || null : course?.bannerKicker || null,
        bannerTitle: mode === 'banner' ? bannerTitle.trim() || null : course?.bannerTitle || null,
        bannerSubtitle:
          mode === 'banner' ? bannerSubtitle.trim() || null : course?.bannerSubtitle || null,
        bannerCtaText: mode === 'banner' ? bannerCtaText.trim() || null : course?.bannerCtaText || null,
        ...DEFAULT_BANNER_THEME,
        bannerKickerColor: course?.bannerKickerColor || DEFAULT_BANNER_THEME.bannerKickerColor,
        bannerKickerBg: course?.bannerKickerBg || DEFAULT_BANNER_THEME.bannerKickerBg,
        bannerTitleColor: course?.bannerTitleColor || DEFAULT_BANNER_THEME.bannerTitleColor,
        bannerSubtitleColor: course?.bannerSubtitleColor || DEFAULT_BANNER_THEME.bannerSubtitleColor,
        bannerCtaBg: course?.bannerCtaBg || DEFAULT_BANNER_THEME.bannerCtaBg,
        bannerCtaColor: course?.bannerCtaColor || DEFAULT_BANNER_THEME.bannerCtaColor,
        bannerSecondaryBtnBg:
          course?.bannerSecondaryBtnBg || DEFAULT_BANNER_THEME.bannerSecondaryBtnBg,
        bannerSecondaryBtnColor:
          course?.bannerSecondaryBtnColor || DEFAULT_BANNER_THEME.bannerSecondaryBtnColor,
        bannerImagePosition: course?.bannerImagePosition || '50% 35%',
        bannerImageMobilePosition: course?.bannerImageMobilePosition || course?.bannerImagePosition || '50% 35%',
        thumbnailMobile: course?.thumbnailMobile || null,
        bannerImageMobile: course?.bannerImageMobile || null,
      })

      onSave(base)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha no upload da imagem.')
    } finally {
      setUploading(false)
    }
  }

  const heading =
    mode === 'create' ? 'Novo curso' : mode === 'banner' ? 'Editar capa do destaque' : 'Editar curso'

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={heading}
      contentClassName={`modal-card ${styles.card}`}
    >
      <header className={styles.head}>
        <div>
          <h2>{heading}</h2>
          <p>
            {mode === 'banner'
              ? 'Imagem e textos do banner em destaque.'
              : 'Capa do card, título e descrição.'}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
          <button
            type="button"
            className={`${styles.upload} ${mode === 'banner' ? styles.uploadBanner : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : (
              <span>
                <ImagePlus size={20} />
                {mode === 'banner' ? 'Enviar capa do destaque' : 'Enviar capa do card'}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
              setPendingFile(file)
              setPreview(URL.createObjectURL(file))
            }}
          />

          {mode !== 'banner' ? (
            <>
              <FloatField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <FloatField
                as="textarea"
                label="Descrição"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </>
          ) : (
            <>
              <FloatField
                label="Kicker"
                value={bannerKicker}
                onChange={(e) => setBannerKicker(e.target.value)}
              />
              <FloatField
                label="Título do banner"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
              />
              <FloatField
                as="textarea"
                label="Subtítulo"
                rows={3}
                value={bannerSubtitle}
                onChange={(e) => setBannerSubtitle(e.target.value)}
              />
              <FloatField
                label="Texto do botão"
                value={bannerCtaText}
                onChange={(e) => setBannerCtaText(e.target.value)}
              />
              <FloatField
                label="Título do curso (fallback)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </>
          )}

          {localError || error ? <p className={styles.error}>{localError || error}</p> : null}

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" disabled={saving || uploading} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || uploading}>
              {saving || uploading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
    </AnimatedDialog>
  )
}
