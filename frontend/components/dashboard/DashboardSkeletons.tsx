'use client'

import styles from '@/app/(admin)/dashboard/dashboard.module.scss'

function Bone({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <span className={`${styles.bone} ${className}`} style={style} aria-hidden />
}

export function HeroGreetingSkeleton() {
  return (
    <p className={`${styles.heroDate} ${styles.skelHeroDate}`} aria-busy aria-label="Carregando">
      <Bone style={{ width: '3.2rem', height: '0.85rem' }} />
      <Bone style={{ width: '5.5rem', height: '0.85rem' }} />
      <span aria-hidden className={styles.skelHeroSep}>
        ·
      </span>
      <Bone style={{ width: '11rem', height: '0.85rem' }} />
    </p>
  )
}

export function ScheduleSkeleton() {
  return (
    <ul className={styles.scheduleList} aria-busy aria-label="Carregando atendimentos">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i}>
          <Bone className={styles.skelDot} />
          <div className={styles.skelScheduleCopy}>
            <Bone style={{ width: `${58 - i * 6}%`, height: '0.85rem' }} />
            <Bone style={{ width: `${42 - i * 4}%`, height: '0.7rem' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function DiarySkeleton() {
  return (
    <div className={styles.diaryThumbs} aria-busy aria-label="Carregando diário">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={styles.diaryThumb}>
          <div className={`${styles.diaryThumbHit} ${styles.skelDiaryTile}`}>
            <Bone className={styles.skelDiaryImg} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CareStripSkeleton() {
  return (
    <ul className={styles.focusList} aria-busy aria-label="Carregando alertas">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <div className={`${styles.focusItem} ${styles.skelCareChip}`}>
            <Bone className={styles.skelAvatar} />
            <Bone style={{ width: `${9 - i * 0.55}rem`, height: '0.88rem' }} />
            <Bone style={{ width: '3.2rem', height: '0.7rem' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function RecentTableSkeleton() {
  return (
    <div className={styles.table} aria-busy aria-label="Carregando pacientes">
      <div className={styles.thead}>
        <span>Paciente</span>
        <span>Plano</span>
        <span>Última atualização</span>
      </div>
      <ul>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className={`${styles.trow} ${styles.skelTrow}`}>
              <div className={styles.tpatient}>
                <Bone className={styles.skelAvatar} />
                <div className={styles.skelPatientCopy}>
                  <Bone style={{ width: `${9 - i * 0.55}rem`, height: '0.88rem' }} />
                  <Bone style={{ width: `${7.2 - i * 0.35}rem`, height: '0.72rem' }} />
                </div>
              </div>
              <Bone style={{ width: '4.5rem', height: '0.8rem' }} />
              <Bone className={styles.skelTime} style={{ width: '4rem', height: '0.78rem' }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RequestsSkeleton() {
  return (
    <ul className={styles.requestList} aria-busy aria-label="Carregando solicitações">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className={styles.requestCard}>
          <Bone className={styles.skelAvatar} />
          <div className={styles.skelRequestCopy}>
            <Bone style={{ width: '8rem', height: '0.88rem' }} />
            <Bone style={{ width: '12rem', height: '0.75rem' }} />
            <Bone style={{ width: '5rem', height: '0.65rem' }} />
          </div>
          <div className={styles.skelRequestActions}>
            <Bone style={{ width: '5.5rem', height: '2rem' }} />
            <Bone style={{ width: '5rem', height: '2rem' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
