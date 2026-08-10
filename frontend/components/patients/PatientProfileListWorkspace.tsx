'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { MoreVertical, Plus, type LucideIcon } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { PatientUser } from '@/lib/types'
import { AnimatedDialog, AnimatedPopover } from '@/components/overlays'
import { PatientChartEmptyState } from '@/components/patients/PatientChartEmptyState'
import { FloatField } from '@/components/ui/FloatField'
import s from './PatientWorkspace.module.scss'

type ItemBase = {
  id: string
  title?: string | null
  content?: string | null
  status?: string | null
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

type Props = {
  user: PatientUser
  profileKey: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  createLabel: string
  limit?: number
  onSaved?: (user: PatientUser) => void
  renderPreview?: (item: ItemBase) => ReactNode
  titleFieldLabel?: string
  contentFieldLabel?: string
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PatientProfileListWorkspace({
  user,
  profileKey,
  icon: Icon,
  emptyTitle,
  emptyDescription,
  createLabel,
  limit = 50,
  onSaved,
  renderPreview,
  titleFieldLabel = 'Título',
  contentFieldLabel = 'Conteúdo',
}: Props) {
  const items = useMemo(() => {
    const profile = (user.patientProfileData || {}) as Record<string, unknown>
    const list = profile[profileKey]
    return Array.isArray(list) ? ([...list] as ItemBase[]) : []
  }, [user, profileKey])

  const [editing, setEditing] = useState<ItemBase | null | 'new'>(null)
  const [menuId, setMenuId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  function openCreate() {
    if (items.length >= limit) {
      setError(`Limite de ${limit} itens atingido.`)
      return
    }
    setTitle('')
    setContent('')
    setError('')
    setEditing('new')
  }

  function openEdit(item: ItemBase) {
    setTitle(String(item.title || ''))
    setContent(String(item.content || ''))
    setError('')
    setEditing(item)
  }

  async function persist(nextList: ItemBase[]) {
    setSaving(true)
    setError('')
    try {
      const updated = await apiFetch<PatientUser>(`/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ patientProfile: { [profileKey]: nextList } }),
      })
      onSaved?.(updated)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function saveItem() {
    const now = new Date().toISOString()
    const base: ItemBase =
      editing && editing !== 'new'
        ? {
            ...editing,
            title: title.trim() || 'Sem título',
            content,
            updatedAt: now,
          }
        : {
            id: crypto.randomUUID(),
            title: title.trim() || 'Sem título',
            content,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
          }

    const next =
      editing && editing !== 'new'
        ? items.map((item) => (item.id === base.id ? base : item))
        : [base, ...items]
    await persist(next)
  }

  async function removeItem(id: string) {
    if (!window.confirm('Excluir este item?')) return
    await persist(items.filter((item) => item.id !== id))
  }

  const modalTitle = editing === 'new' ? createLabel : 'Editar'

  return (
    <div className={s.workspace}>
      <header className={s.head}>
        <div className={s.meta}>
          <strong>{items.length}</strong> item{items.length === 1 ? '' : 's'}
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus size={16} aria-hidden />
          {createLabel}
        </button>
      </header>

      {error ? <p className={s.error}>{error}</p> : null}

      {!items.length ? (
        <PatientChartEmptyState
          icon={Icon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={createLabel}
          onAction={openCreate}
        />
      ) : (
        <div className={s.grid}>
          {items.map((item) => (
            <article key={item.id} className={s.card}>
              <header className={s.cardHead}>
                <div>
                  <h3>{item.title || 'Sem título'}</h3>
                  <p>{formatDate(item.updatedAt || item.createdAt)}</p>
                </div>
                <div className={s.menu}>
                  <AnimatedPopover
                    open={menuId === item.id}
                    onOpenChange={(o) => setMenuId(o ? item.id : '')}
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
                      onClick={() => {
                        openEdit(item)
                        setMenuId('')
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`${s.dropdownItem} ${s.danger}`}
                      onClick={() => {
                        void removeItem(item.id)
                        setMenuId('')
                      }}
                    >
                      Excluir
                    </button>
                  </AnimatedPopover>
                </div>
              </header>
              <div className={s.cardBody}>
                {renderPreview ? (
                  renderPreview(item)
                ) : (
                  <p>{String(item.content || 'Sem conteúdo.').slice(0, 160)}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <AnimatedDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={modalTitle}
        contentClassName={s.modal}
      >
        {editing ? (
          <>
            <header className={s.modalHead}>
              <h2>{modalTitle}</h2>
              <button type="button" aria-label="Fechar" onClick={() => setEditing(null)}>
                ×
              </button>
            </header>
            <div className={s.modalBody}>
              <FloatField
                label={titleFieldLabel}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <FloatField
                as="textarea"
                label={contentFieldLabel}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
              />
              {error ? <p className={s.error}>{error}</p> : null}
            </div>
            <footer className={s.modalFoot}>
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void saveItem()}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </footer>
          </>
        ) : null}
      </AnimatedDialog>
    </div>
  )
}
