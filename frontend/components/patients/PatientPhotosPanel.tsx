'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Camera from '@/components/icons/CameraIcon'
import { fetchFoodDiaryPhotos, type PhotoEntry } from '@/lib/patient-chart/evolucao'
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

export function PatientPhotosPanel({ patientId, compact = false, limit = 60, onPhotoClick }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [lightbox, setLightbox] = useState<PhotoEntry | null>(null)
  const [mounted, setMounted] = useState(false)

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

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox])

  // Prevent body scroll when lightbox is open
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
    <div className={styles.root}>
      {compact ? (
        /* TikTok-style vertical feed */
        <div className={styles.tiktok}>
          {visiblePhotos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              className={styles.slide}
              onClick={() => openPhoto(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.imageUrl ?? ''} alt="" loading="lazy" />
              <div className={styles.slideShade} aria-hidden />
              <div className={styles.slideUi}>
                <div className={styles.slideCaption}>
                  <strong>{photo.mealLabel || photo.mealType}</strong>
                  <span>{formatDate(photo.entryDate)}</span>
                </div>
                <div className={styles.slideRail}>
                  {photo.caloriesKcal != null && (
                    <span className={styles.railPill}>
                      <small>kcal</small>
                      {Math.round(photo.caloriesKcal)}
                    </span>
                  )}
                  <span className={styles.railIndex}>
                    {index + 1}/{visiblePhotos.length}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Standard grid */
        <div className={styles.grid}>
          {visiblePhotos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className={styles.item}
              onClick={() => openPhoto(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.imageUrl ?? ''} alt="" loading="lazy" />
              <span className={styles.itemMeta}>
                {photo.mealLabel || photo.mealType}
                <small>{formatDate(photo.entryDate)}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox — portal no body (igual Teleport do Nuxt legado) */}
      {lightbox && mounted && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              onClick={(e) => {
                if (e.target === e.currentTarget) setLightbox(null)
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Foto ampliada"
            >
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Fechar"
                onClick={() => setLightbox(null)}
              >
                <X size={18} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.imageUrl ?? ''} alt="" />
              <p className={styles.lightboxMeta}>
                {lightbox.mealLabel || lightbox.mealType}
                {' · '}
                {formatDate(lightbox.entryDate)}
                {lightbox.caloriesKcal != null && (
                  <> · {Math.round(lightbox.caloriesKcal)} kcal</>
                )}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
