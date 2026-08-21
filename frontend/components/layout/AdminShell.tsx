'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { PatientCrmSideList } from '@/components/patients/PatientCrmSideList'
import { verifyAuthSession } from '@/lib/auth'
import {
  isPatientChartPath,
  isPatientFullPageEditor,
} from '@/lib/patient-chart/nav'
import type { AuthUser } from '@/lib/types'
import styles from './AdminShell.module.scss'

const SIDEBAR_COLLAPSED_KEY = 'cf-admin-sidebar-collapsed'

type Props = {
  children: React.ReactNode
}

export function AdminShell({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsedBeforePatientChart = useRef<boolean | null>(null)
  const hydrated = useRef(false)

  const showPatientChartSidebar =
    isPatientChartPath(pathname) && !isPatientFullPageEditor(pathname)
  const isWhatsappChat = pathname === '/whatsapp/chat' || pathname.startsWith('/whatsapp/chat/')
  const fullPageEditor = isPatientFullPageEditor(pathname) || isWhatsappChat

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const session = await verifyAuthSession({ requiredRole: 'NUTRICIONISTA' })
        if (!alive) return
        if (!session) {
          setChecking(false)
          router.replace('/login')
          return
        }
        setUser(session)
      } catch {
        if (!alive) return
        router.replace('/login')
      } finally {
        if (alive) setChecking(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [router])

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    } catch {
      setCollapsed(false)
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    if (showPatientChartSidebar) {
      if (collapsedBeforePatientChart.current === null) {
        collapsedBeforePatientChart.current = collapsed
      }
      setCollapsed(true)
      return
    }
    if (collapsedBeforePatientChart.current !== null) {
      setCollapsed(collapsedBeforePatientChart.current)
      collapsedBeforePatientChart.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to chart sidebar presence
  }, [showPatientChartSidebar])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const persistCollapsed = useCallback((next: boolean) => {
    if (showPatientChartSidebar) return
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [showPatientChartSidebar])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      persistCollapsed(next)
      return next
    })
  }, [persistCollapsed])

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])

  if (checking) {
    return (
      <div className={styles.loading}>
        <span>Carregando painel…</span>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div
      className={`admin-shell ${styles.shell} ${collapsed ? styles.shellCollapsed : ''} ${showPatientChartSidebar ? styles.shellPatientChart : ''} ${fullPageEditor ? styles.shellFullEditor : ''} ${isWhatsappChat ? styles.shellWhatsappChat : ''}`}
    >
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
        profile={{ name: user.name, avatar: user.avatar, email: user.email }}
      />
      {showPatientChartSidebar ? (
        <aside className={styles.patientChartSidebar} aria-label="Lista de pacientes">
          <PatientCrmSideList />
        </aside>
      ) : null}
      <div
        className={`main-content ${styles.main} ${isWhatsappChat ? styles.mainWhatsappChat : ''}`}
      >
        {!fullPageEditor ? (
          <button
            type="button"
            className={styles.mobileNavBtn}
            aria-label="Abrir menu"
            onClick={openMobile}
          >
            <Menu size={20} strokeWidth={1.5} aria-hidden />
          </button>
        ) : null}
        <div
          className={`content-body ${styles.content} ${showPatientChartSidebar ? styles.contentPatientChart : ''} ${fullPageEditor ? styles.contentFullEditor : ''} ${isWhatsappChat ? styles.contentWhatsappChat : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
