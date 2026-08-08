'use client'

import { CalendarDays, Info, Mail, Pencil, Phone, UserRound } from 'lucide-react'
import type { ElementType } from 'react'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { buildWhatsappUrl, formatPhoneDisplay } from '@/lib/patient-chart/patient-format'
import type { PatientProfile, PatientUser } from '@/lib/patient-chart/types'
import styles from './PatientChartInfoList.module.scss'

type InfoItem = {
  label: string
  value: string
  icon: ElementType
  whatsappUrl?: string | null
}

type Props = {
  user: PatientUser | null
  profile?: PatientProfile
  onEdit?: () => void
}

export function PatientChartInfoList({ user, onEdit }: Props) {
  const phone = user?.phone ?? null
  const formattedPhone = formatPhoneDisplay(phone)
  const waUrl = buildWhatsappUrl(phone)

  const statusLabel = (() => {
    const key = String(user?.status || 'ATIVO').toUpperCase()
    if (key === 'INATIVO') return 'Inativo'
    if (key === 'PENDENTE') return 'Pendente'
    return 'Ativo'
  })()

  const createdLabel = (() => {
    if (!user?.createdAt) return '—'
    return new Date(user.createdAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  })()

  const items: InfoItem[] = [
    { label: 'Nome completo', value: user?.name || '—', icon: UserRound },
    { label: 'Email', value: user?.email || '—', icon: Mail },
    {
      label: 'Telefone',
      value: formattedPhone,
      icon: Phone,
      whatsappUrl: waUrl || null,
    },
    { label: 'Cadastrado em', value: createdLabel, icon: CalendarDays },
    { label: 'Status', value: statusLabel, icon: Info },
  ]

  return (
    <div className={styles.pci}>
      <ul className={styles.pciList}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.label} className={styles.pciRow}>
              <span className={styles.pciIcon} aria-hidden="true">
                <Icon size={15} />
              </span>
              <div className={styles.pciCopy}>
                <span className={styles.pciLabel}>{item.label}</span>
                <span className={styles.pciValue}>
                  {item.value}
                  {item.whatsappUrl && (
                    <a
                      href={item.whatsappUrl}
                      className={styles.pciWa}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir WhatsApp"
                      aria-label="Abrir WhatsApp"
                    >
                      <WhatsAppIcon className={styles.pciWaIcon} />
                    </a>
                  )}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className={styles.pciEdit} onClick={onEdit}>
        <Pencil className={styles.pciEditIcon} aria-hidden="true" size={14} />
        Editar informações
      </button>
    </div>
  )
}
