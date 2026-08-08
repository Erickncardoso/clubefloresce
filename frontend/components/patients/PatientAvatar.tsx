'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_PATIENT_AVATAR } from '@/config/patient-avatar'
import styles from './PatientAvatar.module.scss'

type Props = {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  className?: string
}

export function PatientAvatar({
  src,
  name,
  size = 'md',
  ring = false,
  className,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  const showPhoto = Boolean(src?.trim()) && !imageFailed
  const label = name ? `Avatar de ${name}` : 'Avatar do paciente'

  return (
    <div
      className={[
        styles.avatar,
        'patient-avatar',
        `patient-avatar--${size}`,
        styles[`avatar--${size}`],
        ring ? styles.avatarRing : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={label}
    >
      <div className={styles.shape}>
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src!}
            alt={name ? `Foto de ${name}` : 'Foto do perfil'}
            className={`${styles.media} ${styles.mediaPhoto}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={DEFAULT_PATIENT_AVATAR}
            alt=""
            className={`${styles.media} ${styles.mediaDefault}`}
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}
