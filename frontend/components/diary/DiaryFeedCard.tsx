'use client'

import { type CSSProperties } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, UtensilsCrossed } from 'lucide-react'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { buildChartTabHref } from '@/lib/patient-chart/nav'
import type { DiaryFeedEntry } from '@/lib/diary-feed'
import styles from './DiaryFeed.module.scss'

const ASPECTS = ['3 / 4', '4 / 5', '1 / 1', '5 / 6', '2 / 3'] as const

function shortPatientName(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Paciente'
  return parts.slice(0, 2).join(' ')
}

type Props = {
  entry: DiaryFeedEntry
  index: number
  liking: boolean
  formatDistance: (date: string) => string
  onToggleLike: (entryId: string) => void
  onOpenPhoto: (url: string) => void
  onOpenComment: (entryId: string) => void
  commenting?: boolean
  highlight?: boolean
}

export function DiaryFeedCard({
  entry,
  index,
  liking,
  formatDistance,
  onToggleLike,
  onOpenPhoto,
  onOpenComment,
  commenting = false,
  highlight = false,
}: Props) {
  const patient = entry.patient
  const patientHref = patient?.id
    ? buildChartTabHref(patient.id, 'evolucao', { sub: 'diario' })
    : '/dashboard'
  const meal = entry.mealLabel || entry.mealType || 'Refeição'
  const aspect = ASPECTS[index % ASPECTS.length]
  const photoStyle = { '--diary-aspect': aspect } as CSSProperties
  const displayName = shortPatientName(patient?.name)

  return (
    <article
      id={`diary-post-${entry.id}`}
      className={`${styles.card} ${commenting ? styles.cardCommenting : ''} ${highlight ? styles.cardHighlight : ''}`}
    >
      <div className={styles.photoShell} style={photoStyle}>
        <button
          type="button"
          className={styles.photoHit}
          aria-label={`Abrir foto de ${meal}`}
          onClick={() => onOpenPhoto(entry.imageUrl)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.imageUrl} alt="" className={styles.photo} loading="lazy" />
        </button>

        <Link
          href={patientHref}
          className={styles.patientOnPhoto}
          title={patient?.name || undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <PatientAvatar
            src={patient?.avatar}
            name={patient?.name}
            size="xs"
            circle
            className={styles.avatarTiny}
          />
          <span className={styles.patientName}>{displayName}</span>
        </Link>

        {!commenting ? (
          <div className={styles.overlay}>
            <div className={styles.overlayMeta}>
              <strong>
                <UtensilsCrossed size={12} aria-hidden className={styles.mealIcon} />
                {meal}
              </strong>
              <span>{formatDistance(entry.createdAt)}</span>
            </div>
            <div className={styles.overlayActions}>
              <button
                type="button"
                className={`${styles.likeBtn} ${entry.likedByMe ? styles.liked : ''}`}
                aria-label={entry.likedByMe ? 'Remover curtida' : 'Curtir'}
                disabled={liking}
                onClick={() => onToggleLike(entry.id)}
              >
                <Heart size={20} fill={entry.likedByMe ? 'currentColor' : 'none'} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.commentBtn}
                aria-label={
                  entry.commentsCount
                    ? `${entry.commentsCount} comentários`
                    : 'Comentar'
                }
                onClick={() => onOpenComment(entry.id)}
              >
                <MessageCircle size={20} aria-hidden />
                {entry.commentsCount > 0 ? (
                  <span className={styles.count}>{entry.commentsCount}</span>
                ) : null}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
