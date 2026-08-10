'use client'

import { CircleHelp, MapPin, Monitor } from 'lucide-react'

export type ModalityIconName = 'unset' | 'online' | 'presencial'

type Props = {
  name: ModalityIconName
  size?: number
  className?: string
}

export function ModalityIcon({ name, size = 17, className }: Props) {
  const props = {
    size,
    className,
    'aria-hidden': true as const,
  }

  if (name === 'online') return <Monitor {...props} />
  if (name === 'presencial') return <MapPin {...props} />
  return <CircleHelp {...props} />
}
