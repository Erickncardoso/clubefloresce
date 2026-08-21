'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, MessageCircle, X } from 'lucide-react'
import Camera from '@/components/icons/CameraIcon'
import { toggleDiaryLike } from '@/lib/diary-feed'
import { fetchFoodDiaryPhotos, type PhotoEntry } from '@/lib/patient-chart/evolucao'
import { PatientPhotoCommentsDialog } from './PatientPhotoCommentsDialog'
import styles from './PatientPhotosPanel.module.scss'

type Props = {
  patientId: string
  compact?: boolean
  limit?: number
  onPhotoClick?: (photo: PhotoEntry) => void
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatPhotoKcal(value?: number | null): number | null {
  if (value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

export function PatientPhotosPanel({ patientId, compact = false, limit = 60, onPhotoClick }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [lightbox, setLightbox] = useState<PhotoEntry | null>(null)
  const [mounted, setMounted] = useState(false)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [commentEntryId, setCommentEntryId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchFoodDiaryPhotos(patientId, Math.max(limit, 12))
      .then((data) => setPhotos(data))
      .catch((err) => {
        setError(
          (err as { message?: string })?.message || 'Não foi possível carregar as fotos.',
        )
        setPhotos([])
      })
      .finally(() => setLoading(false))
  }, [patientId, limit])

  const visiblePhotos = useMemo(() => photos.slice(0, limit), [photos, limit])
  const commentPhoto = commentEntryId
    ? photos.find((p) => p.id === commentEntryId) || null
    : null

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setLightbox(null)
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [lightbox])

  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightbox])

  const openPhoto = (photo: PhotoEntry) => {
    if (onPhotoClick) {
      onPhotoClick(photo)
      return
    }
    setLightbox(photo)
  }

  const closeLightbox = (e?: {
    stopPropagation?: () => void
    preventDefault?: () => void
  }) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    window.setTimeout(() => setLightbox(null), 80)
  }

  async function handleToggleLike(photo: PhotoEntry) {
    if (likingId === photo.id) return
    const prevLiked = Boolean(photo.likedByMe)
    const prevCount = photo.likesCount ?? 0
    setLikingId(photo.id)
    setPhotos((list) =>
      list.map((p) =>
        p.id === photo.id
          ? {
              ...p,
              likedByMe: !prevLiked,
              likesCount: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
            }
          : p,
      ),
    )
    try {
      const res = await toggleDiaryLike(photo.id)
      setPhotos((list) =>
        list.map((p) =>
          p.id === photo.id
            ? { ...p, likedByMe: res.likedByMe, likesCount: res.likesCount }
            : p,
        ),
      )
    } catch {
      setPhotos((list) =>
        list.map((p) =>
          p.id === photo.id
            ? { ...p, likedByMe: prevLiked, likesCount: prevCount }
            : p,
        ),
      )
    } finally {
      setLikingId(null)
    }
  }

  if (loading) return <div className={styles.loading}>Carregando fotos…</div>
  if (error) return <p className={styles.error}>{error}</p>

  if (!visiblePhotos.length) {
    return (
      <div className={styles.empty}>
        <Camera className={styles.emptyIcon} aria-hidden />
        <p>Nenhuma foto de refeição registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className={styles.root} data-cf-photos-root>
      {compact ? (
        <div className={styles.tiktok} data-cf-photo-feed>
          {visiblePhotos.map((photo, index) => {
            const kcal = formatPhotoKcal(photo.caloriesKcal)
            const liked = Boolean(photo.likedByMe)
            const likes = photo.likesCount ?? 0
            const comments = photo.commentsCount ?? 0
            return (
              <div key={photo.id} className={styles.slide} data-cf-photo-slide>
                <button
                  type="button"
                  className={styles.slideHit}
                  onClick={() => openPhoto(photo)}
                  aria-label={`Abrir foto ${photo.mealLabel || photo.mealType || ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.imageUrl ?? ''} alt="" loading="lazy" />
                </button>
                <div className={styles.slideShade} aria-hidden />
                <div className={styles.slideUi}>
                  <div className={styles.slideCaption}>
                    <strong>{photo.mealLabel || photo.mealType}</strong>
                    <span>
                      {formatDate(photo.entryDate)}
                      {kcal != null ? ` · ${kcal.toLocaleString('pt-BR')} kcal` : ''}
                    </span>
                  </div>
                  <div className={styles.slideRail}>
                    {kcal != null ? (
                      <span className={styles.railPill}>
                        <small>kcal</small>
                        {kcal.toLocaleString('pt-BR')}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={`${styles.railAction} ${liked ? styles.railActionLiked : ''}`}
                      aria-label={liked ? 'Remover curtida' : 'Curtir'}
                      disabled={likingId === photo.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleToggleLike(photo)
                      }}
                    >
                      <Heart size={18} fill={liked ? 'currentColor' : 'none'} aria-hidden />
                      {likes > 0 ? <span>{likes}</span> : null}
                    </button>
                    <button
                      type="button"
                      className={styles.railAction}
                      aria-label={
                        comments ? `${comments} comentários` : 'Comentar'
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        setCommentEntryId(photo.id)
                      }}
                    >
                      <MessageCircle size={18} aria-hidden />
                      {comments > 0 ? <span>{comments}</span> : null}
                    </button>
                    <span className={styles.railIndex}>
                      {index + 1}/{visiblePhotos.length}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.grid}>
          {visiblePhotos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className={styles.item}
              onClick={() => openPhoto(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.imageUrl ?? ''} alt="" />
              <span className={styles.itemMeta}>
                {photo.mealLabel || photo.mealType}
                <small>{formatDate(photo.entryDate)}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      <PatientPhotoCommentsDialog
        open={Boolean(commentEntryId)}
        onOpenChange={(open) => {
          if (!open) setCommentEntryId(null)
        }}
        entryId={commentEntryId}
        mealLabel={commentPhoto?.mealLabel || commentPhoto?.mealType}
        onCommentAdded={() => {
          if (!commentEntryId) return
          setPhotos((list) =>
            list.map((p) =>
              p.id === commentEntryId
                ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 }
                : p,
            ),
          )
        }}
      />

      {lightbox && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              data-cf-lightbox
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (e.target === e.currentTarget) closeLightbox(e)
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Foto ampliada"
            >
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Fechar"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onClick={(e) => closeLightbox(e)}
              >
                <X size={18} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.imageUrl ?? ''} alt="" />
              <p className={styles.lightboxMeta}>
                {(() => {
                  const kcal = formatPhotoKcal(lightbox.caloriesKcal)
                  return (
                    <>
                      {lightbox.mealLabel || lightbox.mealType}
                      {' · '}
                      {formatDate(lightbox.entryDate)}
                      {kcal != null ? ` · ${kcal.toLocaleString('pt-BR')} kcal` : ''}
                    </>
                  )
                })()}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
