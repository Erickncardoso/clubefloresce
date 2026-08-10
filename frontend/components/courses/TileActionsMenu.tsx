'use client'

import { ReactNode, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { AnimatedPopover } from '@/components/overlays'
import styles from './TileActionsMenu.module.scss'

type Props = {
  menuKey: string
  children: ReactNode
}

export function TileActionsMenu({ menuKey, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.root} data-menu-key={menuKey}>
      <AnimatedPopover
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        align="end"
        sideOffset={4}
        trigger={
          <button
            type="button"
            className={styles.trigger}
            aria-label="Ações"
            aria-expanded={open}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical size={16} />
          </button>
        }
        contentClassName={styles.menu}
      >
        <div
          role="menu"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
          }}
        >
          {children}
        </div>
      </AnimatedPopover>
    </div>
  )
}
