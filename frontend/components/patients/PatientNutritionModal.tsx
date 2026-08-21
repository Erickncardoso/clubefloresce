'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NutritionMonthView } from '@/components/evolucao/NutritionMonthView'
import { AnimatedDialog } from '@/components/overlays'
import { PatientAvatar } from '@/components/patients/PatientAvatar'
import { PatientCheckinsPanel } from '@/components/patients/PatientCheckinsPanel'
import { PatientGoalsPanel } from '@/components/patients/PatientGoalsPanel'
import { PatientPhotosPanel } from '@/components/patients/PatientPhotosPanel'
import type { TemplateCheckInResponse } from '@/lib/patient-chart/api'
import styles from './PatientNutritionModal.module.scss'

export type NutritionModalTab = 'checkins' | 'fotos' | 'metas' | 'desempenho'

type NutritionTarget = {
  caloriesKcal?: number
  carbsG?: number
  proteinG?: number
  fatG?: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  patientName?: string
  patientAvatar?: string | null
  kicker?: string
  meta?: ReactNode
  initialTab?: NutritionModalTab
  nutritionTarget?: NutritionTarget | null
  checkinResponses?: TemplateCheckInResponse[]
  /** Respostas do check-in (coluna esquerda) */
  leftTitle?: string
  leftPanel?: ReactNode
  profileHref?: string
  onProfileClick?: () => void
}

function leftTitleForTab(tab: NutritionModalTab, hasCheckin: boolean): string {
  if (hasCheckin) return 'Respostas do check-in'
  if (tab === 'checkins') return 'Check-ins recentes'
  if (tab === 'metas') return 'Metas do paciente'
  if (tab === 'desempenho') return 'Desempenho nutricional'
  return 'Check-ins recentes'
}

export function PatientNutritionModal({
  open,
  onOpenChange,
  patientId,
  patientName = 'Paciente',
  patientAvatar,
  kicker = 'Evolução nutricional',
  meta,
  initialTab = 'checkins',
  nutritionTarget = null,
  checkinResponses = [],
  leftTitle,
  leftPanel,
  profileHref,
  onProfileClick,
}: Props) {
  const [activeTab, setActiveTab] = useState<NutritionModalTab>(initialTab)
  const hasCheckin = Boolean(leftPanel)
  // No review de check-in, sempre o mockup (celular + fotos do lado)
  const reviewCheckin = hasCheckin && activeTab !== 'metas' && activeTab !== 'desempenho'

  useEffect(() => {
    if (open) setActiveTab(initialTab === 'checkins' ? 'fotos' : initialTab)
  }, [open, initialTab])

  const leftContent = reviewCheckin ? (
    leftPanel
  ) : activeTab === 'metas' ? (
    <PatientGoalsPanel patientId={patientId} nutritionTarget={nutritionTarget} compact limit={8} />
  ) : activeTab === 'desempenho' ? (
    <NutritionMonthView patientId={patientId} compact />
  ) : (
    <PatientCheckinsPanel responses={checkinResponses} />
  )

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Evolução nutricional — ${patientName}`}
      bare
      overlayClassName={styles.overlay}
      contentClassName={styles.card}
    >
      <header className={styles.head}>
        <div className={styles.headMain}>
          <PatientAvatar src={patientAvatar} name={patientName} size="md" ring={false} />
          <div className={styles.headCopy}>
            <span className={styles.kicker}>{kicker}</span>
            <h2 className={styles.name}>{patientName}</h2>
            {meta ? <p className={styles.meta}>{meta}</p> : null}
          </div>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Fechar"
          onClick={() => onOpenChange(false)}
        >
          ×
        </button>
      </header>

      <div className={`${styles.layout} ${reviewCheckin ? styles.layoutSingle : ''}`}>
        <div className={styles.left}>
          {reviewCheckin ? null : (
            <h3 className={styles.subtitle}>{leftTitle ?? leftTitleForTab(activeTab, hasCheckin)}</h3>
          )}
          <div className={styles.leftBody}>{leftContent}</div>
        </div>

        {reviewCheckin ? null : (
          <aside className={styles.right} aria-label="Fotos de refeições">
            <PatientPhotosPanel patientId={patientId} compact limit={12} />
          </aside>
        )}
      </div>

      <footer className={styles.foot}>
        <button
          type="button"
          className={`btn-ghost ${styles.footClose}`}
          onClick={() => onOpenChange(false)}
        >
          Fechar
        </button>
        <div className={styles.footActions}>
          {!hasCheckin ? (
            <button
              type="button"
              className={`btn-ghost ${activeTab === 'checkins' || activeTab === 'fotos' ? styles.footTabActive : ''}`}
              onClick={() => setActiveTab('checkins')}
            >
              Check-ins
            </button>
          ) : (
            <button
              type="button"
              className={`btn-ghost ${activeTab === 'fotos' ? styles.footTabActive : ''}`}
              onClick={() => setActiveTab('fotos')}
            >
              Fotos
            </button>
          )}
          <button
            type="button"
            className={`btn-ghost ${activeTab === 'metas' ? styles.footTabActive : ''}`}
            onClick={() => setActiveTab('metas')}
          >
            Metas
          </button>
          <button
            type="button"
            className={`btn-ghost ${activeTab === 'desempenho' ? styles.footTabActive : ''}`}
            onClick={() => setActiveTab('desempenho')}
          >
            Nutrição
          </button>
          {profileHref ? (
            <Link
              href={profileHref}
              className="btn-primary"
              onClick={() => {
                onProfileClick?.()
                onOpenChange(false)
              }}
            >
              Perfil do paciente
            </Link>
          ) : null}
        </div>
      </footer>
    </AnimatedDialog>
  )
}
