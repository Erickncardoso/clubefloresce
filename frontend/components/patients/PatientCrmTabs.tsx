'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Bell, CalendarDays, Mail } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { PatientPushModal } from '@/components/patients/PatientPushModal'
import {
  PATIENT_CHART_TABS,
  chartTabIcon,
  type ChartTabId,
} from '@/lib/patient-chart/nav'
import styles from './PatientCrmTabs.module.scss'

type Props = {
  activeTab: ChartTabId
  onSelectTab: (tabId: ChartTabId) => void
  phone?: string | null
  email?: string | null
  patientId?: string
  patientName?: string | null
  agendaHref?: string
}

/** Path do SVG do usuário (viewBox 0 0 177 35) */
const TAB_PATH =
  'M0 35H0.109069C2.18463 34.9959 33.2076 34.7544 35 23.5C38.5 2.5 39 0 54.5 0H118C141 0 137.5 4.5 141 24C142.758 33.7919 170.037 34.4642 175.538 35H177V35H0Z'

function TabShell({ children }: { children: ReactNode }) {
  return (
    <>
      <span className={styles.tabBg} aria-hidden>
        <svg className={styles.capLeft} viewBox="0 0 54.5 35" preserveAspectRatio="none">
          <path fill="#fff" d={TAB_PATH} />
        </svg>
        <span className={styles.mid} />
        <svg className={styles.capRight} viewBox="118 0 59 35" preserveAspectRatio="none">
          <path fill="#fff" d={TAB_PATH} />
        </svg>
      </span>
      <span className={styles.tabInner}>{children}</span>
    </>
  )
}

function scrollTabToCenter(rail: HTMLElement, tab: HTMLElement) {
  const railBox = rail.getBoundingClientRect()
  const tabBox = tab.getBoundingClientRect()
  const delta =
    tabBox.left + tabBox.width / 2 - (railBox.left + railBox.width / 2)
  rail.scrollBy({ left: delta, behavior: 'smooth' })
}

export function PatientCrmTabs({
  activeTab,
  onSelectTab,
  phone,
  email,
  patientId,
  patientName,
  agendaHref = '/agenda',
}: Props) {
  const [pushOpen, setPushOpen] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  const whatsappUrl = useMemo(() => {
    const digits = String(phone || '').replace(/\D/g, '')
    if (!digits) return ''
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`
    return `https://wa.me/${withCountry}`
  }, [phone])

  const mailUrl = email ? `mailto:${email}` : ''

  useEffect(() => {
    const rail = railRef.current
    const tab = activeTabRef.current
    if (!rail || !tab) return
    const frame = window.requestAnimationFrame(() => {
      scrollTabToCenter(rail, tab)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab])

  return (
    <nav className={styles.tabs} aria-label="Seções da ficha">
      <div className={styles.bar}>
        <div className={styles.actions}>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              className={styles.actionBtn}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              title="WhatsApp"
            >
              <WhatsAppIcon className={styles.wa} />
            </a>
          ) : (
            <span className={`${styles.actionBtn} ${styles.actionDisabled}`} aria-hidden>
              <WhatsAppIcon className={styles.wa} />
            </span>
          )}
          {mailUrl ? (
            <a href={mailUrl} className={styles.actionBtn} aria-label="E-mail" title="E-mail">
              <Mail size={16} strokeWidth={1.5} aria-hidden />
            </a>
          ) : (
            <span className={`${styles.actionBtn} ${styles.actionDisabled}`} aria-hidden>
              <Mail size={16} strokeWidth={1.5} />
            </span>
          )}
          <Link href={agendaHref} className={styles.actionBtn} aria-label="Agenda" title="Agenda">
            <CalendarDays size={16} strokeWidth={1.5} aria-hidden />
          </Link>
          <button
            type="button"
            className={styles.actionBtn}
            aria-label="Notificação"
            title="Enviar notificação"
            onClick={() => setPushOpen(true)}
          >
            <Bell size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div ref={railRef} className={styles.rail}>
          {PATIENT_CHART_TABS.map((tab) => {
            const Icon = chartTabIcon(tab.id)
            const active = activeTab === tab.id
            const label = (
              <>
                {active ? <Icon size={16} strokeWidth={1.5} aria-hidden /> : null}
                <span>{tab.label}</span>
                {tab.badge ? <em className={styles.tabBadge}>{tab.badge}</em> : null}
              </>
            )
            return (
              <button
                key={tab.id}
                type="button"
                ref={active ? activeTabRef : undefined}
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelectTab(tab.id)}
              >
                {active ? <TabShell>{label}</TabShell> : label}
              </button>
            )
          })}
        </div>
      </div>

      {patientId ? (
        <PatientPushModal
          open={pushOpen}
          patientId={patientId}
          patientName={patientName}
          onOpenChange={setPushOpen}
        />
      ) : null}
    </nav>
  )
}
