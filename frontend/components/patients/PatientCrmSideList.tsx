'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  Mail,
  Phone,
  Search,
  Square,
  UserPlus,
} from 'lucide-react'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import { apiFetch } from '@/lib/api'
import { buildChartTabHref, normalizeChartTab } from '@/lib/patient-chart/nav'
import { buildPatientPath } from '@/lib/patient-slug'
import type { AuthUser, EngagementZones } from '@/lib/types'
import styles from './PatientCrmSideList.module.scss'

type Props = {
  onNavigate?: () => void
}

function planTone(plan?: string | null): 'high' | 'mid' | 'low' {
  const p = String(plan || '').toUpperCase()
  if (p.includes('PLATINUM') || p.includes('PREMIUM') || p.includes('ANUAL')) return 'high'
  if (p.includes('PRO') || p.includes('PLUS') || p.includes('MENSAL')) return 'mid'
  return 'low'
}

/** Ex.: PLATINUM → Platinum (evita grito em caixa alta) */
function formatPlanLabel(plan?: string | null): string {
  const raw = String(plan || '').trim()
  if (!raw) return ''
  return raw
    .toLowerCase()
    .split(/([\s/_-]+)/)
    .map((part) => {
      if (/^[\s/_-]+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}

export function PatientCrmSideList({ onNavigate }: Props) {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const activeId = params?.id || ''
  const activeTab = normalizeChartTab(searchParams.get('tab'))

  const [patients, setPatients] = useState<AuthUser[]>([])
  const [zones, setZones] = useState<EngagementZones | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const activeCardRef = useRef<HTMLAnchorElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [users, engagement] = await Promise.all([
        apiFetch<AuthUser[]>('/users'),
        apiFetch<{ zones?: EngagementZones }>('/patients/engagement-zones').catch(() => null),
      ])
      const list = (Array.isArray(users) ? users : [])
        .filter((u) => u.role === 'PACIENTE')
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
      setPatients(list)
      setZones(engagement?.zones || null)
    } catch {
      setPatients([])
      setZones(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const dangerIds = useMemo(
    () => new Set((zones?.danger || []).map((p) => p.id)),
    [zones],
  )
  const attentionIds = useMemo(
    () => new Set((zones?.attention || []).map((p) => p.id)),
    [zones],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => {
      const hay = `${p.name || ''} ${p.email || ''} ${p.plan || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [patients, query])

  useEffect(() => {
    if (!activeId || loading) return
    const frame = window.requestAnimationFrame(() => {
      activeCardRef.current?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeId, loading, filtered])

  function patientHref(patient: AuthUser) {
    if (activeTab && activeTab !== 'visao') {
      return buildChartTabHref(patient.id, activeTab)
    }
    return buildPatientPath(patient)
  }

  function statusLine(patient: AuthUser) {
    if (dangerIds.has(patient.id)) return 'Precisa de atenção urgente'
    if (attentionIds.has(patient.id)) return 'Engajamento em queda'
    if (patient.email) return 'Acompanhar'
    return 'Ficha da paciente'
  }

  function StatusIcon({ patient }: { patient: AuthUser }) {
    if (dangerIds.has(patient.id)) return <FileText size={14} strokeWidth={1.5} aria-hidden />
    if (attentionIds.has(patient.id)) return <Phone size={14} strokeWidth={1.5} aria-hidden />
    return <Mail size={14} strokeWidth={1.5} aria-hidden />
  }

  function priorityLabel(patient: AuthUser): { label: string; tone: 'high' | 'mid' | 'low' } {
    if (dangerIds.has(patient.id)) return { label: 'Alta', tone: 'high' }
    if (attentionIds.has(patient.id)) return { label: 'Média', tone: 'mid' }
    return { label: 'Baixa', tone: planTone(patient.plan) === 'high' ? 'mid' : 'low' }
  }

  const dangerCount = zones?.danger?.length || 0
  const attentionCount = zones?.attention?.length || 0
  const okCount = zones?.success?.length || 0

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={15} strokeWidth={1.5} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              aria-label="Buscar paciente"
            />
          </label>
          <button
            type="button"
            className={styles.addBtn}
            aria-label="Adicionar paciente"
            title="Adicionar paciente"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className={styles.stats}>
          <article className={`${styles.statCard} ${styles.statTotal}`}>
            <div className={styles.statLabel}>
              <Square size={12} strokeWidth={2} aria-hidden />
              Lista
            </div>
            <strong>{loading ? '—' : filtered.length}</strong>
          </article>
          <article className={`${styles.statCard} ${styles.statDanger}`}>
            <div className={styles.statLabel}>
              <Square size={12} strokeWidth={2} aria-hidden />
              Perigo
            </div>
            <strong>{loading ? '—' : dangerCount}</strong>
          </article>
          <article className={`${styles.statCard} ${styles.statAttention}`}>
            <div className={styles.statLabel}>
              <Square size={12} strokeWidth={2} aria-hidden />
              Atenção
            </div>
            <strong>{loading ? '—' : attentionCount}</strong>
          </article>
          <article className={`${styles.statCard} ${styles.statOk}`}>
            <div className={styles.statLabel}>
              <Square size={12} strokeWidth={2} aria-hidden />
              Em dia
            </div>
            <strong>{loading ? '—' : okCount}</strong>
          </article>
        </div>

        <div className={styles.worklistTitle}>
          <span>
            <Square size={12} strokeWidth={2} aria-hidden />
            Lista
          </span>
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
        </div>
      </div>

      <ul className={styles.list} aria-label="Lista de pacientes">
        {filtered.map((patient) => {
          const active = patient.id === activeId
          const priority = priorityLabel(patient)
          return (
            <li key={patient.id}>
              <Link
                ref={active ? activeCardRef : undefined}
                href={patientHref(patient)}
                className={`${styles.card} ${active ? styles.cardActive : ''}`}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
              >
                <div className={styles.cardTop}>
                  <PatientAvatar
                    src={patient.avatar}
                    name={patient.name}
                    size="lg"
                    circle
                    className={styles.cardAvatar}
                  />
                  <div className={styles.cardCopy}>
                    <strong>{patient.name || 'Sem nome'}</strong>
                    <span>
                      {[formatPlanLabel(patient.plan), 'Paciente'].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <ArrowUpRight className={styles.cardArrow} size={16} strokeWidth={1.5} aria-hidden />
                </div>
                <div className={styles.cardFoot}>
                  <StatusIcon patient={patient} />
                  <p>{statusLine(patient)}</p>
                  <em className={`${styles.tag} ${styles[`tag_${priority.tone}`]}`}>
                    {priority.label}
                  </em>
                </div>
              </Link>
            </li>
          )
        })}
        {!loading && filtered.length === 0 ? (
          <li className={styles.empty}>Nenhuma paciente encontrada.</li>
        ) : null}
      </ul>

      <QuickAddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(user) => {
          setAddOpen(false)
          void load()
          if (user?.id) router.push(buildPatientPath(user))
        }}
      />
    </div>
  )
}
