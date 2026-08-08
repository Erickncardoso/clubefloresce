'use client'

import { ReactNode, useState } from 'react'
import { BookOpen, FileText, Plus } from 'lucide-react'
import type { ContentTile } from '@/lib/courses'
import styles from './TileCarousel.module.scss'

type Props = {
  items: ContentTile[]
  ariaLabel?: string
  onSelect: (item: ContentTile) => void
  renderActions?: (item: ContentTile) => ReactNode
}

export function TileCarousel({
  items,
  ariaLabel = 'Carrossel de conteúdos',
  onSelect,
  renderActions,
}: Props) {
  const [failed, setFailed] = useState<Record<string, boolean>>({})

  return (
    <div className={styles.wrap}>
      <div className={styles.track} role="list" aria-label={ariaLabel}>
        {items.map((item) => {
          const Icon = item.kind === 'ebook' ? FileText : item.isAdd ? Plus : BookOpen
          const showCover = Boolean(item.cover) && !failed[item.id] && !item.isAdd
          return (
            <div key={item.id} className={styles.shell} role="listitem">
              <article
                className={styles.entry}
                tabIndex={0}
                aria-label={item.ariaLabel}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(item)
                  }
                }}
              >
                <div className={styles.media}>
                  <div
                    className={`cf-squircle cf-squircle--control ${styles.card} ${styles[`tone_${item.tone}`] || ''} ${item.className || ''} ${item.isAdd ? styles.add : ''}`}
                  >
                    {showCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover}
                        alt=""
                        className={styles.cover}
                        loading="lazy"
                        onError={() => setFailed((prev) => ({ ...prev, [item.id]: true }))}
                      />
                    ) : (
                      <div className={`${styles.empty} ${styles[`empty_${item.tone}`] || ''} ${item.isAdd ? styles.emptyAdd : ''}`}>
                        <Icon className={styles.icon} />
                      </div>
                    )}
                  </div>
                  {renderActions && !item.isAdd ? (
                    <div className={styles.actions} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      {renderActions(item)}
                    </div>
                  ) : null}
                </div>
                <div className={styles.body}>
                  <span className={styles.label}>{item.label}</span>
                  <strong className={styles.value}>{item.value}</strong>
                  {item.meta ? <span className={styles.meta}>{item.meta}</span> : null}
                </div>
              </article>
            </div>
          )
        })}
      </div>
    </div>
  )
}
