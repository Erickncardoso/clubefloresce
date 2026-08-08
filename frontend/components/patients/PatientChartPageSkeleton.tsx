'use client'

import styles from './PatientChartPageSkeleton.module.scss'

function Bone({
  width,
  height = '0.85rem',
  circle = false,
  className = '',
}: {
  width?: string
  height?: string
  circle?: boolean
  className?: string
}) {
  return (
    <span
      className={`${styles.bone} ${circle ? styles.circle : ''} ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  )
}

export function PatientChartPageSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite" aria-label="Carregando ficha do paciente">
      <header className={styles.header}>
        <div className={styles.headRow}>
          <div className={styles.breadcrumb}>
            <Bone width="4.75rem" />
            <Bone width="0.45rem" />
            <Bone width="7.5rem" />
            <Bone width="0.45rem" />
            <Bone width="5.5rem" />
          </div>
          <div className={styles.toolbar}>
            <Bone width="5.5rem" height="0.75rem" />
            <div className={styles.actions}>
              <Bone width="2rem" height="2rem" />
              <Bone width="2rem" height="2rem" />
              <Bone width="6.5rem" height="2rem" />
            </div>
          </div>
        </div>
        <Bone className={styles.title} width="8rem" height="1.15rem" />
      </header>

      <section className={styles.panel}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.infoRow}>
            <Bone circle width="2rem" height="2rem" />
            <div className={styles.infoCopy}>
              <Bone width="5.5rem" height="0.78rem" />
              <Bone width="11rem" height="0.85rem" />
            </div>
          </div>
        ))}
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className={styles.card} height="7.5rem" width="100%" />
          ))}
        </div>
      </section>
    </div>
  )
}
