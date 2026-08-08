'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Alias legado Nuxt — gestão de cursos vive em /cursos. */
export default function GerenciarCursosRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/cursos')
  }, [router])
  return <p style={{ padding: '1.5rem', color: 'var(--admin-muted)' }}>Redirecionando para Cursos…</p>
}
