'use client'

import { useRef, useState } from 'react'
import { MoreVertical, Scale } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { Antropometria, PatientUser, PatientProfile } from '@/lib/types'
import { FloatField } from '@/components/ui/FloatField'
import s from './PatientWorkspace.module.scss'
import styles from './PatientAntropometriaWorkspace.module.scss'

const ANTROPOMETRIA_LIMIT = 20

function parseNum(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatNum(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

function computeBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  const w = Number(weightKg)
  const h = Number(heightCm)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return w / ((h / 100) ** 2)
}

function bmiLabel(bmi: number | null): string {
  if (bmi == null) return ''
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Peso normal'
  if (bmi < 30) return 'Sobrepeso'
  if (bmi < 35) return 'Obesidade I'
  if (bmi < 40) return 'Obesidade II'
  return 'Obesidade III'
}

function previewText(item: Antropometria, birthDate?: string | null): string {
  const parts: string[] = []
  if (item?.measuredAt) {
    parts.push(new Date(`${item.measuredAt}T12:00:00`).toLocaleDateString('pt-BR'))
  }
  if (item?.weightKg) parts.push(`${formatNum(item.weightKg, 1)} kg`)
  const bmi = computeBmi(item?.weightKg, item?.heightCm)
  if (bmi) {
    const label = bmiLabel(bmi)
    parts.push(`IMC ${formatNum(bmi, 2)}${label ? ` (${label})` : ''}`)
  }
  return parts.length ? parts.join(' · ') : 'Sem medidas registradas.'
}

function statusLabel(status?: string | null): string {
  return status === 'completed' ? 'Concluída' : 'Rascunho'
}

function badgeClass(status?: string | null): string {
  return status === 'completed' ? s.completed : s.draft
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── TileMenu ──────────────────────────────────────────────────────────────────

function TileMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function handleBlur(e: React.FocusEvent) {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
  }

  return (
    <div ref={ref} className={s.menu} onBlur={handleBlur}>
      <button type="button" className={s.menuBtn} aria-label="Ações" onClick={() => setOpen((v) => !v)}>
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className={s.dropdown} role="menu">
          <button type="button" className={s.dropdownItem} role="menuitem" onClick={() => { onEdit(); setOpen(false) }}>
            Editar
          </button>
          <button type="button" className={`${s.dropdownItem} ${s.danger}`} role="menuitem" onClick={() => { onDelete(); setOpen(false) }}>
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

// ── AntropometriaEditor ───────────────────────────────────────────────────────

type EditorProps = {
  seed: Antropometria | null
  user: PatientUser
  profile?: PatientProfile | null
  saving: boolean
  error: string
  onSave: (data: Partial<Antropometria>) => void
  onCancel: () => void
}

function AntropometriaEditor({ seed, user, profile, saving, error, onSave, onCancel }: EditorProps) {
  const [measuredAt, setMeasuredAt] = useState(
    seed?.measuredAt || new Date().toISOString().slice(0, 10),
  )
  const [heightCm, setHeightCm] = useState<string>(seed?.heightCm != null ? String(seed.heightCm) : '')
  const [weightKg, setWeightKg] = useState<string>(seed?.weightKg != null ? String(seed.weightKg) : '')
  const [waist, setWaist] = useState<string>(
    seed?.circumferences?.waist != null ? String(seed.circumferences.waist) : '',
  )
  const [hip, setHip] = useState<string>(
    seed?.circumferences?.hip != null ? String(seed.circumferences.hip) : '',
  )
  const [notes, setNotes] = useState(seed?.notes || '')

  const bmi = computeBmi(parseNum(weightKg), parseNum(heightCm))

  function handleSubmit() {
    const hCm = parseNum(heightCm)
    const wKg = parseNum(weightKg)
    const circumferences: Record<string, number | null> = {
      ...(seed?.circumferences || {}),
      waist: parseNum(waist),
      hip: parseNum(hip),
    }
    onSave({
      ...(seed || {}),
      title: seed?.title || 'Avaliação Antropométrica',
      measuredAt,
      heightCm: hCm,
      weightKg: wKg,
      circumferences,
      notes: notes.trim() || null,
    })
  }

  return (
    <div className={styles.editor}>
      <header className={styles.editorHead}>
        <div>
          <p className={styles.editorKicker}>
            {seed?.id ? 'Editar Avaliação Antropométrica' : 'Nova Avaliação Antropométrica'}
          </p>
          <div className={styles.editorMeta}>
            <span><strong>Paciente:</strong> {user?.name || '—'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Salvando…' : 'Salvar avaliação'}
          </button>
        </div>
      </header>

      {error && <p className={s.error}>{error}</p>}

      <div className={styles.editorGrid}>
        <FloatField
          label="Data de Medição"
          type="date"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
        />
        <FloatField
          label="Altura (cm)"
          type="number"
          min={50}
          max={250}
          step={0.1}
          inputMode="decimal"
          placeholder="cm"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
        />
        <FloatField
          label="Peso atual (kg)"
          type="number"
          min={20}
          max={500}
          step={0.1}
          inputMode="decimal"
          placeholder="kg"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
        />

        {bmi !== null && (
          <div className={styles.bmiCard}>
            <span className={styles.bmiLabel}>IMC calculado</span>
            <strong className={styles.bmiValue}>{formatNum(bmi, 2)}</strong>
            <span className={styles.bmiClass}>{bmiLabel(bmi)}</span>
          </div>
        )}

        <FloatField
          label="Cintura (cm)"
          type="number"
          step={0.1}
          inputMode="decimal"
          value={waist}
          onChange={(e) => setWaist(e.target.value)}
        />
        <FloatField
          label="Quadril (cm)"
          type="number"
          step={0.1}
          inputMode="decimal"
          value={hip}
          onChange={(e) => setHip(e.target.value)}
        />
      </div>

      <div className="field field--float" style={{ marginTop: '0.5rem' }}>
        <label>Observações</label>
        <textarea
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações clínicas adicionais…"
          style={{ resize: 'vertical' }}
        />
      </div>
    </div>
  )
}

// ── PatientAntropometriaWorkspace ─────────────────────────────────────────────

export type PatientAntropometriaWorkspaceProps = {
  user: PatientUser
  profile?: PatientProfile | null
  onSaved: (updated: PatientUser) => void
}

export function PatientAntropometriaWorkspace({
  user,
  profile: profileProp,
  onSaved,
}: PatientAntropometriaWorkspaceProps) {
  const profile = profileProp ?? (user?.patientProfileData as PatientProfile | undefined)
  const [mode, setMode] = useState<'list' | 'editor'>('list')
  const [listError, setListError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorSeed, setEditorSeed] = useState<Antropometria | null>(null)

  const assessments: Antropometria[] = [...(
    Array.isArray(user?.patientProfileData?.antropometrias)
      ? user.patientProfileData!.antropometrias!
      : Array.isArray(profile?.antropometrias)
        ? profile.antropometrias!
        : []
  )].sort((a, b) =>
    String(b.updatedAt || b.measuredAt || '').localeCompare(
      String(a.updatedAt || a.measuredAt || ''),
    ),
  )

  function startNew() {
    if (assessments.length >= ANTROPOMETRIA_LIMIT) {
      setListError(`Limite de ${ANTROPOMETRIA_LIMIT} avaliações por paciente.`)
      return
    }
    setListError('')
    setEditorSeed(null)
    setMode('editor')
  }

  function editItem(item: Antropometria) {
    setListError('')
    setEditorSeed(item)
    setMode('editor')
  }

  function nextList(nextItem: Antropometria | null, removeId = ''): Antropometria[] {
    const source = Array.isArray(user?.patientProfileData?.antropometrias)
      ? user.patientProfileData!.antropometrias!
      : Array.isArray(profile?.antropometrias)
        ? profile.antropometrias!
        : []
    const current = [...source]
    if (removeId) return current.filter((item) => item.id !== removeId)
    if (!nextItem) return current
    const idx = current.findIndex((item) => item.id === nextItem.id)
    if (idx >= 0) { current[idx] = nextItem; return current }
    return [nextItem, ...current].slice(0, ANTROPOMETRIA_LIMIT)
  }

  async function patchAssessments(list: Antropometria[]): Promise<PatientUser> {
    const updated = await apiFetch<PatientUser>(`/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ patientProfile: { antropometrias: list } }),
    })
    onSaved(updated)
    return updated
  }

  async function handleSave(data: Partial<Antropometria>) {
    if (!user?.id) return
    setSaving(true)
    setListError('')
    try {
      const now = new Date().toISOString()
      const existing = assessments.find((item) => item.id === editorSeed?.id)
      const item: Antropometria = {
        ...data,
        id: editorSeed?.id || crypto.randomUUID(),
        title: data.title || 'Avaliação Antropométrica',
        status: 'completed',
        authorName: existing?.authorName || 'Nutricionista',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      }
      await patchAssessments(nextList(item))
      setMode('list')
    } catch (err: unknown) {
      setListError(
        (err as { data?: { error?: string; message?: string } })?.data?.error ||
        (err as { data?: { message?: string } })?.data?.message ||
        (err as { message?: string })?.message ||
        'Erro ao salvar avaliação.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(id: string) {
    if (!confirm('Excluir esta avaliação antropométrica?')) return
    setListError('')
    try {
      await patchAssessments(nextList(null, id))
    } catch (err: unknown) {
      setListError(
        (err as { message?: string })?.message || 'Erro ao excluir avaliação.',
      )
    }
  }

  if (mode === 'editor') {
    return (
      <AntropometriaEditor
        seed={editorSeed}
        user={user}
        profile={profile || ({} as PatientProfile)}
        saving={saving}
        error={listError}
        onSave={handleSave}
        onCancel={() => { setMode('list'); setListError('') }}
      />
    )
  }

  return (
    <div className={s.pawork}>
      <div className={s.head}>
        <div>
          <h2>Avaliações Antropométricas</h2>
          <p>{assessments.length} registro(s)</p>
        </div>
        <div className={s.actions}>
          <button type="button" className={`btn-primary ${s.btn}`} onClick={startNew}>
            + Nova avaliação
          </button>
        </div>
      </div>

      {listError && <p className={s.error}>{listError}</p>}

      {assessments.length === 0 ? (
        <div className={s.empty}>
          <Scale size={28} className={s.emptyIcon} />
          <h3>Registre a primeira avaliação antropométrica</h3>
          <p>
            Adicione as medidas do paciente para acompanhar o progresso físico, calcular a
            composição corporal e personalizar as metas.
          </p>
          <button type="button" className={`btn-primary ${s.btn}`} onClick={startNew}>
            + Nova avaliação
          </button>
        </div>
      ) : (
        <div className={s.list}>
          {assessments.map((item) => (
            <article
              key={item.id}
              className={`${s.card}${item.status !== 'completed' ? ` ${s.cardDraft}` : ''}`}
            >
              <button type="button" className={s.cardMain} onClick={() => editItem(item)}>
                <div className={s.cardTop}>
                  <strong className={s.cardTitle}>{item.title || 'Avaliação Antropométrica'}</strong>
                  <span className={`${s.badge} ${badgeClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className={s.cardPreview}>{previewText(item, profile?.birthDate)}</p>
                <small className={s.cardMeta}>
                  Atualizada {formatDate(item.updatedAt || item.createdAt)}
                </small>
              </button>
              <div className={s.cardActions}>
                <TileMenu onEdit={() => editItem(item)} onDelete={() => removeItem(item.id)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
