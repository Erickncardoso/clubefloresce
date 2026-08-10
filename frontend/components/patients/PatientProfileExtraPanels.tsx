'use client'

import {
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from 'react'
import { CloudUpload, HelpCircle, Plus, Trash2 } from 'lucide-react'
import { CfSelect } from '@/components/ui/CfSelect'
import {
  CONTACT_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  IDENTITY_DOC_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  createAdditionalContactRow,
  createAttachmentRow,
  createEmergencyContactRow,
  createGuardianRow,
  createIdentityDocumentRow,
  type LinkedContactRow,
  type ProfileAttachmentRow,
} from '@/lib/patient-profile-extra'
import {
  QUICK_ADD_OPTIONS,
  type QuickAddForm,
} from '@/lib/quick-add-patient'
import styles from './PatientProfileExtraSections.module.scss'

export type ExtraSectionId =
  | 'additionalContacts'
  | 'emergencyContacts'
  | 'guardians'
  | 'identityDocuments'
  | 'notifications'
  | 'address'
  | 'attachments'

export type PatientSelectOption = { value: string; label: string }

type PanelsProps = {
  id: ExtraSectionId
  form: QuickAddForm
  onChange: (partial: Partial<QuickAddForm>) => void
  patientOptions: PatientSelectOption[]
  patientsLoaded: boolean
  loadPatients: () => void
  lookingUpCep: boolean
  cepLookupError: string
  onCepChange: (value: string) => void
  dragActive: boolean
  setDragActive: (active: boolean) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  documentMaxLabel: string
}

const NOTIFY_CHANNELS = [
  { key: 'notifyEmail' as const, label: 'E-mail' },
  { key: 'notifySms' as const, label: 'SMS' },
  { key: 'notifyWhatsapp' as const, label: 'WhatsApp' },
]

function patchRow<T extends { _key: string }>(rows: T[], key: string, patch: Partial<T>): T[] {
  return rows.map((row) => (row._key === key ? { ...row, ...patch } : row))
}

function removeAt<T>(rows: T[], index: number): T[] {
  return rows.filter((_, i) => i !== index)
}

export function PatientProfileExtraPanel({
  id,
  form,
  onChange,
  patientOptions,
  patientsLoaded,
  loadPatients,
  lookingUpCep,
  cepLookupError,
  onCepChange,
  dragActive,
  setDragActive,
  fileInputRef,
  documentMaxLabel,
}: PanelsProps) {
  function onLinkedUserPick(
    field: 'emergencyContacts' | 'guardians',
    row: LinkedContactRow,
    contactUserId: string,
  ) {
    const match = patientOptions.find((item) => item.value === contactUserId)
    onChange({
      [field]: patchRow(form[field], row._key, {
        contactUserId,
        contactName: match?.label || '',
      }),
    })
  }

  function appendFiles(fileList: FileList | null | undefined) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const next: ProfileAttachmentRow[] = [
      ...form.profileAttachments,
      ...files.map((file) => createAttachmentRow(file)),
    ]
    onChange({ profileAttachments: next })
  }

  if (id === 'additionalContacts') {
    return (
      <>
        {form.additionalContacts.map((row, index) => (
          <div key={row._key} className={`${styles.row} ${styles.row3}`}>
            <div className="field field--float">
              <label htmlFor={`pp-add-type-${row._key}`}>Tipo</label>
              <CfSelect
                id={`pp-add-type-${row._key}`}
                value={row.type}
                options={CONTACT_TYPE_OPTIONS}
                placeholder="Selecione"
                onChange={(type) =>
                  onChange({
                    additionalContacts: patchRow(form.additionalContacts, row._key, { type }),
                  })
                }
              />
            </div>
            <div className="field field--float">
              <label htmlFor={`pp-add-number-${row._key}`}>Número</label>
              <input
                id={`pp-add-number-${row._key}`}
                value={row.number}
                type="text"
                placeholder={row.type ? 'Digite' : 'Selecione o tipo'}
                onChange={(event) =>
                  onChange({
                    additionalContacts: patchRow(form.additionalContacts, row._key, {
                      number: event.target.value,
                    }),
                  })
                }
              />
            </div>
            <button
              type="button"
              className={styles.remove}
              aria-label="Remover contato"
              onClick={() =>
                onChange({ additionalContacts: removeAt(form.additionalContacts, index) })
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.link}
          onClick={() =>
            onChange({
              additionalContacts: [...form.additionalContacts, createAdditionalContactRow()],
            })
          }
        >
          <Plus size={15} /> Adicionar contato
        </button>
      </>
    )
  }

  if (id === 'emergencyContacts') {
    return (
      <>
        <div className={styles.panelActions}>
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              onChange({
                emergencyContacts: [...form.emergencyContacts, createEmergencyContactRow()],
              })
              if (!patientsLoaded) loadPatients()
            }}
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>
        {form.emergencyContacts.map((row, index) => (
          <div key={row._key} className={`${styles.row} ${styles.row3}`}>
            <div className="field field--float">
              <label htmlFor={`pp-em-rel-${row._key}`}>
                Parentesco <span className={styles.req}>*</span>
              </label>
              <CfSelect
                id={`pp-em-rel-${row._key}`}
                value={row.relationship}
                options={RELATIONSHIP_OPTIONS}
                placeholder="Selecione"
                onChange={(relationship) =>
                  onChange({
                    emergencyContacts: patchRow(form.emergencyContacts, row._key, {
                      relationship,
                    }),
                  })
                }
              />
            </div>
            <div className="field field--float">
              <label htmlFor={`pp-em-user-${row._key}`}>Responsável</label>
              <CfSelect
                id={`pp-em-user-${row._key}`}
                value={row.contactUserId}
                options={patientOptions}
                placeholder="Pesquise/Selecione"
                onChange={(contactUserId) =>
                  onLinkedUserPick('emergencyContacts', row, contactUserId)
                }
              />
            </div>
            <button
              type="button"
              className={styles.remove}
              aria-label="Remover contato de emergência"
              onClick={() =>
                onChange({ emergencyContacts: removeAt(form.emergencyContacts, index) })
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </>
    )
  }

  if (id === 'guardians') {
    return (
      <>
        <div className={styles.toggleRow}>
          <label className={styles.switch}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={form.guardianEnabled}
              onChange={(event) => onChange({ guardianEnabled: event.target.checked })}
            />
            <span className={styles.switchTrack} aria-hidden />
          </label>
          <span className={styles.switchLabel}>Habilitar responsável</span>
          <span className={styles.tipWrap}>
            <button
              type="button"
              className={styles.tipTrigger}
              aria-label="Informação sobre responsável"
            >
              <HelpCircle size={14} aria-hidden />
            </button>
            <span role="tooltip" className={styles.tip}>
              Ao habilitar, este paciente passa a ter uma pessoa responsável
            </span>
          </span>
        </div>

        {form.guardianEnabled ? (
          <>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  onChange({ guardians: [...form.guardians, createGuardianRow()] })
                  if (!patientsLoaded) loadPatients()
                }}
              >
                <Plus size={15} /> Adicionar
              </button>
            </div>
            {form.guardians.map((row, index) => (
              <div key={row._key} className={`${styles.row} ${styles.row2}`}>
                <div className="field field--float">
                  <label htmlFor={`pp-guard-rel-${row._key}`}>
                    Parentesco <span className={styles.req}>*</span>
                  </label>
                  <CfSelect
                    id={`pp-guard-rel-${row._key}`}
                    value={row.relationship}
                    options={RELATIONSHIP_OPTIONS}
                    placeholder="Selecione"
                    onChange={(relationship) =>
                      onChange({
                        guardians: patchRow(form.guardians, row._key, { relationship }),
                      })
                    }
                  />
                </div>
                <div className={`field field--float ${styles.fieldWithRemove}`}>
                  <label htmlFor={`pp-guard-user-${row._key}`}>Responsável</label>
                  <CfSelect
                    id={`pp-guard-user-${row._key}`}
                    value={row.contactUserId}
                    options={patientOptions}
                    placeholder="Pesquise/Selecione"
                    onChange={(contactUserId) =>
                      onLinkedUserPick('guardians', row, contactUserId)
                    }
                  />
                  <button
                    type="button"
                    className={`${styles.remove} ${styles.removeCorner}`}
                    aria-label="Remover responsável"
                    onClick={() => onChange({ guardians: removeAt(form.guardians, index) })}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : null}
      </>
    )
  }

  if (id === 'identityDocuments') {
    return (
      <>
        {form.identityDocuments.map((row, index) => (
          <div key={row._key} className={`${styles.row} ${styles.row3}`}>
            <div className="field field--float">
              <label htmlFor={`pp-doc-type-${row._key}`}>Tipo</label>
              <CfSelect
                id={`pp-doc-type-${row._key}`}
                value={row.type}
                options={IDENTITY_DOC_TYPE_OPTIONS}
                placeholder="Selecione"
                onChange={(type) =>
                  onChange({
                    identityDocuments: patchRow(form.identityDocuments, row._key, { type }),
                  })
                }
              />
            </div>
            <div className="field field--float">
              <label htmlFor={`pp-doc-number-${row._key}`}>Número</label>
              <input
                id={`pp-doc-number-${row._key}`}
                value={row.number}
                type="text"
                placeholder={row.type ? 'Digite' : 'Selecione o tipo'}
                onChange={(event) =>
                  onChange({
                    identityDocuments: patchRow(form.identityDocuments, row._key, {
                      number: event.target.value,
                    }),
                  })
                }
              />
            </div>
            <button
              type="button"
              className={styles.remove}
              aria-label="Remover documento"
              onClick={() =>
                onChange({ identityDocuments: removeAt(form.identityDocuments, index) })
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.link}
          onClick={() =>
            onChange({
              identityDocuments: [...form.identityDocuments, createIdentityDocumentRow()],
            })
          }
        >
          <Plus size={15} /> Adicionar documento
        </button>
      </>
    )
  }

  if (id === 'notifications') {
    return (
      <div className={styles.notifyRow}>
        {NOTIFY_CHANNELS.map((channel) => (
          <label key={channel.key} className={styles.notify}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={form[channel.key]}
              onChange={(event) => onChange({ [channel.key]: event.target.checked })}
            />
            <span className={styles.switchTrack} aria-hidden />
            <span>{channel.label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (id === 'address') {
    return (
      <>
        <div className={`${styles.row} ${styles.row2}`}>
          <div className="field field--float">
            <label htmlFor="pp-country">País</label>
            <CfSelect
              id="pp-country"
              value={form.country}
              options={COUNTRY_OPTIONS}
              onChange={(country) => onChange({ country })}
            />
          </div>
          <div className={`field field--float ${styles.cepField}`}>
            <label htmlFor="pp-zip">
              Código postal <span className={styles.req}>*</span>
            </label>
            <input
              id="pp-zip"
              value={form.zipCode}
              inputMode="numeric"
              placeholder="00000-000"
              maxLength={9}
              onChange={(event) => onCepChange(event.target.value)}
            />
            <button
              type="button"
              className={styles.cepLink}
              onClick={() => {
                const digits = String(form.zipCode || '').replace(/\D/g, '')
                if (digits.length === 8) onCepChange(form.zipCode)
              }}
            >
              Buscar CEP
            </button>
            {lookingUpCep ? (
              <p className={styles.hint}>Buscando endereço…</p>
            ) : cepLookupError ? (
              <p className={`${styles.hint} ${styles.hintError}`}>{cepLookupError}</p>
            ) : null}
          </div>
        </div>
        <div className={`${styles.row} ${styles.row2}`}>
          <div className="field field--float">
            <label htmlFor="pp-state">
              Estado <span className={styles.req}>*</span>
            </label>
            <CfSelect
              id="pp-state"
              value={form.state}
              options={QUICK_ADD_OPTIONS.stateOptions}
              placeholder="Selecione"
              onChange={(state) => onChange({ state })}
            />
          </div>
          <div className="field field--float">
            <label htmlFor="pp-city">
              Cidade <span className={styles.req}>*</span>
            </label>
            <input
              id="pp-city"
              value={form.city}
              placeholder="Digite"
              onChange={(event) => onChange({ city: event.target.value })}
            />
          </div>
        </div>
        <div className={`${styles.row} ${styles.row2}`}>
          <div className="field field--float">
            <label htmlFor="pp-neighborhood">
              Bairro <span className={styles.req}>*</span>
            </label>
            <input
              id="pp-neighborhood"
              value={form.neighborhood}
              placeholder="Digite"
              onChange={(event) => onChange({ neighborhood: event.target.value })}
            />
          </div>
          <div className="field field--float">
            <label htmlFor="pp-street">
              Rua <span className={styles.req}>*</span>
            </label>
            <input
              id="pp-street"
              value={form.street}
              placeholder="Digite"
              onChange={(event) => onChange({ street: event.target.value })}
            />
          </div>
        </div>
        <div className={`${styles.row} ${styles.row2}`}>
          <div className="field field--float">
            <label htmlFor="pp-street-number">
              Número <span className={styles.req}>*</span>
            </label>
            <input
              id="pp-street-number"
              value={form.streetNumber}
              placeholder="Digite"
              onChange={(event) => onChange({ streetNumber: event.target.value })}
            />
          </div>
          <div className="field field--float">
            <label htmlFor="pp-complement">Complemento</label>
            <input
              id="pp-complement"
              value={form.addressComplement}
              placeholder="Digite"
              onChange={(event) => onChange({ addressComplement: event.target.value })}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        className={`${styles.dropzone} ${dragActive ? styles.dropzoneDrag : ''}`}
        onDragOver={(event: DragEvent) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(event: DragEvent) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault()
          setDragActive(false)
          appendFiles(event.dataTransfer?.files)
        }}
      >
        <CloudUpload size={24} aria-hidden />
        <p className={styles.dropText}>Arraste arquivos aqui ou</p>
        <button
          type="button"
          className={styles.dropBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          Escolher arquivos
        </button>
        <p className={styles.dropHint}>
          PDF, imagens e documentos — até {documentMaxLabel}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className={styles.fileInput}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            appendFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>
      {form.profileAttachments.length ? (
        <ul className={styles.files}>
          {form.profileAttachments.map((file, index) => (
            <li key={file._key}>
              <span className={styles.fileName}>{file.name}</span>
              {file.file && !file.url ? (
                <span className={styles.filePending}>pendente</span>
              ) : null}
              <button
                type="button"
                className={`${styles.remove} ${styles.removeInline}`}
                aria-label="Remover anexo"
                onClick={() =>
                  onChange({
                    profileAttachments: removeAt(form.profileAttachments, index),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
