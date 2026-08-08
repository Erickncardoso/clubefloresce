'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import styles from './PatientChartEmptyState.module.scss'

type Props = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  counter?: string
}

export function PatientChartEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  counter,
}: Props) {
  return (
    <div className={styles.state}>
      <div className={styles.visual} aria-hidden>
        <Icon className={styles.icon} size={38} strokeWidth={1.5} />
      </div>
      <div className={styles.copy}>
        <h3>{title}</h3>
        <p>{description}</p>
        {actionLabel || counter ? (
          <div className={styles.actions}>
            {actionLabel && !actionHref ? (
              <button type="button" className={`btn-primary ${styles.btn}`} onClick={onAction}>
                {actionLabel}
              </button>
            ) : null}
            {actionLabel && actionHref ? (
              <Link href={actionHref} className={`btn-primary ${styles.btn}`}>
                {actionLabel}
              </Link>
            ) : null}
            {counter ? <span className={styles.counter}>{counter}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
