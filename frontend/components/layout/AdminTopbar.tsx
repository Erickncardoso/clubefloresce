'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, Menu, MessageCircle, Search, UserPlus, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logout } from '@/lib/auth'
import { buildPatientPath } from '@/lib/patient-slug'
import type { AuthUser } from '@/lib/types'
import { AnimatedDialog, AnimatedPopover } from '@/components/overlays'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { QuickAddPatientModal } from '@/components/patients/QuickAddPatientModal'
import styles from './AdminTopbar.module.scss'

type Props = {
  profile: Pick<AuthUser, 'name' | 'avatar' | 'email'>
  onPatientCreated?: (user: AuthUser) => void
  onOpenMobileNav?: () => void
}

export function AdminTopbar({ profile, onPatientCreated, onOpenMobileNav }: Props) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const list = patients.filter((p) => p.role === 'PACIENTE')
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 12)
    return list
      .filter((p) => {
        const name = String(p.name || '').toLowerCase()
        const email = String(p.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
      .slice(0, 12)
  }, [patients, query])

  useEffect(() => {
    setHighlighted(0)
  }, [filtered])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    setQuery('')
    setHighlighted(0)
    if (!patients.length) void loadPatients()
    queueMicrotask(() => inputRef.current?.focus())
  }, [searchOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPatients() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await apiFetch<AuthUser[]>('/users')
      setPatients(Array.isArray(data) ? data : [])
    } catch {
      setLoadError('Não foi possível carregar os pacientes.')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  function closeSearch() {
    setSearchOpen(false)
  }

  function openCreate() {
    closeSearch()
    setQuickAddOpen(true)
  }

  function selectPatient(patient: AuthUser) {
    closeSearch()
    router.push(buildPatientPath(patient))
  }

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!filtered.length) return
      setHighlighted((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!filtered.length) return
      setHighlighted((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const patient = filtered[highlighted]
      if (patient) selectPatient(patient)
    } else if (e.key === 'Escape') {
      closeSearch()
    }
  }

  return (
    <>
      <header className={styles.topbar}>
        {onOpenMobileNav ? (
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Abrir menu"
            title="Abrir menu"
            onClick={onOpenMobileNav}
          >
            <Menu size={20} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          className={`admin-topbar-search ${styles.searchTrigger}`}
          aria-label="Buscar paciente (Ctrl + K)"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={14} aria-hidden />
          <span>Buscar paciente</span>
          <kbd className="admin-topbar-search-kbd">Ctrl + K</kbd>
        </button>

        <div className={styles.actions}>
          <button
            type="button"
            className={`admin-topbar-icon-btn ${styles.iconBtn}`}
            title="Notificações"
            aria-label="Notificações"
          >
            <Bell size={18} aria-hidden />
          </button>
          <button
            type="button"
            className={`admin-topbar-icon-btn ${styles.iconBtn}`}
            title="Mensagens"
            aria-label="Mensagens"
          >
            <MessageCircle size={18} aria-hidden />
          </button>

          <div className={styles.profileWrap}>
            <AnimatedPopover
              align="end"
              contentClassName={`admin-topbar-profile-menu ${styles.profileMenu}`}
              trigger={
                <button
                  type="button"
                  className={`admin-topbar-profile ${styles.profile}`}
                >
                  <PatientAvatar src={profile.avatar} name={profile.name} size="sm" />
                  <span className={styles.profileCopy}>
                    <strong>{profile.name || 'Usuário'}</strong>
                    <small>Nutricionista</small>
                  </span>
                  <ChevronDown size={14} aria-hidden />
                </button>
              }
            >
              <button type="button" role="menuitem" onClick={handleLogout}>
                Sair
              </button>
            </AnimatedPopover>
          </div>
        </div>
      </header>

      {/* Search dialog — Radix handles backdrop, Escape and focus trap */}
      <AnimatedDialog
        bare
        open={searchOpen}
        onOpenChange={(o) => !o && closeSearch()}
        title="Buscar paciente"
        overlayClassName={styles.searchBackdrop}
        contentClassName={`admin-topbar-search-panel ${styles.panel}`}
      >
        <div className={styles.field}>
          <Search size={16} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            placeholder="Buscar paciente por nome ou e-mail..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
          />
          <button type="button" className={styles.close} onClick={closeSearch} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className={styles.createRow}>
          <button type="button" className="admin-topbar-search-create" onClick={openCreate}>
            <UserPlus size={15} aria-hidden />
            Novo paciente
          </button>
        </div>

        {loading ? <p className={styles.state}>Carregando pacientes…</p> : null}
        {!loading && loadError ? <p className={`${styles.state} ${styles.stateError}`}>{loadError}</p> : null}
        {!loading && !loadError && !filtered.length ? (
          <p className={styles.state}>Nenhum paciente encontrado.</p>
        ) : null}
        {!loading && filtered.length ? (
          <ul className={styles.list}>
            {filtered.map((patient, index) => (
              <li key={patient.id}>
                <button
                  type="button"
                  className={`admin-topbar-search-item ${styles.item} ${index === highlighted ? styles.itemActive : ''}`}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => selectPatient(patient)}
                >
                  <PatientAvatar src={patient.avatar} name={patient.name} size="sm" />
                  <span>
                    <strong>{patient.name}</strong>
                    <small>{patient.email || 'Sem e-mail'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </AnimatedDialog>

      <QuickAddPatientModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(user) => {
          setQuickAddOpen(false)
          setPatients((prev) => [user, ...prev.filter((p) => p.id !== user.id)])
          onPatientCreated?.(user)
        }}
      />
    </>
  )
}
