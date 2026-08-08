'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import styles from './TileActionsMenu.module.scss'

type Props = {
  menuKey: string
  children: ReactNode
}

export function TileActionsMenu({ menuKey, children }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={styles.root} data-menu-key={menuKey}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Ações"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div
          className={styles.menu}
          role="menu"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
