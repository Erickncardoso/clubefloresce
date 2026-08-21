'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  Contact,
  Home,
  LayoutGrid,
  MessageSquare,
  MessageSquareQuote,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Radio,
  Settings2,
  Users,
  UsersRound,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { AnimatedPopover } from '@/components/overlays'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { InstagramIcon } from '@/components/ui/InstagramIcon'
import type { AuthUser } from '@/lib/types'
import styles from './Sidebar.module.scss'

type Brand = 'whatsapp' | 'instagram'

type ChildItem = {
  label: string
  path: string
  icon: LucideIcon
  brand?: Brand
}

type MenuItem = {
  label: string
  path?: string
  icon?: LucideIcon
  brand?: Brand
  prefix?: string
  children?: ChildItem[]
}

const ICON_PROPS = { size: 18, strokeWidth: 1.5 } as const

const menu: MenuItem[] = [
  { label: 'Início', path: '/dashboard', icon: Home },
  { label: 'Pacientes', path: '/pacientes', icon: UsersRound },
  { label: 'Agenda', path: '/agenda', icon: CalendarDays },
  { label: 'Cursos', path: '/cursos', icon: BookOpen },
  { label: 'Comunidade', path: '/comunidade', icon: Users },
  { label: 'Check-ins', path: '/check-in', icon: ClipboardCheck },
  { label: 'Diário', path: '/diario', icon: NotebookPen },
  { label: 'Financeiro', path: '/financeiro', icon: Wallet },
  { label: 'Personalizar', path: '/personalizar', icon: Settings2 },
  {
    label: 'WhatsApp',
    brand: 'whatsapp',
    prefix: '/whatsapp/',
    children: [
      { label: 'Conexão', path: '/whatsapp/conexao', icon: Plug, brand: 'whatsapp' },
      { label: 'Chat ao Vivo', path: '/whatsapp/chat', icon: MessageSquare, brand: 'whatsapp' },
      { label: 'CRM', path: '/whatsapp/crm', icon: Contact, brand: 'whatsapp' },
      { label: 'Transmissão', path: '/whatsapp/disparos', icon: Radio, brand: 'whatsapp' },
      { label: 'Grupos', path: '/whatsapp/grupos', icon: UsersRound, brand: 'whatsapp' },
      { label: 'Respostas', path: '/whatsapp/respostas', icon: MessageSquareQuote, brand: 'whatsapp' },
    ],
  },
  {
    label: 'Instagram',
    brand: 'instagram',
    prefix: '/instagram',
    children: [
      { label: 'Conexão', path: '/instagram', icon: Plug, brand: 'instagram' },
      { label: 'Automações', path: '/instagram/automacoes', icon: Workflow, brand: 'instagram' },
    ],
  },
]

function BrandGlyph({ brand, size = 18 }: { brand: Brand; size?: number }) {
  if (brand === 'whatsapp') {
    return <WhatsAppIcon size={size} className={styles.brandWhatsapp} />
  }
  return <InstagramIcon size={size} className={styles.brandInstagram} />
}

function ItemIcon({
  brand,
  Icon,
}: {
  brand?: Brand
  Icon?: LucideIcon
}): ReactNode {
  if (brand) return <BrandGlyph brand={brand} size={18} />
  if (Icon) return <Icon {...ICON_PROPS} aria-hidden />
  return null
}

function isPathActive(pathname: string, path: string) {
  if (pathname === path) return true
  if (path === '/instagram') return false
  return Boolean(path) && pathname.startsWith(`${path}/`)
}

function isLeafActive(pathname: string, path?: string) {
  if (!path) return false
  if (path === '/dashboard') return pathname.startsWith('/dashboard')
  if (path === '/pacientes') return pathname.startsWith('/pacientes')
  if (path === '/agenda') return pathname.startsWith('/agenda')
  if (path === '/check-in') return pathname.startsWith('/check-in')
  if (path === '/diario') return pathname.startsWith('/diario')
  if (path === '/financeiro') return pathname.startsWith('/financeiro')
  if (path === '/cursos') {
    return (
      pathname.startsWith('/cursos') ||
      pathname.startsWith('/ebooks') ||
      pathname.startsWith('/modulos')
    )
  }
  if (path === '/comunidade') return pathname.startsWith('/comunidade')
  if (path === '/personalizar') return pathname.startsWith('/personalizar')
  return pathname === path || pathname.startsWith(`${path}/`)
}

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  profile?: Pick<AuthUser, 'name' | 'avatar' | 'email'>
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  profile,
}: Props) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [flyout, setFlyout] = useState<string | null>(null)
  const rail = collapsed && !mobileOpen

  useEffect(() => {
    if (rail) {
      setOpenGroups({})
      return
    }
    setOpenGroups((prev) => {
      const next = { ...prev }
      if (pathname.startsWith('/whatsapp/')) next.WhatsApp = true
      if (pathname.startsWith('/instagram')) next.Instagram = true
      return next
    })
  }, [pathname, rail])

  useEffect(() => {
    setFlyout(null)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseMobile()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fechar menu"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}
        aria-label="Menu principal"
      >
        <div className={styles.brandRow}>
          <Link
            href="/dashboard"
            className={styles.logoLink}
            aria-label="Ir para o início"
            onClick={onCloseMobile}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logovetorcarregamento.svg" alt="" width={28} height={28} />
            <strong className={styles.brandText}>Florescer</strong>
          </Link>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen {...ICON_PROPS} aria-hidden />
            ) : (
              <PanelLeftClose {...ICON_PROPS} aria-hidden />
            )}
          </button>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/dashboard"
            title="Visão geral"
            className={`${styles.iconBtn} ${pathname.startsWith('/dashboard') ? styles.iconBtnActive : styles.iconBtnSoft}`}
            onClick={onCloseMobile}
          >
            <LayoutGrid {...ICON_PROPS} aria-hidden />
            <span className={styles.label}>Visão geral</span>
          </Link>

          {menu.map((item) => {
            if (item.children?.length) {
              const groupActive = item.prefix ? pathname.startsWith(item.prefix) : false
              const open = Boolean(openGroups[item.label]) && !rail
              const flyoutOpen = rail && flyout === item.label
              const trigger = (
                <button
                  type="button"
                  className={`${styles.iconBtn} ${groupActive ? styles.iconBtnActive : ''}`}
                  aria-expanded={flyoutOpen || open}
                  title={item.label}
                >
                  <ItemIcon brand={item.brand} Icon={item.icon || BriefcaseBusiness} />
                  <span className={styles.label}>{item.label}</span>
                </button>
              )

              if (rail) {
                return (
                  <div key={item.label} className={styles.group}>
                    <AnimatedPopover
                      open={flyoutOpen}
                      onOpenChange={(next) => setFlyout(next ? item.label : null)}
                      side="right"
                      align="start"
                      sideOffset={10}
                      trigger={trigger}
                      contentClassName={styles.flyout}
                    >
                      <p className={styles.flyoutTitle}>{item.label}</p>
                      {item.children.map((child) => {
                        const childActive = isPathActive(pathname, child.path)
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            className={`${styles.flyoutLink} ${childActive ? styles.flyoutLinkActive : ''}`}
                            onClick={() => {
                              setFlyout(null)
                              onCloseMobile()
                            }}
                          >
                            <ItemIcon brand={child.brand} Icon={child.icon} />
                            <span>{child.label}</span>
                          </Link>
                        )
                      })}
                    </AnimatedPopover>
                  </div>
                )
              }

              return (
                <div key={item.label} className={styles.group}>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${groupActive ? styles.iconBtnActive : ''}`}
                    aria-expanded={open}
                    title={item.label}
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [item.label]: !prev[item.label],
                      }))
                    }
                  >
                    <ItemIcon brand={item.brand} Icon={item.icon || BriefcaseBusiness} />
                    <span className={styles.label}>{item.label}</span>
                  </button>
                  {open ? (
                    <div className={styles.subnav}>
                      {item.children.map((child) => {
                        const childActive = isPathActive(pathname, child.path)
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            title={child.label}
                            className={`${styles.iconBtn} ${styles.iconBtnChild} ${childActive ? styles.iconBtnActive : ''}`}
                            onClick={onCloseMobile}
                          >
                            <ItemIcon brand={child.brand} Icon={child.icon} />
                            <span className={styles.label}>{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            }

            const Icon = item.icon
            const active = isLeafActive(pathname, item.path)
            return (
              <Link
                key={item.label}
                href={item.path!}
                title={item.label}
                className={`${styles.iconBtn} ${active ? styles.iconBtnActive : ''}`}
                onClick={onCloseMobile}
              >
                {Icon ? <Icon {...ICON_PROPS} aria-hidden /> : null}
                <span className={styles.label}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.foot}>
          <Link
            href="/notificacoes"
            title="Notificações"
            className={`${styles.iconBtn} ${pathname.startsWith('/notificacoes') ? styles.iconBtnActive : ''}`}
            onClick={onCloseMobile}
          >
            <Bell {...ICON_PROPS} aria-hidden />
            <span className={styles.label}>Notificações</span>
          </Link>
          <Link
            href="/personalizar"
            title={profile?.name || 'Perfil'}
            className={styles.avatarLink}
            onClick={onCloseMobile}
          >
            <PatientAvatar
              src={profile?.avatar}
              name={profile?.name}
              size="sm"
              circle
              className={styles.avatar}
            />
            <span className={styles.label}>{profile?.name || 'Perfil'}</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
