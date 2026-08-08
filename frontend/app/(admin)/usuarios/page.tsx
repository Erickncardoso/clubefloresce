'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Rota legado: usuários admin redirecionam para o dashboard. */
export default function UsuariosPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return <p>Redirecionando…</p>
}
