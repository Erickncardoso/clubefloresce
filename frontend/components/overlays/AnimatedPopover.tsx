'use client'

import type { ReactElement, ReactNode } from 'react'
import { Popover } from 'radix-ui'
import motion from './OverlayMotion.module.scss'
import { joinOverlayClassNames } from './overlay-utils'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Align = 'start' | 'center' | 'end'

type AnimatedPopoverProps = {
  trigger: ReactElement
  children: ReactNode
  contentClassName?: string

  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void

  side?: Side
  align?: Align
  /** No padrão medido: ~4px entre botão e painel */
  sideOffset?: number
  collisionPadding?: number
  modal?: boolean
}

/**
 * Popover ancorado com fade só de opacidade (150ms ease).
 * Sem scale e sem translateY — geometria já na posição final.
 */
export function AnimatedPopover({
  trigger,
  children,
  contentClassName,
  open,
  defaultOpen,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  collisionPadding = 12,
  modal = false,
}: AnimatedPopoverProps) {
  return (
    <Popover.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={joinOverlayClassNames(motion.surface, contentClassName)}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
