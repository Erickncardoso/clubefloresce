/**
 * @deprecated Prefira Radix Dialog via `AnimatedDialog` / `AppModal`.
 * O Radix aplica `data-state="closed"` e só desmonta após o fade CSS —
 * não use setTimeout + `{open && …}` (corta a animação de saída).
 *
 * Mantido só para referência; não use em código novo.
 */
import { useEffect, useRef, useState } from 'react'

export function useModalAnimation(open: boolean, duration = 150) {
  const [mounted, setMounted] = useState(open)
  const [state, setState] = useState<'open' | 'closed'>(open ? 'open' : 'closed')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (open) {
      setMounted(true)
      setState('open')
    } else {
      setState('closed')
      timer.current = setTimeout(() => setMounted(false), duration)
    }
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [open, duration])

  return { mounted, state }
}
