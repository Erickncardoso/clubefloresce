'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  ChevronDown,
  Contact,
  DollarSign,
  LayoutDashboard,
  MessageSquare,
  MessageSquareQuote,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Radio,
  Users,
  UsersRound,
  UtensilsCrossed,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { InstagramIcon } from '@/components/ui/InstagramIcon'
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

const menu: MenuItem[] = [
  { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Agenda', path: '/agenda', icon: Calendar },
  { label: 'Cursos', path: '/cursos', icon: BookOpen },
  { label: 'Comunidade', path: '/comunidade', icon: Users },
  { label: 'Check-ins', path: '/check-in', icon: CalendarCheck },
  { label: 'Push', path: '/notificacoes', icon: Bell },
  { label: 'Diário', path: '/diario', icon: UtensilsCrossed },
  { label: 'Financeiro', path: '/financeiro', icon: DollarSign },
  { label: 'Personalizar', path: '/personalizar', icon: Palette },
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

function BrandGlyph({ brand, size = 16 }: { brand: Brand; size?: number }) {
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
  if (brand) return <BrandGlyph brand={brand} size={16} />
  if (Icon) return <Icon size={16} aria-hidden />
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
  if (path === '/agenda') return pathname.startsWith('/agenda')
  if (path === '/check-in') return pathname.startsWith('/check-in')
  if (path === '/notificacoes') return pathname.startsWith('/notificacoes')
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
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (collapsed && !mobileOpen) {
      setOpenGroups({})
      return
    }
    setOpenGroups((prev) => {
      const next = { ...prev }
      if (pathname.startsWith('/whatsapp/')) next.WhatsApp = true
      if (pathname.startsWith('/instagram')) next.Instagram = true
      return next
    })
  }, [pathname, collapsed, mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseMobile()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  function onGroupClick(item: MenuItem) {
    if (collapsed && !mobileOpen) {
      onToggleCollapsed()
      setOpenGroups((prev) => ({ ...prev, [item.label]: true }))
      return
    }
    setOpenGroups((prev) => ({ ...prev, [item.label]: !prev[item.label] }))
  }

  const showChildren = (label: string) =>
    Boolean(openGroups[label]) && (!collapsed || mobileOpen)

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
            <img src="/icons/logovetorcarregamento.svg" alt="" width={24} height={34} />
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
            {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </div>

        <nav className={styles.nav}>
          {menu.map((item) => {
            if (item.children?.length) {
              const groupActive = item.prefix ? pathname.startsWith(item.prefix) : false
              const open = showChildren(item.label)
              return (
                <div key={item.label} className={styles.group}>
                  <button
                    type="button"
                    className={`${styles.groupToggle} ${groupActive ? styles.groupToggleActive : ''} ${open ? styles.groupToggleOpen : ''}`}
                    aria-expanded={open}
                    title={item.label}
                    onClick={() => onGroupClick(item)}
                  >
                    <ItemIcon brand={item.brand} Icon={item.icon} />
                    <span>{item.label}</span>
                    <ChevronDown size={14} className={styles.chevron} aria-hidden />
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
                            className={`admin-sidebar-link ${styles.link} ${styles.linkChild} ${childActive ? styles.linkActive : ''}`}
                            onClick={onCloseMobile}
                          >
                            <ItemIcon brand={child.brand} Icon={child.icon} />
                            <span>{child.label}</span>
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
                className={`admin-sidebar-link ${styles.link} ${active ? styles.linkActive : ''}`}
                onClick={onCloseMobile}
              >
                {Icon ? <Icon size={16} aria-hidden /> : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
