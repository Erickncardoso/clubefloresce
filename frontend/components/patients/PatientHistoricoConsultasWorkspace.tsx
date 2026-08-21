'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { PatientUser } from '@/lib/types'
import { PatientChartEmptyState } from '@/components/patients/PatientChartEmptyState'
import { TileActionsMenu } from '@/components/courses/TileActionsMenu'
import s from './PatientWorkspace.module.scss'

export type PatientConsultation = {
  id: string
  date: string
  notes?: string | null
  createPlannerTask?: boolean
  createdAt?: string
}

type Props = {
  user: PatientUser
  onSaved: (updated: PatientUser) => void
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const raw = String(value)
  const day = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (day) {
    return new Date(`${day[1]}-${day[2]}-${day[3]}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function readConsultations(user: PatientUser): PatientConsultation[] {
  const raw = user?.patientProfileData?.consultations
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item as PatientConsultation
      if (!row || typeof row !== 'object') return null
      if (!row.id || !row.date) return null
      return {
        id: String(row.id),
        date: String(row.date),
        notes: row.notes ?? null,
        createPlannerTask: Boolean(row.createPlannerTask),
        createdAt: row.createdAt ? String(row.createdAt) : undefined,
      }
    })
    .filter(Boolean) as PatientConsultation[]
}

export function PatientHistoricoConsultasWorkspace({ user, onSaved }: Props) {
  const [listError, setListError] = useState('')
  const [saving, setSaving] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [draftNotes, setDraftNotes] = useState('')

  const consultations = useMemo(() => {
    return [...readConsultations(user)].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')),
    )
  }, [user])

  async function persist(next: PatientConsultation[]) {
    setSaving(true)
    setListError('')
    try {
      const updated = await apiFetch<PatientUser>(`/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          patientProfile: { consultations: next },
        }),
      })
      onSaved(updated)
      setComposerOpen(false)
      setDraftNotes('')
      setDraftDate(new Date().toISOString().slice(0, 10))
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Não foi possível salvar o histórico.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!draftDate) {
      setListError('Informe a data da consulta.')
      return
    }
    const item: PatientConsultation = {
      id: crypto.randomUUID(),
      date: draftDate,
      notes: draftNotes.trim() || null,
      createPlannerTask: false,
      createdAt: new Date().toISOString(),
    }
    await persist([item, ...readConsultations(user)])
  }

  async function handleDelete(id: string) {
    const ok = window.confirm('Excluir este registro do histórico de consultas?')
    if (!ok) return
    await persist(readConsultations(user).filter((item) => item.id !== id))
  }

  return (
    <div className={s.pawork}>
      <div className={s.head}>
        <div>
          <h2>Histórico de consultas</h2>
          <p>
            {consultations.length
              ? `${consultations.length} registro${consultations.length === 1 ? '' : 's'} · mais recentes primeiro`
              : 'Consultas e retornos desta paciente'}
          </p>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            className={`btn-primary ${s.btn}`}
            onClick={() => {
              setListError('')
              setComposerOpen((v) => !v)
            }}
          >
            <Plus size={15} aria-hidden />
            Nova consulta
          </button>
        </div>
      </div>

      {listError ? <p className={s.error}>{listError}</p> : null}

      {composerOpen ? (
        <div className={s.card} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.82rem', color: '#5f675c' }}>
            Data
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              style={{
                minHeight: '2.4rem',
                padding: '0.4rem 0.65rem',
                border: '1px solid #e8ece9',
                borderRadius: 'var(--cf-radius-control)',
                font: 'inherit',
              }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.82rem', color: '#5f675c' }}>
            Observação
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              rows={3}
              placeholder="Ex.: retorno, online, observações clínicas…"
              style={{
                padding: '0.55rem 0.65rem',
                border: '1px solid #e8ece9',
                borderRadius: 'var(--cf-radius-control)',
                font: 'inherit',
                resize: 'vertical',
              }}
            />
          </label>
          <div className={s.actions}>
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setComposerOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void handleAdd()}>
              {saving ? 'Salvando…' : 'Salvar consulta'}
            </button>
          </div>
        </div>
      ) : null}

      {!consultations.length ? (
        <PatientChartEmptyState
          icon={CalendarClock}
          title="Nenhuma consulta registrada"
          description="Os agendamentos importados do WebDiet e os novos registros aparecem aqui."
          actionLabel="+ Registrar consulta"
          onAction={() => setComposerOpen(true)}
        />
      ) : (
        <div className={s.list}>
          {consultations.map((item) => (
            <article key={item.id} className={s.card}>
              <div className={s.cardMain} style={{ cursor: 'default' }}>
                <strong className={s.cardTitle}>{formatDate(item.date)}</strong>
                <p className={s.cardMeta}>{item.notes?.trim() || 'Sem observação'}</p>
              </div>
              <TileActionsMenu menuKey={`consulta-${item.id}`}>
                <button
                  type="button"
                  className="cf-tile-actions-item cf-tile-actions-item--danger"
                  onClick={() => void handleDelete(item.id)}
                >
                  Excluir
                </button>
              </TileActionsMenu>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
