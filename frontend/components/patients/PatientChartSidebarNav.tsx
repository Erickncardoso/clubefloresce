'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { fetchPatientUser, type PatientUser } from '@/lib/patient-chart/api'
import {
  PATIENT_CHART_TABS,
  PATIENT_EVOLUCAO_SUBS,
  buildChartTabHref,
  chartTabIcon,
  getActiveEvolucaoSub,
  normalizeChartTab,
} from '@/lib/patient-chart/nav'
import styles from './PatientChartSidebarNav.module.scss'

type Props = {
  mobile?: boolean
  onNavigate?: () => void
}

export function PatientChartSidebarNav({ mobile = false, onNavigate }: Props) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const patientId = params?.id || ''

  const [patientUser, setPatientUser] = useState<PatientUser | null>(null)

  const activeTab = useMemo(() => {
    if (/\/documentos\/[^/]+$/.test(pathname)) return 'documentos'
    if (/\/planos\/[^/]+$/.test(pathname)) return 'planos'
    return normalizeChartTab(searchParams.get('tab'))
  }, [pathname, searchParams])

  const activeEvolucaoSub = getActiveEvolucaoSub(searchParams)

  useEffect(() => {
    if (!patientId) {
      setPatientUser(null)
      return
    }
    let alive = true
    ;(async () => {
      try {
        const user = await fetchPatientUser(patientId)
        if (alive) setPatientUser(user)
      } catch {
        if (alive) setPatientUser(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [patientId])

  const whatsappUrl = useMemo(() => {
    const digits = String(patientUser?.phone || '').replace(/\D/g, '')
    if (!digits) return ''
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`
    return `https://wa.me/${withCountry}`
  }, [patientUser?.phone])

  function tabHref(tabId: string, sub?: string) {
    return buildChartTabHref(patientId, tabId, { sub })
  }

  return (
    <div className={`${styles.nav} ${mobile ? styles.mobile : ''}`}>
      {!mobile ? (
        <div className={styles.profile}>
          <div className={styles.avatarWrap}>
            <PatientAvatar
              src={patientUser?.avatar}
              name={patientUser?.name || 'Paciente'}
              size="xl"
              ring={false}
            />
          </div>
          <h2 className={styles.name}>{patientUser?.name || 'Carregando…'}</h2>
          {whatsappUrl ? (
            <div className={styles.actions}>
              <a
                href={whatsappUrl}
                className={styles.message}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className={styles.messageIcon} />
                Enviar mensagem
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {mobile ? (
        <Link href="/dashboard" className={`${styles.link} ${styles.back}`} onClick={onNavigate}>
          <ArrowLeft size={16} className={styles.linkIcon} aria-hidden />
          <span className={styles.linkLabel}>Voltar ao início</span>
        </Link>
      ) : null}

      <nav className={styles.menu} aria-label="Seções da ficha">
        {PATIENT_CHART_TABS.map((tab) => {
          const Icon = chartTabIcon(tab.id)
          const active = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              className={`${styles.link} ${active ? styles.linkActive : ''}`}
              onClick={onNavigate}
            >
              <Icon size={16} className={styles.linkIcon} aria-hidden />
              <span className={styles.linkLabel}>{tab.label}</span>
              {tab.badge ? (
                <span className={`${styles.badge} ${active ? styles.badgeOnActive : ''}`}>
                  {tab.badge}
                </span>
              ) : null}
            </Link>
          )
        })}

        {activeTab === 'evolucao' ? (
          <div className={styles.evolucao}>
            {PATIENT_EVOLUCAO_SUBS.map((sub) => (
              <Link
                key={sub.id}
                href={tabHref('evolucao', sub.id)}
                className={`${styles.link} ${styles.child} ${activeEvolucaoSub === sub.id ? styles.linkActive : ''}`}
                onClick={onNavigate}
              >
                <span className={styles.linkLabel}>{sub.label}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </nav>
    </div>
  )
}
