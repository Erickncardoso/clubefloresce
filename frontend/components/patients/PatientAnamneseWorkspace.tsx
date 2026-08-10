'use client'

import { useState } from 'react'
import { MoreVertical, Stethoscope } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { Anamnese, PatientUser, PatientProfile } from '@/lib/types'
import { AnimatedPopover } from '@/components/overlays'
import s from './PatientWorkspace.module.scss'

const ANAMNESE_LIMIT = 5

function htmlToPlain(html: string): string {
  const value = String(html || '')
  if (!value.trim()) return ''
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
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

// ── AnamneseEditorModal ───────────────────────────────────────────────────────

function AnamneseEditorModal({
  anamnese,
  user,
  onClose,
  onSave,
}: {
  anamnese: Anamnese | null
  user: PatientUser
  onClose: () => void
  onSave: (item: Anamnese) => Promise<void>
}) {
  const isNew = !anamnese?.id
  const [title, setTitle] = useState(anamnese?.title || 'Anamnese')
  const [content, setContent] = useState(anamnese?.content || '')
  const [status, setStatus] = useState<'draft' | 'completed'>(
    anamnese?.status === 'completed' ? 'completed' : 'draft',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(nextStatus: 'draft' | 'completed') {
    setSaving(true)
    setError('')
    try {
      const now = new Date().toISOString()
      const item: Anamnese = {
        id: anamnese?.id || crypto.randomUUID(),
        title: title.trim() || (nextStatus === 'completed' ? 'Anamnese concluída' : 'Anamnese em andamento'),
        content,
        formData: anamnese?.formData ?? null,
        foodRestrictions: anamnese?.foodRestrictions ?? null,
        interpretation: anamnese?.interpretation ?? null,
        status: nextStatus,
        authorName: anamnese?.authorName || 'Nutricionista',
        createdAt: anamnese?.createdAt || now,
        updatedAt: now,
      }
      await onSave(item)
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: string; message?: string }; message?: string })?.data?.error ||
        (err as { data?: { message?: string } })?.data?.message ||
        (err as { message?: string })?.message ||
        'Erro ao salvar anamnese.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(28,32,28,0.45)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="admin-shell-card"
        style={{
          width: '100%',
          maxWidth: '42rem',
          margin: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.5rem',
          maxHeight: '90dvh',
          overflow: 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Nova anamnese' : 'Editar anamnese'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            {isNew ? 'Nova anamnese' : 'Editar anamnese'} — {user.name}
          </h2>
          <button type="button" className="btn-secondary" style={{ padding: '0.3rem 0.65rem' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="field field--float">
          <label>Título</label>
          <input
            type="text"
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field field--float">
          <label>Conteúdo</label>
          <textarea
            rows={10}
            maxLength={20000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Queixa principal, histórico de saúde, hábitos alimentares…"
            style={{ resize: 'vertical' }}
          />
        </div>

        {error && <p className={s.error}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={saving}
            onClick={() => handleSave('draft')}
          >
            {saving ? 'Salvando…' : 'Salvar rascunho'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={() => handleSave('completed')}
          >
            {saving ? 'Salvando…' : 'Concluir anamnese'}
          </button>
        </div>
      </div>
    </div>
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
  const [listError, setListError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSeed, setEditorSeed] = useState<Anamnese | null>(null)

  const anamneses: Anamnese[] = [...(
    Array.isArray(user?.patientProfileData?.anamneses)
      ? user.patientProfileData!.anamneses!
      : Array.isArray(profile?.anamneses)
        ? profile.anamneses!
        : []
  )].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )

  function startNew() {
    if (anamneses.length >= ANAMNESE_LIMIT) {
      setListError(`Limite de ${ANAMNESE_LIMIT} anamneses por paciente.`)
      return
    }
    setListError('')
    setEditorSeed(null)
    setEditorOpen(true)
  }

  function editItem(item: Anamnese) {
    setListError('')
    setEditorSeed(item)
    setEditorOpen(true)
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

  async function handleSave(item: Anamnese) {
    await patchAnamneses(nextList(item))
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
            disabled={anamneses.length >= ANAMNESE_LIMIT}
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
          <button type="button" className={`btn-primary ${s.btn}`} onClick={startNew}>
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

      {editorOpen && (
        <AnamneseEditorModal
          anamnese={editorSeed}
          user={user}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
