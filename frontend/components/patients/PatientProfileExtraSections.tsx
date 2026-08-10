'use client'

import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { notificationSummary } from '@/lib/patient-profile-extra'
import type { QuickAddForm } from '@/lib/quick-add-patient'
import {
  PatientProfileExtraPanel,
  type ExtraSectionId,
  type PatientSelectOption,
} from './PatientProfileExtraPanels'
import styles from './PatientProfileExtraSections.module.scss'

type Props = {
  form: QuickAddForm
  onChange: (partial: Partial<QuickAddForm>) => void
  excludeUserId?: string
  lookingUpCep?: boolean
  cepLookupError?: string
  onCepChange: (value: string) => void
}

const DOCUMENT_MAX_LABEL = '40 MB'

const EMPTY_OPEN: Record<ExtraSectionId, boolean> = {
  additionalContacts: false,
  emergencyContacts: false,
  guardians: false,
  identityDocuments: false,
  notifications: false,
  address: false,
  attachments: false,
}

export function PatientProfileExtraSections({
  form,
  onChange,
  excludeUserId = '',
  lookingUpCep = false,
  cepLookupError = '',
  onCepChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [openSections, setOpenSections] = useState(EMPTY_OPEN)
  const [patientOptions, setPatientOptions] = useState<PatientSelectOption[]>([
    { value: '', label: 'Pesquise/Selecione' },
  ])
  const [patientsLoaded, setPatientsLoaded] = useState(false)

  const sections: Array<{ id: ExtraSectionId; title: string; summary: string }> = [
    {
      id: 'additionalContacts',
      title: 'Contatos adicionais',
      summary: form.additionalContacts.length
        ? `${form.additionalContacts.length} contato(s)`
        : 'Sem contatos adicionais',
    },
    {
      id: 'emergencyContacts',
      title: 'Contatos de emergência',
      summary: form.emergencyContacts.length
        ? `${form.emergencyContacts.length} contato(s)`
        : 'Sem contatos de emergência',
    },
    {
      id: 'guardians',
      title: 'Responsável',
      summary: form.guardianEnabled
        ? `${form.guardians.length || 0} responsável(is)`
        : 'Sem responsável',
    },
    {
      id: 'identityDocuments',
      title: 'Documentos',
      summary: form.identityDocuments.length
        ? `${form.identityDocuments.length} documento(s)`
        : 'Nenhum documento cadastrado',
    },
    {
      id: 'notifications',
      title: 'Notificações',
      summary: notificationSummary(form),
    },
    {
      id: 'address',
      title: 'Endereço',
      summary:
        form.city && form.state
          ? `${form.city} — ${form.state}`
          : 'Endereço não informado',
    },
    {
      id: 'attachments',
      title: 'Anexos',
      summary: form.profileAttachments.length
        ? `${form.profileAttachments.length} arquivo(s)`
        : 'Nenhum anexo',
    },
  ]

  async function loadPatients() {
    try {
      const users = await apiFetch<Array<{ id: string; name?: string; role?: string }>>('/users')
      const options = (Array.isArray(users) ? users : [])
        .filter((entry) => entry?.role === 'PACIENTE' && entry.id !== excludeUserId)
        .map((entry) => ({ value: entry.id, label: entry.name || 'Paciente' }))
      setPatientOptions([{ value: '', label: 'Pesquise/Selecione' }, ...options])
      setPatientsLoaded(true)
    } catch {
      setPatientOptions([{ value: '', label: 'Pesquise/Selecione' }])
    }
  }

  function toggleSection(id: ExtraSectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
    if (!patientsLoaded && (id === 'emergencyContacts' || id === 'guardians')) {
      void loadPatients()
    }
  }

  return (
    <section>
      <div className={styles.list}>
        {sections.map((section) => {
          const open = openSections[section.id]
          return (
            <div key={section.id} className={styles.block}>
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={open}
                onClick={() => toggleSection(section.id)}
              >
                <span className={styles.toggleTitle}>{section.title}</span>
                <span className={styles.toggleEnd}>
                  {!open ? (
                    <span className={styles.toggleSummary}>{section.summary}</span>
                  ) : null}
                  <ChevronDown
                    className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                    aria-hidden
                  />
                </span>
              </button>
              {open ? (
                <div className={styles.panel}>
                  <PatientProfileExtraPanel
                    id={section.id}
                    form={form}
                    onChange={onChange}
                    patientOptions={patientOptions}
                    patientsLoaded={patientsLoaded}
                    loadPatients={() => void loadPatients()}
                    lookingUpCep={lookingUpCep}
                    cepLookupError={cepLookupError}
                    onCepChange={onCepChange}
                    dragActive={dragActive}
                    setDragActive={setDragActive}
                    fileInputRef={fileInputRef}
                    documentMaxLabel={DOCUMENT_MAX_LABEL}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
