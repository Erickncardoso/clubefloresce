'use client'

import { buildAnswerRows, formatCheckinPeriod } from '@/lib/checkin-answers'
import type { TemplateCheckInResponse } from '@/lib/patient-chart/api'
import styles from './PatientCheckinsPanel.module.scss'

type Props = {
  responses: TemplateCheckInResponse[]
  limit?: number
}

export function PatientCheckinsPanel({ responses, limit = 8 }: Props) {
  const items = responses.slice(0, limit)

  if (!items.length) {
    return <p className={styles.empty}>Nenhuma resposta de check-in ainda.</p>
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const rows = buildAnswerRows(item.template?.steps, item.answers)
        return (
          <article key={item.id} className={styles.item}>
            <div className={styles.itemHead}>
              <strong>{item.template?.title || 'Check-in'}</strong>
              <span>
                {formatCheckinPeriod(item.periodKey, item.template?.frequency)}
                {' · '}
                {item.updatedAt
                  ? new Date(item.updatedAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </div>
            {rows.length ? (
              <ul className={styles.answers}>
                {rows.map((row) => (
                  <li key={row.id} className={styles.answerRow}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
