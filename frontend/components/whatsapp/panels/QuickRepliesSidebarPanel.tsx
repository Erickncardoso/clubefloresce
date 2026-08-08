'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Loader, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import type { QuickReply } from '@/lib/whatsapp/quick-replies'
import { quickReplyPreviewText } from '@/lib/whatsapp/quick-replies'
import styles from './QuickRepliesSidebarPanel.module.scss'

interface Props {
  items: QuickReply[]
  loading: boolean
  onClose: () => void
  onAddNew: () => void
  onSelect: (reply: QuickReply) => void
  onEdit: (reply: QuickReply) => void
  onDelete: (reply: QuickReply) => void
}

export function QuickRepliesSidebarPanel({
  items,
  loading,
  onClose,
  onAddNew,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const [hoveredId, setHoveredId] = useState('')
  const [openMenuId, setOpenMenuId] = useState('')

  const replyKey = (r: QuickReply) => String(r?.id || r?.shortCut || '')

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
    <div className={styles.sidebar}>
      <header className={styles.header}>
        <button type="button" className={styles.iconBtn} aria-label="Fechar" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h2 className={styles.title}>Respostas rápidas</h2>
        <button type="button" className={styles.iconBtn} aria-label="Nova resposta" onClick={onAddNew}>
          <Plus size={20} />
        </button>
      </header>

      {loading ? (
        <div className={styles.stateBox}>
          <Loader size={28} className={styles.spinner} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.emptyText}>Nenhuma resposta rápida encontrada.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((reply) => {
            const key = replyKey(reply)
            const menuOpen = openMenuId === key
            const showMenu = !reply.onWhatsApp && (hoveredId === key || menuOpen)
            return (
              <div
                key={key}
                className={styles.itemWrap}
                onMouseEnter={() => setHoveredId(key)}
                onMouseLeave={() => { if (openMenuId !== key) setHoveredId('') }}
              >
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => onSelect(reply)}
                >
                  <span className={styles.itemTitle}>{reply.shortCut}</span>
                  <span className={styles.itemPreview}>{quickReplyPreviewText(reply)}</span>
                </button>

                {showMenu && (
                  <button
                    type="button"
                    className={styles.menuBtn}
                    aria-expanded={menuOpen ? 'true' : 'false'}
                    aria-label="Opções da resposta rápida"
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
                      disabled={Boolean(reply.onWhatsApp)}
                      onClick={() => { setOpenMenuId(''); onEdit(reply) }}
                    >
                      <Pencil size={18} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`${styles.menuAction} ${styles.menuActionDanger}`}
                      role="menuitem"
                      disabled={Boolean(reply.onWhatsApp)}
                      onClick={() => { setOpenMenuId(''); onDelete(reply) }}
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
