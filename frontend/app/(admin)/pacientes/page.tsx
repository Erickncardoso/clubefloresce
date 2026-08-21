'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, UsersRound } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { buildPatientPath } from '@/lib/patient-slug'
import type { AuthUser } from '@/lib/types'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import styles from './pacientes-index.module.scss'

export default function PacientesIndexPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const users = await apiFetch<AuthUser[]>('/users')
        if (!alive) return
        const patients = (Array.isArray(users) ? users : []).filter((u) => u.role === 'PACIENTE')
        if (patients.length > 0) {
          router.replace(buildPatientPath(patients[0]))
          return
        }
        setEmpty(true)
      } catch {
        if (alive) setEmpty(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [router])

  if (loading && !empty) {
    return (
      <div className={styles.state} aria-busy>
        <p>Carregando pacientes…</p>
      </div>
    )
  }

  if (!empty) return null

  return (
    <div className={styles.state}>
      <div className={styles.emptyCard}>
        <span className={styles.emptyIcon} aria-hidden>
          <UsersRound size={28} strokeWidth={1.6} />
        </span>
        <h1>Nenhuma paciente ainda</h1>
        <p>Cadastre a primeira paciente para abrir a ficha no estilo CRM.</p>
        <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
          <UserPlus size={16} aria-hidden />
          Adicionar Paciente
        </button>
      </div>

      <QuickAddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(user) => {
          setAddOpen(false)
          if (user?.id) router.push(buildPatientPath(user))
        }}
      />
    </div>
  )
}
