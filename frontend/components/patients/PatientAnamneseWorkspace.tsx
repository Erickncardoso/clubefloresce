'use client'

import { useEffect, useState } from 'react'
import { MoreVertical, Stethoscope } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { Anamnese, PatientUser, PatientProfile } from '@/lib/types'
import { AnimatedPopover, AppModal } from '@/components/overlays'
import { useAnamneseBackground } from '@/components/patients/AnamneseBackgroundProvider'
import s from './PatientWorkspace.module.scss'

const ANAMNESE_LIMIT = 5

function htmlToPlain(html: string): string {
  const value = String(html || '')
  if (!value.trim()) return ''

  // No browser: innerText já decodifica &nbsp; / &amp; / etc.
  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = value
    return (el.innerText || el.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

function preview(item: Anamnese): string {
  const fromWizard = (item?.formData as Record<string, unknown> | null)?.chiefComplaint as
    | string
    | undefined
  const value = String(fromWizard || htmlToPlain(item.content || '')).trim()
  if (!value) return 'Sem conteúdo ainda.'
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status?: string | null): string {
  if (status === 'draft') return 'Rascunho'
  return 'Concluída'
}

function badgeClass(status?: string | null): string {
  if (status === 'draft') return s.draft
  return s.completed
}

// ── TileMenu ──────────────────────────────────────────────────────────────────

function TileMenu({
  onOpen,
  onEdit,
  onDelete,
}: {
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <AnimatedPopover
      open={open}
      onOpenChange={setOpen}
      align="end"
      animated={false}
      contentClassName={s.dropdown}
      trigger={
        <button
          type="button"
          className={s.menuBtn}
          aria-label="Ações"
        >
          <MoreVertical size={15} />
        </button>
      }
    >
      <button
        type="button"
        className={s.dropdownItem}
        role="menuitem"
        onClick={() => { setOpen(false); onOpen() }}
      >
        Abrir
      </button>
      <button
        type="button"
        className={s.dropdownItem}
        role="menuitem"
        onClick={() => { setOpen(false); onEdit() }}
      >
        Editar texto livre
      </button>
      <button
        type="button"
        className={`${s.dropdownItem} ${s.danger}`}
        role="menuitem"
        onClick={() => { setOpen(false); onDelete() }}
      >
        Excluir
      </button>
    </AnimatedPopover>
  )
}

// ── CreateNewAnamneseModal ────────────────────────────────────────────────────

function CreateNewAnamneseModal({
  open,
  onOpenChange,
  onBlank,
  onImportPreconsulta,
  importError,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBlank: () => void
  onImportPreconsulta: () => void
  importError?: string
}) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Criar nova anamnese"
      description="Você pode importar as respostas preenchidas previamente pelo paciente ou iniciar uma nova em branco. Saiba mais acessando a aba Consultório → Pré-consulta."
      contentClassName={s.createModal}
    >
      <div className={s.createChoices}>
        <button type="button" className={`btn-primary ${s.createChoiceBtn}`} onClick={onBlank}>
          nova anamnese em branco
        </button>
        <button
          type="button"
          className={`btn-primary ${s.createChoiceBtn}`}
          onClick={onImportPreconsulta}
        >
          importar da pré-consulta
        </button>
        {importError ? <p className={s.error}>{importError}</p> : null}
      </div>
    </AppModal>
  )
}

// ── PatientAnamneseWorkspace ──────────────────────────────────────────────────

export type PatientAnamneseWorkspaceProps = {
  user: PatientUser
  profile?: PatientProfile | null
  onSaved: (updated: PatientUser) => void
}

export function PatientAnamneseWorkspace({ user, profile: profileProp, onSaved }: PatientAnamneseWorkspaceProps) {
  const profile = profileProp ?? (user?.patientProfileData as PatientProfile | undefined)
  const {
    isOpen: editorOpen,
    activePatientId,
    openEditor,
    restoreEditor,
    registerPatientSync,
  } = useAnamneseBackground()
  const [listError, setListError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [importError, setImportError] = useState('')

  const editorBusyHere = editorOpen && activePatientId === user.id

  const anamneses: Anamnese[] = [...(
    Array.isArray(user?.patientProfileData?.anamneses)
      ? user.patientProfileData!.anamneses!
      : Array.isArray(profile?.anamneses)
        ? profile.anamneses!
        : []
  )].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )

  useEffect(() => registerPatientSync(user.id, onSaved), [user.id, onSaved, registerPatientSync])

  function launchEditor(seed: Anamnese | null) {
    openEditor({
      user,
      seed,
      anamneses,
      onPatientUpdated: onSaved,
    })
  }

  function startNew() {
    if (editorBusyHere && restoreEditor()) return
    if (anamneses.length >= ANAMNESE_LIMIT) {
      setListError(`Limite de ${ANAMNESE_LIMIT} anamneses por paciente.`)
      return
    }
    setListError('')
    setImportError('')
    setCreateOpen(true)
  }

  function openBlankEditor() {
    setImportError('')
    setCreateOpen(false)
    launchEditor(null)
  }

  /** Importa respostas da pré-consulta do paciente, quando existirem no perfil. */
  function importFromPreconsulta() {
    const source = (profile as PatientProfile & {
      preconsulta?: Record<string, unknown> | null
      preConsultation?: Record<string, unknown> | null
    }) || {}
    const pre =
      (source.preconsulta && typeof source.preconsulta === 'object' ? source.preconsulta : null) ||
      (source.preConsultation && typeof source.preConsultation === 'object'
        ? source.preConsultation
        : null)

    if (!pre || !Object.keys(pre).length) {
      setImportError('Nenhuma pré-consulta preenchida para este paciente.')
      return
    }

    const now = new Date().toISOString()
    const chief = String(
      (pre as { chiefComplaint?: unknown }).chiefComplaint ||
        (pre as { queixa?: unknown }).queixa ||
        '',
    ).trim()
    const notes = String(
      (pre as { notes?: unknown }).notes ||
        (pre as { content?: unknown }).content ||
        '',
    ).trim()

    setImportError('')
    setCreateOpen(false)
    launchEditor({
      id: '',
      title: 'Anamnese do paciente',
      content: notes || chief,
      formData: { ...pre, ...(chief ? { chiefComplaint: chief } : {}) },
      foodRestrictions: null,
      interpretation: null,
      status: 'draft',
      authorName: 'Nutricionista',
      createdAt: now,
      updatedAt: now,
    })
  }

  function editItem(item: Anamnese) {
    if (editorBusyHere && restoreEditor()) return
    setListError('')
    launchEditor(item)
  }

  function nextList(nextItem: Anamnese | null, removeId = ''): Anamnese[] {
    const source = Array.isArray(user?.patientProfileData?.anamneses)
      ? user.patientProfileData!.anamneses!
      : Array.isArray(profile?.anamneses)
        ? profile.anamneses!
        : []
    const current = [...source]
    if (removeId) return current.filter((item) => item.id !== removeId)
    if (!nextItem) return current
    const idx = current.findIndex((item) => item.id === nextItem.id)
    if (idx >= 0) {
      current[idx] = nextItem
      return current
    }
    return [nextItem, ...current].slice(0, ANAMNESE_LIMIT)
  }

  async function patchAnamneses(list: Anamnese[]): Promise<PatientUser> {
    const updated = await apiFetch<PatientUser>(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ patientProfile: { anamneses: list } }),
    })
    onSaved(updated)
    return updated
  }

  async function removeItem(id: string) {
    if (!confirm('Excluir esta anamnese?')) return
    setListError('')
    try {
      await patchAnamneses(nextList(null, id))
    } catch (err: unknown) {
      setListError(
        (err as { message?: string })?.message || 'Erro ao excluir.',
      )
    }
  }

  return (
    <div className={s.pawork}>
      <div className={s.head}>
        <div>
          <h2>Anamnese</h2>
          <p>
            {anamneses.length} registro(s) · limite {ANAMNESE_LIMIT} por paciente
          </p>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            className={`btn-primary ${s.btn}`}
            disabled={editorBusyHere || anamneses.length >= ANAMNESE_LIMIT}
            onClick={startNew}
          >
            + Nova anamnese
          </button>
        </div>
      </div>

      {listError && <p className={s.error}>{listError}</p>}

      {anamneses.length === 0 ? (
        <div className={s.empty}>
          <Stethoscope size={28} className={s.emptyIcon} />
          <h3>Nenhuma anamnese registrada</h3>
          <p>
            Inicie a primeira anamnese para documentar queixas, histórico e hábitos do paciente.
          </p>
          <button
            type="button"
            className={`btn-primary ${s.btn}`}
            disabled={editorBusyHere}
            onClick={startNew}
          >
            + Nova anamnese
          </button>
        </div>
      ) : (
        <div className={s.list}>
          {anamneses.map((item) => (
            <article
              key={item.id}
              className={`${s.card}${item.status === 'draft' ? ` ${s.cardDraft}` : ''}`}
            >
              <button type="button" className={s.cardMain} onClick={() => editItem(item)}>
                <div className={s.cardTop}>
                  <strong className={s.cardTitle}>{item.title || 'Anamnese'}</strong>
                  <span className={`${s.badge} ${badgeClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className={s.cardPreview}>{preview(item)}</p>
                <small className={s.cardMeta}>
                  Atualizada {formatDate(item.updatedAt || item.createdAt)}
                </small>
              </button>
              <div className={s.cardActions}>
                <TileMenu
                  onOpen={() => editItem(item)}
                  onEdit={() => editItem(item)}
                  onDelete={() => removeItem(item.id)}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateNewAnamneseModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setImportError('')
        }}
        onBlank={openBlankEditor}
        onImportPreconsulta={importFromPreconsulta}
        importError={importError}
      />
    </div>
  )
}
