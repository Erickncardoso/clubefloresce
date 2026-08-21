'use client'

import { useMemo, type ReactNode } from 'react'
import { MoreHorizontal, Pencil } from 'lucide-react'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import type { PatientOverview, PatientProfileData, PatientUser } from '@/lib/patient-chart/api'
import { isPatientAccessExpired } from '@/lib/patient-chart/billing'
import { formatPhoneDisplay } from '@/lib/patient-chart/patient-format'
import styles from './PatientChartHeader.module.scss'

type Props = {
  user: PatientUser | null
  profile?: PatientProfileData
  overview?: PatientOverview | null
  sectionLabel?: string
  compact?: boolean
  onEditPatient?: () => void
  tabs?: ReactNode
}

export function PatientChartHeader({
  user,
  profile,
  onEditPatient,
  tabs,
}: Props) {
  const accessExpired = isPatientAccessExpired(user?.accessExpiresAt)
  const phoneDisplay = formatPhoneDisplay(user?.phone)
  const hasPhone = Boolean(String(user?.phone || '').replace(/\D/g, ''))

  const roleLine = useMemo(() => {
    const bits = [
      profile?.occupation,
      profile?.objective,
      user?.plan ? `Plano ${user.plan}` : null,
    ].filter(Boolean)
    return bits.length ? bits.join(' · ') : 'Paciente do Clube Florescer'
  }, [profile?.occupation, profile?.objective, user?.plan])

  const addressLine = useMemo(() => {
    const bits = [
      profile?.street,
      profile?.streetNumber,
      profile?.neighborhood,
      [profile?.city, profile?.state].filter(Boolean).join(', '),
    ].filter(Boolean)
    return bits.length ? bits.join(', ') : null
  }, [profile])

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <PatientAvatar
          src={user?.avatar}
          name={user?.name}
          size="xl"
          circle
          className={styles.avatar}
        />

        <div className={styles.middle}>
          <h1 className={styles.name}>{user?.name || 'Paciente'}</h1>
          <div className={styles.detailGrid}>
            <p className={styles.detailLeft}>{roleLine}</p>
            <p className={styles.detailRight}>
              {hasPhone ? phoneDisplay : <span className={styles.muted}>Sem telefone</span>}
            </p>
            <p className={styles.detailLeft}>
              {addressLine || <span className={styles.muted}>Endereço não informado</span>}
            </p>
            <p className={styles.detailRight}>
              {user?.email || <span className={styles.muted}>Sem e-mail</span>}
            </p>
          </div>
        </div>

        <div className={styles.aside}>
          <button type="button" className={styles.managerCard} onClick={onEditPatient}>
            <PatientAvatar
              src={user?.avatar}
              name={user?.name}
              size="xs"
              circle
              className={styles.managerAvatar}
            />
            <span className={styles.managerCopy}>
              <small>Plano</small>
              <strong>{user?.plan || 'Livre'}</strong>
            </span>
            <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
          </button>

          <div className={styles.tags}>
            {user?.plan ? <span className={`${styles.tag} ${styles.tagPlan}`}>{user.plan}</span> : null}
            {accessExpired ? (
              <span className={`${styles.tag} ${styles.tagDanger}`}>Expirado</span>
            ) : (
              <span className={`${styles.tag} ${styles.tagOk}`}>Ativo</span>
            )}
          </div>

          <button type="button" className={styles.editLink} onClick={onEditPatient}>
            <Pencil size={13} strokeWidth={1.5} aria-hidden />
            Editar
          </button>
        </div>
      </div>

      {tabs ? <div className={styles.tabsSlot}>{tabs}</div> : null}
    </header>
  )
}
