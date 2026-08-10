'use client'

import { useState } from 'react'
import { FlaskConical, MoreVertical } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { Exame, PatientUser, PatientProfile } from '@/lib/types'
import { canCompare, formatExameDate, EXAMES_LIMIT } from '@/lib/lab-exams'
import { AnimatedPopover } from '@/components/overlays'
import { ExameEditorModal } from './ExameEditorModal'
import { ExameComparisonPanel } from './ExameComparisonPanel'
import s from './PatientWorkspace.module.scss'
import sx from './PatientExamesWorkspace.module.scss'

function previewText(exame: Exame): string {
  const count = exame?.biomarkers?.length || 0
  const lab = exame?.labName ? ` · ${exame.labName}` : ''
  if (!count) return `Sem biomarcadores${lab}`
  return `${count} biomarcador(es)${lab}`
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status?: string | null): string {
  return status === 'draft' ? 'Rascunho' : 'Registrado'
}

function badgeClass(status?: string | null): string {
  return status === 'draft' ? s.draft : s.completed
}

// ── TileMenu ──────────────────────────────────────────────────────────────────

function TileMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <AnimatedPopover
      open={open}
      onOpenChange={setOpen}
      align="end"
      contentClassName={s.dropdown}
      trigger={
        <button type="button" className={s.menuBtn} aria-label="Ações">
          <MoreVertical size={15} />
        </button>
      }
    >
      <button
        type="button"
        className={s.dropdownItem}
        role="menuitem"
        onClick={() => { setOpen(false); onEdit() }}
      >
        Editar
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

// ── PatientExamesWorkspace ────────────────────────────────────────────────────

export type PatientExamesWorkspaceProps = {
  user: PatientUser
  profile?: PatientProfile | null
  onSaved: (updated: PatientUser) => void
}

export function PatientExamesWorkspace({ user, profile: profileProp, onSaved }: PatientExamesWorkspaceProps) {
  const profile = profileProp ?? (user?.patientProfileData as PatientProfile | undefined)
  const [listError, setListError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSeed, setEditorSeed] = useState<Exame | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mode, setMode] = useState<'list' | 'compare'>('list')

  const exames: Exame[] = [...(
    Array.isArray(user?.patientProfileData?.exames)
      ? user.patientProfileData!.exames!
      : Array.isArray(profile?.exames)
        ? profile.exames!
        : []
  )].sort((a, b) =>
    String(b.collectedAt || b.createdAt || '').localeCompare(
      String(a.collectedAt || a.createdAt || ''),
    ),
  )

  const canCompareSelected = canCompare(selectedIds)

  function startNew() {
    if (exames.length >= EXAMES_LIMIT) {
      setListError(`Limite de ${EXAMES_LIMIT} registros de exame por paciente.`)
      return
    }
    setListError('')
    setEditorSeed(null)
    setEditorOpen(true)
  }

  function editItem(item: Exame) {
    setListError('')
    setEditorSeed(item)
    setEditorOpen(true)
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    )
  }

  function nextList(nextItem: Exame | null, removeId = ''): Exame[] {
    const source = Array.isArray(user?.patientProfileData?.exames)
      ? user.patientProfileData!.exames!
      : Array.isArray(profile?.exames)
        ? profile.exames!
        : []
    const current = [...source]
    if (removeId) return current.filter((item) => item.id !== removeId)
    if (!nextItem) return current
    const idx = current.findIndex((item) => item.id === nextItem.id)
    if (idx >= 0) { current[idx] = nextItem; return current }
    return [nextItem, ...current].slice(0, EXAMES_LIMIT)
  }

  async function patchExames(list: Exame[]): Promise<PatientUser> {
    const updated = await apiFetch<PatientUser>(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ patientProfile: { exames: list } }),
    })
    onSaved(updated)
    return updated
  }

  async function handleSave(data: Partial<Exame>, status: 'draft' | 'completed') {
    if (!user?.id) { setListError('Paciente não carregado.'); return }
    setSaving(true)
    setListError('')
    try {
      const item: Exame = {
        title: 'Registro de exame',
        biomarkers: [],
        ...data,
        id: data.id || crypto.randomUUID(),
        status,
        authorName: data.authorName || 'Nutricionista',
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
      }
      await patchExames(nextList(item))
      setEditorOpen(false)
      if (!selectedIds.includes(item.id)) {
        setSelectedIds((prev) => [...prev, item.id])
      }
    } catch (err: unknown) {
      setListError(
        (err as { data?: { error?: string; message?: string } })?.data?.error ||
        (err as { data?: { message?: string } })?.data?.message ||
        (err as { message?: string })?.message ||
        'Erro ao salvar exame.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(id: string) {
    if (!confirm('Excluir este registro de exame?')) return
    setListError('')
    try {
      await patchExames(nextList(null, id))
      setSelectedIds((prev) => prev.filter((v) => v !== id))
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
          <h2>Exames laboratoriais</h2>
          <p>{exames.length} registro(s) · compare tendências e insights clínicos</p>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            className={`btn-secondary ${s.btn}`}
            disabled={!canCompareSelected}
            onClick={() => setMode('compare')}
          >
            Comparar selecionados
          </button>
          <button type="button" className={`btn-primary ${s.btn}`} onClick={startNew}>
            + Registro de exame
          </button>
        </div>
      </div>

      {listError && <p className={s.error}>{listError}</p>}

      {mode === 'compare' && canCompareSelected && (
        <div style={{ marginBottom: '0.85rem' }}>
          <ExameComparisonPanel exames={exames} selectedIds={selectedIds} />
        </div>
      )}

      {mode === 'compare' && (
        <button
          type="button"
          className={`btn-secondary ${s.btn}`}
          style={{ marginBottom: '0.85rem' }}
          onClick={() => setMode('list')}
        >
          Voltar para registros
        </button>
      )}

      {mode === 'list' && (
        <>
          {exames.length === 0 ? (
            <div className={s.empty}>
              <FlaskConical size={28} className={s.emptyIcon} />
              <h3>Centralize os exames laboratoriais</h3>
              <p>
                Registre biomarcadores com faixas de referência e compare a evolução entre consultas.
              </p>
              <button type="button" className={`btn-primary ${s.btn}`} onClick={startNew}>
                + Registro de exame
              </button>
            </div>
          ) : (
            <div className={s.list}>
              {exames.map((item) => (
                <article
                  key={item.id}
                  className={`${sx.card}${item.status === 'draft' ? ` ${s.cardDraft}` : ''}${selectedIds.includes(item.id) ? ` ${sx.selected}` : ''}`}
                >
                  <label className={sx.checkbox}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id)}
                    />
                    <span className="sr-only">Selecionar para comparação</span>
                  </label>
                  <button type="button" className={s.cardMain} onClick={() => editItem(item)}>
                    <div className={s.cardTop}>
                      <strong className={s.cardTitle}>{item.title}</strong>
                      <span className={`${s.badge} ${badgeClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className={s.cardPreview}>
                      {formatExameDate(item.collectedAt)} · {previewText(item)}
                    </p>
                    <small className={s.cardMeta}>
                      Atualizado {formatDateTime(item.updatedAt || item.createdAt)}
                    </small>
                  </button>
                  <div className={s.cardActions}>
                    <TileMenu onEdit={() => editItem(item)} onDelete={() => removeItem(item.id)} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {exames.length > 0 && selectedIds.length === 1 && (
            <p className={sx.hint}>
              Selecione mais um registro para comparar biomarcadores lado a lado.
            </p>
          )}
        </>
      )}

      <ExameEditorModal
        open={editorOpen}
        seed={editorSeed}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
