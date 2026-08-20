'use client'

import { ArrowRight, LineChart, Target } from 'lucide-react'
import Camera from '@/components/icons/CameraIcon'
import { useState } from 'react'
import { NutritionMonthView } from '@/components/evolucao/NutritionMonthView'
import { PatientGoalsPanel } from '@/components/patients/PatientGoalsPanel'
import { PatientPhotosPanel } from '@/components/patients/PatientPhotosPanel'
import styles from './PatientNutritionSection.module.scss'

type Tab = 'fotos' | 'metas' | 'desempenho'

type NutritionTarget = {
  caloriesKcal?: number
  carbsG?: number
  proteinG?: number
  fatG?: number
}

type Props = {
  patientId: string
  compact?: boolean
  showLinks?: boolean
  photoLimit?: number
  nutritionTarget?: NutritionTarget | null
  onNavigate?: (sub: string) => void
  activeTab?: Tab
  onActiveTabChange?: (tab: Tab) => void
  hideToolbar?: boolean
}

const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'fotos', label: 'Fotos', Icon: Camera },
  { id: 'metas', label: 'Metas', Icon: Target },
  { id: 'desempenho', label: 'Desempenho', Icon: LineChart },
]

const evolucaoSubMap: Record<Tab, string> = {
  fotos: 'fotos',
  metas: 'metas',
  desempenho: 'nutricao',
}

const navigateLabelMap: Record<Tab, string> = {
  fotos: 'Ver todas as fotos',
  metas: 'Ver todas as metas',
  desempenho: 'Ver detalhes',
}

export function PatientNutritionSection({
  patientId,
  compact = false,
  showLinks = false,
  photoLimit = 12,
  nutritionTarget = null,
  onNavigate,
  activeTab: activeTabProp,
  onActiveTabChange,
  hideToolbar = false,
}: Props) {
  const [internalTab, setInternalTab] = useState<Tab>('fotos')
  const activeTab = activeTabProp ?? internalTab
  const setActiveTab = (tab: Tab) => {
    if (activeTabProp === undefined) setInternalTab(tab)
    onActiveTabChange?.(tab)
  }

  const navigateSub = evolucaoSubMap[activeTab]
  const navigateLabel = navigateLabelMap[activeTab]

  return (
    <div className={[styles.pns, compact ? styles.pnsCompact : ''].filter(Boolean).join(' ')}>
      {hideToolbar ? null : (
      <div className={styles.pnsToolbar}>
        <div className={styles.pnsSegment} role="tablist" aria-label="Nutrição do paciente">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={[styles.pnsTab, activeTab === id ? styles.pnsTabActive : '']
                .filter(Boolean)
                .join(' ')}
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
            >
              <Icon className={styles.pnsTabIcon} aria-hidden="true" size={14} />
              {label}
            </button>
          ))}
        </div>

        {showLinks && onNavigate ? (
          <button
            type="button"
            className={styles.pnsLink}
            onClick={() => onNavigate(navigateSub)}
          >
            {navigateLabel}
            <ArrowRight className={styles.pnsLinkIcon} aria-hidden="true" size={14} />
          </button>
        ) : null}
      </div>
      )}

      <section
        className={styles.pnsPanel}
        role="tabpanel"
        aria-label={
          activeTab === 'fotos'
            ? 'Fotos de refeições'
            : activeTab === 'metas'
              ? 'Metas do paciente'
              : 'Desempenho nutricional'
        }
      >
        {activeTab === 'fotos' ? (
          <PatientPhotosPanel patientId={patientId} compact={compact} limit={photoLimit} />
        ) : null}
        {activeTab === 'metas' ? (
          <PatientGoalsPanel
            patientId={patientId}
            nutritionTarget={nutritionTarget}
            compact
            limit={compact ? 3 : 6}
          />
        ) : null}
        {activeTab === 'desempenho' ? (
          <NutritionMonthView patientId={patientId} compact />
        ) : null}
      </section>
    </div>
  )
}
