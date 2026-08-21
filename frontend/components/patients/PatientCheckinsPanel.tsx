'use client'

import { ChevronRight } from 'lucide-react'
import { buildAnswerRows, formatCheckinPeriod } from '@/lib/checkin-answers'
import type { TemplateCheckInResponse } from '@/lib/patient-chart/api'
import styles from './PatientCheckinsPanel.module.scss'

type Props = {
  responses: TemplateCheckInResponse[]
  limit?: number
  /** Lista resumida clicável (abre modal no pai) */
  onSelect?: (item: TemplateCheckInResponse) => void
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PatientCheckinsPanel({ responses, limit = 8, onSelect }: Props) {
  const items = responses.slice(0, limit)
  const selectable = typeof onSelect === 'function'

  if (!items.length) {
    return <p className={styles.empty}>Nenhuma resposta de check-in ainda.</p>
  }

  if (selectable) {
    return (
      <ul className={styles.list}>
        {items.map((item) => {
          const answerCount = buildAnswerRows(item.template?.steps, item.answers).length
          return (
            <li key={item.id}>
              <button
                type="button"
                className={styles.row}
                onClick={() => onSelect(item)}
              >
                <span className={styles.rowCopy}>
                  <strong>{item.template?.title || 'Check-in'}</strong>
                  <span>
                    {formatCheckinPeriod(item.periodKey, item.template?.frequency)}
                    {' · '}
                    {formatUpdatedAt(item.updatedAt)}
                  </span>
                  <em>
                    {answerCount
                      ? `${answerCount} ${answerCount === 1 ? 'resposta' : 'respostas'}`
                      : 'Sem respostas'}
                    {' · ver imagens'}
                  </em>
                </span>
                <ChevronRight size={18} strokeWidth={1.5} aria-hidden className={styles.chevron} />
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={styles.detailList}>
      {items.map((item) => {
        const rows = buildAnswerRows(item.template?.steps, item.answers)
        return (
          <article key={item.id} className={styles.item}>
            <div className={styles.itemHead}>
              <strong>{item.template?.title || 'Check-in'}</strong>
              <span>
                {formatCheckinPeriod(item.periodKey, item.template?.frequency)}
                {' · '}
                {formatUpdatedAt(item.updatedAt)}
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
