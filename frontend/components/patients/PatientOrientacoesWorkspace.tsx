'use client'

import { useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { Orientacao, PatientUser, PatientProfile } from '@/lib/types'
import { PatientChartEmptyState } from '@/components/patients/PatientChartEmptyState'
import { TileActionsMenu } from '@/components/courses/TileActionsMenu'
import { OrientacaoEditorModal } from './OrientacaoEditorModal'
import s from './PatientWorkspace.module.scss'

const ORIENTACAO_LIMIT = 5

function htmlToPlain(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function previewText(item: Orientacao): string {
  const value = htmlToPlain(item?.content || '')
  if (!value) return 'Sem conteúdo ainda.'
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

function statusLabel(status?: string | null): string {
  if (status === 'published') return 'Publicada'
  return 'Rascunho'
}

function badgeClass(status?: string | null): string {
  if (status === 'published') return s.published
  return s.draft
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export type PatientOrientacoesWorkspaceProps = {
  user: PatientUser
  profile?: PatientProfile | null
  onSaved: (updated: PatientUser) => void
}

export function PatientOrientacoesWorkspace({
  user,
  profile: profileProp,
  onSaved,
}: PatientOrientacoesWorkspaceProps) {
  const profile = profileProp ?? (user?.patientProfileData as PatientProfile | undefined)
  const [listError, setListError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSeed, setEditorSeed] = useState<Orientacao | null>(null)

  const orientacoes: Orientacao[] = [...(
    Array.isArray(user?.patientProfileData?.orientacoes)
      ? user.patientProfileData!.orientacoes!
      : Array.isArray(profile?.orientacoes)
        ? profile.orientacoes!
        : []
  )].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )

  function startNew() {
    if (orientacoes.length >= ORIENTACAO_LIMIT) {
      setListError(`Limite de ${ORIENTACAO_LIMIT} orientações por paciente.`)
      return
    }
    setListError('')
    setEditorSeed(null)
    setEditorOpen(true)
  }

  function editItem(item: Orientacao) {
    setListError('')
    setEditorSeed(item)
    setEditorOpen(true)
  }

  function nextList(nextItem: Orientacao | null, removeId = ''): Orientacao[] {
    const source = Array.isArray(user?.patientProfileData?.orientacoes)
      ? user.patientProfileData!.orientacoes!
      : Array.isArray(profile?.orientacoes)
        ? profile.orientacoes!
        : []
    const current = [...source]
    if (removeId) return current.filter((item) => item.id !== removeId)
    if (!nextItem) return current
    const idx = current.findIndex((item) => item.id === nextItem.id)
    if (idx >= 0) {
      current[idx] = nextItem
      return current
    }
    return [nextItem, ...current].slice(0, ORIENTACAO_LIMIT)
  }

  async function patchOrientacoes(list: Orientacao[]): Promise<PatientUser> {
    const updated = await apiFetch<PatientUser>(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ patientProfile: { orientacoes: list } }),
    })
    onSaved(updated)
    return updated
  }

  async function handleSave(item: Orientacao) {
    await patchOrientacoes(nextList(item))
    setEditorSeed(item)
  }

  async function removeItem(id: string) {
    if (!confirm('Excluir esta orientação?')) return
    setListError('')
    try {
      await patchOrientacoes(nextList(null, id))
    } catch (err: unknown) {
      setListError(
        (err as { data?: { message?: string } })?.data?.message ||
          (err as { message?: string })?.message ||
          'Erro ao excluir orientação.',
      )
    }
  }

  return (
    <div className={s.pawork}>
      <div className={s.head}>
        <div>
          <h2>Orientações</h2>
          <p>
            {orientacoes.length} registro(s) · limite {ORIENTACAO_LIMIT} por paciente
          </p>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            className={`btn-primary ${s.btn}`}
            disabled={orientacoes.length >= ORIENTACAO_LIMIT}
            onClick={startNew}
          >
            + Nova orientação
          </button>
        </div>
      </div>

      {listError ? <p className={s.error}>{listError}</p> : null}

      {orientacoes.length === 0 ? (
        <div className={s.empty}>
          <PatientChartEmptyState
            icon={NotebookPen}
            title="Crie orientações para seu paciente"
            description="Registre recomendações, orientações e pontos importantes para acompanhar a jornada do paciente."
            actionLabel="+ Nova orientação"
            counter={`${orientacoes.length}/${ORIENTACAO_LIMIT}`}
            onAction={startNew}
          />
        </div>
      ) : (
        <div className={s.list}>
          {orientacoes.map((item) => (
            <article
              key={item.id}
              className={`${s.card}${item.status !== 'published' ? ` ${s.cardDraft}` : ''}`}
            >
              <button type="button" className={s.cardMain} onClick={() => editItem(item)}>
                <div className={s.cardTop}>
                  <strong className={s.cardTitle}>{item.title || 'Orientação'}</strong>
                  <span className={`${s.badge} ${badgeClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className={s.cardPreview}>{previewText(item)}</p>
                <small className={s.cardMeta}>
                  Atualizada {formatDate(item.updatedAt || item.createdAt)}
                </small>
              </button>
              <div className={s.cardActions} onClick={(e) => e.stopPropagation()}>
                <TileActionsMenu menuKey={`orientacao-${item.id}`}>
                  <button
                    type="button"
                    className="cf-tile-actions-item"
                    role="menuitem"
                    onClick={() => editItem(item)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="cf-tile-actions-item cf-tile-actions-item--danger"
                    role="menuitem"
                    onClick={() => void removeItem(item.id)}
                  >
                    Excluir
                  </button>
                </TileActionsMenu>
              </div>
            </article>
          ))}
        </div>
      )}

      <OrientacaoEditorModal
        open={editorOpen}
        orientacao={editorSeed}
        user={user}
        profile={profile || ({} as PatientProfile)}
        orientacoes={orientacoes}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
