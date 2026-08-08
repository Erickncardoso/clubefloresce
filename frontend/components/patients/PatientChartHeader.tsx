'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CalendarDays, Video } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import type { PatientOverview, PatientProfileData, PatientUser } from '@/lib/patient-chart/api'
import { isPatientAccessExpired } from '@/lib/patient-chart/billing'
import styles from './PatientChartHeader.module.scss'

type Props = {
  user: PatientUser | null
  profile?: PatientProfileData
  overview?: PatientOverview | null
  sectionLabel?: string
  compact?: boolean
  onEditPatient?: () => void
  onStartCall?: () => void
}

export function PatientChartHeader({
  user,
  sectionLabel = '',
  compact = true,
  onEditPatient,
  onStartCall,
}: Props) {
  const sinceLabel = useMemo(() => {
    const raw = user?.approvedAt || user?.createdAt
    if (!raw) return ''
    return new Date(raw).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  }, [user?.approvedAt, user?.createdAt])

  const whatsappUrl = useMemo(() => {
    const digits = String(user?.phone || '').replace(/\D/g, '')
    if (!digits) return ''
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`
    return `https://wa.me/${withCountry}`
  }, [user?.phone])

  const accessExpired = isPatientAccessExpired(user?.accessExpiresAt)

  return (
    <header className={styles.header}>
      <div className={styles.headRow}>
        <nav className={styles.breadcrumb} aria-label="Navegação">
          <Link href="/dashboard" className={styles.crumb}>
            Início
          </Link>
          <span className={styles.sep} aria-hidden>
            ›
          </span>
          <span className={`${styles.crumb} ${styles.crumbName}`}>{user?.name || 'Paciente'}</span>
          {sectionLabel ? (
            <>
              <span className={styles.sep} aria-hidden>
                ›
              </span>
              <span className={`${styles.crumb} ${styles.crumbCurrent}`} aria-current="page">
                {sectionLabel}
              </span>
            </>
          ) : null}
        </nav>

        <div className={styles.toolbar}>
          {sinceLabel ? (
            <p className={styles.since}>
              <CalendarDays size={14} aria-hidden />
              <span>Desde {sinceLabel}</span>
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.callBtn}`}
              title="Ligar por vídeo"
              aria-label="Ligar por vídeo"
              onClick={onStartCall}
            >
              <Video size={16} aria-hidden />
            </button>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                className={`${styles.iconBtn} ${styles.waBtn}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                aria-label="Abrir WhatsApp"
              >
                <WhatsAppIcon />
              </a>
            ) : null}
            <button type="button" className={`btn-primary ${styles.editBtn}`} onClick={onEditPatient}>
              Editar paciente
            </button>
          </div>
        </div>
      </div>

      {compact && sectionLabel ? <h1 className={styles.sectionTitle}>{sectionLabel}</h1> : null}

      {accessExpired ? (
        <p className={styles.expiredNote}>Acesso expirado</p>
      ) : null}
    </header>
  )
}
