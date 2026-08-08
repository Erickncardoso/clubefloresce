'use client'

import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { Exame, BiomarkerRow } from '@/lib/types'
import { FloatField } from '@/components/ui/FloatField'
import s from './ExameEditorModal.module.scss'

// ── Biomarker catalog (subset) ────────────────────────────────────────────────

const BIOMARKER_CATEGORIES = [
  { id: 'glycemic', label: 'Metabolismo glicêmico' },
  { id: 'lipid', label: 'Perfil lipídico' },
  { id: 'thyroid', label: 'Tireoide' },
  { id: 'hematology', label: 'Hematologia e ferro' },
  { id: 'renal', label: 'Função renal' },
  { id: 'hepatic', label: 'Função hepática' },
  { id: 'vitamins', label: 'Vitaminas e minerais' },
  { id: 'inflammation', label: 'Inflamação' },
]

const BIOMARKER_CATALOG = [
  { id: 'glucose_fasting', name: 'Glicemia de jejum', unit: 'mg/dL', category: 'glycemic', defaultRefMin: 70, defaultRefMax: 99 },
  { id: 'hba1c', name: 'HbA1c', unit: '%', category: 'glycemic', defaultRefMin: 4, defaultRefMax: 5.6 },
  { id: 'insulin_fasting', name: 'Insulina de jejum', unit: 'µUI/mL', category: 'glycemic', defaultRefMin: 2, defaultRefMax: 12 },
  { id: 'total_cholesterol', name: 'Colesterol total', unit: 'mg/dL', category: 'lipid', defaultRefMin: null, defaultRefMax: 190 },
  { id: 'hdl', name: 'HDL-colesterol', unit: 'mg/dL', category: 'lipid', defaultRefMin: 40, defaultRefMax: null },
  { id: 'ldl', name: 'LDL-colesterol', unit: 'mg/dL', category: 'lipid', defaultRefMin: null, defaultRefMax: 130 },
  { id: 'triglycerides', name: 'Triglicerídeos', unit: 'mg/dL', category: 'lipid', defaultRefMin: null, defaultRefMax: 150 },
  { id: 'tsh', name: 'TSH', unit: 'µUI/mL', category: 'thyroid', defaultRefMin: 0.4, defaultRefMax: 4.0 },
  { id: 'free_t4', name: 'T4 livre', unit: 'ng/dL', category: 'thyroid', defaultRefMin: 0.8, defaultRefMax: 1.8 },
  { id: 'hemoglobin', name: 'Hemoglobina', unit: 'g/dL', category: 'hematology', defaultRefMin: 12, defaultRefMax: 16 },
  { id: 'ferritin', name: 'Ferritina', unit: 'ng/mL', category: 'hematology', defaultRefMin: 15, defaultRefMax: 150 },
  { id: 'vitamin_b12', name: 'Vitamina B12', unit: 'pg/mL', category: 'hematology', defaultRefMin: 200, defaultRefMax: 900 },
  { id: 'creatinine', name: 'Creatinina', unit: 'mg/dL', category: 'renal', defaultRefMin: 0.6, defaultRefMax: 1.2 },
  { id: 'urea', name: 'Ureia', unit: 'mg/dL', category: 'renal', defaultRefMin: 15, defaultRefMax: 45 },
  { id: 'alt', name: 'ALT (TGP)', unit: 'U/L', category: 'hepatic', defaultRefMin: null, defaultRefMax: 40 },
  { id: 'ast', name: 'AST (TGO)', unit: 'U/L', category: 'hepatic', defaultRefMin: null, defaultRefMax: 40 },
  { id: 'vitamin_d', name: 'Vitamina D (25-OH)', unit: 'ng/mL', category: 'vitamins', defaultRefMin: 30, defaultRefMax: 100 },
  { id: 'magnesium', name: 'Magnésio', unit: 'mg/dL', category: 'vitamins', defaultRefMin: 1.7, defaultRefMax: 2.4 },
  { id: 'zinc', name: 'Zinco', unit: 'µg/dL', category: 'vitamins', defaultRefMin: 70, defaultRefMax: 120 },
  { id: 'crp_us', name: 'PCR-us', unit: 'mg/L', category: 'inflammation', defaultRefMin: null, defaultRefMax: 3 },
]

function findCatalog(id: string) {
  return BIOMARKER_CATALOG.find((b) => b.id === id) || null
}

type DraftRow = {
  id: string
  markerId: string
  name: string
  value: string
  unit: string
  refMin: string
  refMax: string
}

function createRow(markerId = ''): DraftRow {
  const c = markerId ? findCatalog(markerId) : null
  return {
    id: crypto.randomUUID(),
    markerId: c?.id || '',
    name: c?.name || '',
    value: '',
    unit: c?.unit || '',
    refMin: c?.defaultRefMin != null ? String(c.defaultRefMin) : '',
    refMax: c?.defaultRefMax != null ? String(c.defaultRefMax) : '',
  }
}

function rowFromExisting(row: BiomarkerRow): DraftRow {
  return {
    id: row.id || crypto.randomUUID(),
    markerId: row.markerId || '',
    name: row.name || '',
    value: row.value != null ? String(row.value) : '',
    unit: row.unit || '',
    refMin: row.refMin != null ? String(row.refMin) : '',
    refMax: row.refMax != null ? String(row.refMax) : '',
  }
}

// ── ExameEditorModal ──────────────────────────────────────────────────────────

type Props = {
  open: boolean
  seed: Exame | null
  saving: boolean
  onClose: () => void
  onSave: (data: Partial<Exame>, status: 'draft' | 'completed') => void
}

export function ExameEditorModal({ open, seed, saving, onClose, onSave }: Props) {
  const isNew = !seed?.id
  const [title, setTitle] = useState(seed?.title || 'Registro de exame')
  const [collectedAt, setCollectedAt] = useState(
    seed?.collectedAt || new Date().toISOString().slice(0, 10),
  )
  const [labName, setLabName] = useState(seed?.labName || '')
  const [notes, setNotes] = useState(seed?.notes || '')
  const [biomarkers, setBiomarkers] = useState<DraftRow[]>(
    seed?.biomarkers?.length ? seed.biomarkers.map(rowFromExisting) : [],
  )
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(seed?.title || 'Registro de exame')
      setCollectedAt(seed?.collectedAt || new Date().toISOString().slice(0, 10))
      setLabName(seed?.labName || '')
      setNotes(seed?.notes || '')
      setBiomarkers(seed?.biomarkers?.length ? seed.biomarkers.map(rowFromExisting) : [])
      setError('')
    }
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, seed?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function addRow() {
    setBiomarkers((rows) => [...rows, createRow()])
  }

  function removeRow(index: number) {
    setBiomarkers((rows) => rows.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setBiomarkers((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function onMarkerChange(index: number, markerId: string) {
    const c = findCatalog(markerId)
    setBiomarkers((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              markerId: c?.id || '',
              name: c?.name || row.name,
              unit: c?.unit || row.unit,
              refMin: c?.defaultRefMin != null ? String(c.defaultRefMin) : row.refMin,
              refMax: c?.defaultRefMax != null ? String(c.defaultRefMax) : row.refMax,
            }
          : row,
      ),
    )
  }

  function buildPayload(): Partial<Exame> {
    const now = new Date().toISOString()
    return {
      id: seed?.id || crypto.randomUUID(),
      title: title.trim() || 'Registro de exame',
      collectedAt: collectedAt || now.slice(0, 10),
      labName: labName.trim() || null,
      notes: notes.trim() || null,
      authorName: seed?.authorName || 'Nutricionista',
      createdAt: seed?.createdAt || now,
      updatedAt: now,
      biomarkers: biomarkers
        .map((row) => {
          const value = Number(row.value)
          if (!row.name.trim() || !Number.isFinite(value)) return null
          return {
            id: row.id,
            markerId: row.markerId || undefined,
            name: row.name.trim(),
            value,
            unit: row.unit.trim() || '—',
            refMin: row.refMin !== '' ? Number(row.refMin) : null,
            refMax: row.refMax !== '' ? Number(row.refMax) : null,
            category: findCatalog(row.markerId)?.category || 'other',
          } as BiomarkerRow
        })
        .filter((r): r is BiomarkerRow => r !== null),
    }
  }

  function handleSubmit(status: 'draft' | 'completed') {
    setError('')
    try {
      onSave(buildPayload(), status)
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Erro ao salvar.')
    }
  }

  if (!open) return null

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pex-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`admin-shell-card ${s.modal}`} onClick={(e) => e.stopPropagation()}>
        <header className={s.head}>
          <h2 id="pex-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            {isNew ? 'Registro de exame' : 'Editar registro de exame'}
          </h2>
          <button type="button" className={s.closeBtn} aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className={s.body}>
          <div className={s.topGrid}>
            <FloatField label="Título" type="text" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            <FloatField label="Data da coleta" type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} />
            <FloatField label="Laboratório" type="text" maxLength={120} placeholder="Opcional" value={labName} onChange={(e) => setLabName(e.target.value)} />
          </div>

          <div className={s.biomarkers}>
            <div className={s.biomarkersHead}>
              <strong>Biomarcadores</strong>
              <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem', minHeight: '2rem', padding: '0.3rem 0.7rem' }} onClick={addRow}>
                + Adicionar
              </button>
            </div>

            {biomarkers.length === 0 && (
              <p className={s.emptyRows}>Adicione biomarcadores manualmente ou pelo catálogo.</p>
            )}

            {biomarkers.map((row, index) => (
              <div key={row.id} className={s.row}>
                <div className={`field field--float ${s.rowField}`}>
                  <label htmlFor={`pex-marker-${row.id}`}>Biomarcador</label>
                  <select
                    id={`pex-marker-${row.id}`}
                    value={row.markerId}
                    onChange={(e) => onMarkerChange(index, e.target.value)}
                  >
                    <option value="">Personalizado</option>
                    {BIOMARKER_CATEGORIES.map((cat) => (
                      <optgroup key={cat.id} label={cat.label}>
                        {BIOMARKER_CATALOG.filter((b) => b.category === cat.id).map((b) => (
                          <option key={b.id} value={b.id}>{b.name} ({b.unit})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className={`field field--float ${s.rowField}`}>
                  <label htmlFor={`pex-name-${row.id}`}>Nome</label>
                  <input id={`pex-name-${row.id}`} type="text" maxLength={120} value={row.name} onChange={(e) => updateRow(index, { name: e.target.value })} />
                </div>
                <div className={`field field--float ${s.rowField} ${s.rowFieldValue}`}>
                  <label htmlFor={`pex-value-${row.id}`}>Valor</label>
                  <input id={`pex-value-${row.id}`} type="number" step="any" inputMode="decimal" value={row.value} onChange={(e) => updateRow(index, { value: e.target.value })} />
                </div>
                <div className={`field field--float ${s.rowField} ${s.rowFieldUnit}`}>
                  <label htmlFor={`pex-unit-${row.id}`}>Unidade</label>
                  <input id={`pex-unit-${row.id}`} type="text" maxLength={24} value={row.unit} onChange={(e) => updateRow(index, { unit: e.target.value })} />
                </div>
                <div className={`field field--float ${s.rowField} ${s.rowFieldRef}`}>
                  <label htmlFor={`pex-refmin-${row.id}`}>Ref. mín</label>
                  <input id={`pex-refmin-${row.id}`} type="number" step="any" inputMode="decimal" value={row.refMin} onChange={(e) => updateRow(index, { refMin: e.target.value })} />
                </div>
                <div className={`field field--float ${s.rowField} ${s.rowFieldRef}`}>
                  <label htmlFor={`pex-refmax-${row.id}`}>Ref. máx</label>
                  <input id={`pex-refmax-${row.id}`} type="number" step="any" inputMode="decimal" value={row.refMax} onChange={(e) => updateRow(index, { refMax: e.target.value })} />
                </div>
                <button type="button" className={s.removeRow} aria-label="Remover biomarcador" onClick={() => removeRow(index)}>
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            ))}
          </div>

          <FloatField as="textarea" label="Observações clínicas" rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && <p className={s.error}>{error}</p>}
        </div>

        <footer className={s.foot}>
          <button type="button" className="btn-secondary" style={{ fontSize: '0.82rem', minHeight: '2.1rem' }} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-secondary" style={{ fontSize: '0.82rem', minHeight: '2.1rem' }} disabled={saving} onClick={() => handleSubmit('draft')}>
            Salvar rascunho
          </button>
          <button type="button" className="btn-primary" style={{ fontSize: '0.82rem', minHeight: '2.1rem' }} disabled={saving} onClick={() => handleSubmit('completed')}>
            {saving ? 'Salvando…' : 'Salvar registro'}
          </button>
        </footer>
      </div>
    </div>
  )
}
