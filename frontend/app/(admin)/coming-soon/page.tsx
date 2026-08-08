'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import styles from './coming-soon.module.scss'

function ComingSoonInner() {
  const params = useSearchParams()
  const from = params.get('from') || 'esta área'

  return (
    <div className={`admin-shell-card ${styles.card}`}>
      <h1>Em migração</h1>
      <p>
        <strong>{from}</strong> ainda vive no Nuxt legado (`frontend2/`). O painel Next já usa o mesmo backend.
      </p>
    </div>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <ComingSoonInner />
    </Suspense>
  )
}
