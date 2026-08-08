'use client'
import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Plus,
  Loader,
  ChevronDown,
  Pencil,
  Palette,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import type { WaLabel } from '@/lib/whatsapp/labels'
import { formatLabelConversationCount } from '@/lib/whatsapp/labels'
import styles from './LabelsSidebarPanel.module.scss'

interface Props {
  items: WaLabel[]
  loading: boolean
  onClose: () => void
  onAddNew: () => void
  onEdit: (label: WaLabel) => void
  onChooseColor: (label: WaLabel) => void
  onDelete: (label: WaLabel) => void
  onOpenChats: (label: WaLabel) => void
}

function LabelTagIcon({ colorHex }: { colorHex: string }) {
  return (
    <svg width="32" height="22" viewBox="0 0 32 22" aria-hidden="true" className={styles.tagIcon}>
      <path
        fill={colorHex || '#99b6c1'}
        d="M2 2C2 1.45 2.45 1 3 1h13c.4 0 .77.16 1.05.44l11 9.14a1.35 1.35 0 0 1 0 2.06l-11 9.14A1.48 1.48 0 0 1 16 22H3A2 2 0 0 1 1 20V2z"
      />
    </svg>
  )
}

export function LabelsSidebarPanel({
  items,
  loading,
  onClose,
  onAddNew,
  onEdit,
  onChooseColor,
  onDelete,
  onOpenChats,
}: Props) {
  const [hoveredId, setHoveredId] = useState('')
  const [openMenuId, setOpenMenuId] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const labelKey = (label: WaLabel) => String(label?.id || label?.labelid || '')

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!openMenuId) return
      const target = e.target
      if (target instanceof Element && target.closest(`.${styles.itemWrap}`)) return
      setOpenMenuId('')
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [openMenuId])

  return (
    <div className={styles.sidebar} ref={containerRef}>
      <header className={styles.header}>
        <button type="button" className={styles.iconBtn} aria-label="Fechar" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h2 className={styles.title}>Etiquetas</h2>
        <button type="button" className={styles.iconBtn} aria-label="Nova etiqueta" onClick={onAddNew}>
          <Plus size={20} />
        </button>
      </header>

      {loading ? (
        <div className={styles.stateBox}>
          <Loader size={28} className={styles.spinner} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.emptyText}>Nenhuma etiqueta encontrada.</p>
          <button type="button" className={styles.emptyBtn} onClick={onAddNew}>
            Criar etiqueta
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((label) => {
            const key = labelKey(label)
            const menuOpen = openMenuId === key
            return (
              <div
                key={key}
                className={`${styles.itemWrap}${menuOpen ? ` ${styles.menuOpen}` : ''}`}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  const t = e.target as Element
                  if (t.closest(`.${styles.menuBtn}`) || t.closest(`.${styles.menu}`)) return
                  onOpenChats(label)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenChats(label)
                  }
                }}
                onMouseEnter={() => setHoveredId(key)}
                onMouseLeave={() => {
                  if (openMenuId !== key) setHoveredId('')
                }}
              >
                <div className={styles.item}>
                  <LabelTagIcon colorHex={label.colorHex} />
                  <div className={styles.itemCopy}>
                    <span className={styles.itemTitle}>{label.name}</span>
                    <span className={styles.itemSubtitle}>
                      {formatLabelConversationCount(label.conversationCount ?? 0)}
                    </span>
                  </div>
                </div>

                {(hoveredId === key || menuOpen) && (
                  <button
                    type="button"
                    className={styles.menuBtn}
                    aria-expanded={menuOpen ? 'true' : 'false'}
                    aria-label="Opções da etiqueta"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(menuOpen ? '' : key)
                    }}
                  >
                    <ChevronDown size={18} />
                  </button>
                )}

                {menuOpen && (
                  <div
                    className={styles.menu}
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={styles.menuAction}
                      role="menuitem"
                      onClick={() => { setOpenMenuId(''); onOpenChats(label) }}
                    >
                      <MessageSquare size={18} />
                      Ver conversas
                    </button>
                    <div className={styles.menuSep} role="separator" />
                    <button
                      type="button"
                      className={styles.menuAction}
                      role="menuitem"
                      onClick={() => { setOpenMenuId(''); onEdit(label) }}
                    >
                      <Pencil size={18} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.menuAction}
                      role="menuitem"
                      onClick={() => { setOpenMenuId(''); onChooseColor(label) }}
                    >
                      <Palette size={18} />
                      Escolher cor
                    </button>
                    <div className={styles.menuSep} role="separator" />
                    <button
                      type="button"
                      className={styles.menuAction}
                      role="menuitem"
                      onClick={() => { setOpenMenuId(''); onDelete(label) }}
                    >
                      <Trash2 size={18} />
                      Apagar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
