'use client'

import { useEffect, useRef, useState } from 'react'
import { Printer, Sparkles, X } from 'lucide-react'
import type { Orientacao, PatientUser, PatientProfile } from '@/lib/types'
import { getCachedUser } from '@/lib/auth'
import { PatientAnamneseRichEditor, type RichEditorHandle } from './PatientAnamneseRichEditor'
import { PatientOrientacaoPreview } from './PatientOrientacaoPreview'
import s from './OrientacaoEditorModal.module.scss'

// ── Templates (mirrors orientacao-templates.js) ───────────────────────────────

const ORIENTACAO_TEMPLATES = [
  {
    id: 'blank',
    label: 'Em branco',
    title: 'Nova Orientação',
    content: '',
  },
  {
    id: 'anemia-ferropriva',
    label: 'Anemia Ferropriva',
    title: 'Orientação para Paciente com Anemia Ferropriva',
    content: [
      '<p><strong>Objetivo</strong></p>',
      '<p>Corrigir a deficiência de ferro com alimentação adequada e hábitos que favoreçam a absorção.</p>',
      '<p><br></p>',
      '<p><strong>O que comer</strong></p>',
      '<ul>',
      '<li>Carnes magras (boi, frango, peixe) e vísceras (fígado) 3–4x/semana</li>',
      '<li>Feijão, lentilha, grão-de-bico e ervilha com arroz ou farinha de mandioca</li>',
      '<li>Vegetais verde-escuros: couve, espinafre, brócolis</li>',
      '<li>Combine ferro de origem vegetal com vitamina C (laranja, limão, acerola)</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>O que NÃO comer / evitar</strong></p>',
      '<ul>',
      '<li>Chá preto, mate e café junto das refeições principais</li>',
      '<li>Excesso de leite e derivados nas refeições ricas em ferro</li>',
      '<li>Alimentos ultraprocessados em excesso</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>Hidratação</strong></p>',
      '<p>Manter boa ingestão de água ao longo do dia.</p>',
      '<p><br></p>',
      '<p><strong>Horários e refeições</strong></p>',
      '<p>Priorize refeições regulares a cada 3–4 horas.</p>',
      '<p><br></p>',
      '<p><strong>Dicas extras</strong></p>',
      '<p>Utilize frigideira de ferro quando possível e siga a suplementação prescrita, se houver.</p>',
    ].join(''),
  },
  {
    id: 'refluxo',
    label: 'Refluxo / Dispepsia',
    title: 'Orientação para Refluxo Gastroesofágico',
    content: [
      '<p><strong>Objetivo</strong></p>',
      '<p>Reduzir sintomas de queimação, empachamento e desconforto digestivo.</p>',
      '<p><br></p>',
      '<p><strong>O que comer</strong></p>',
      '<ul>',
      '<li>Refeições menores e mais frequentes</li>',
      '<li>Carnes magras, peixes, ovos, legumes cozidos e frutas não ácidas</li>',
      '<li>Grãos integrais em porções moderadas</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>O que evitar</strong></p>',
      '<ul>',
      '<li>Frituras, embutidos, molhos cremosos e alimentos muito condimentados</li>',
      '<li>Refrigerantes, café, chocolate e bebidas alcoólicas</li>',
      '<li>Deitar logo após comer</li>',
      '</ul>',
      '<p><br></p>',
      '<p><strong>Dicas extras</strong></p>',
      '<p>Eleve a cabeceira da cama e evite jantar muito tarde.</p>',
    ].join(''),
  },
]

const ORIENTACAO_PREVIEW_MODELS = [{ id: 'florescer', label: 'Modelo Clube Florescer' }]

function findTemplate(id: string) {
  return ORIENTACAO_TEMPLATES.find((t) => t.id === id) || ORIENTACAO_TEMPLATES[0]
}

function htmlToPlain(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  orientacao: Orientacao | null
  user: PatientUser
  profile: PatientProfile
  orientacoes: Orientacao[]
  onClose: () => void
  onSave: (item: Orientacao) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrientacaoEditorModal({
  open,
  orientacao,
  user,
  profile,
  orientacoes,
  onClose,
  onSave,
}: Props) {
  const [editingId, setEditingId] = useState(orientacao?.id || '')
  const isNew = !editingId

  const [title, setTitle] = useState(orientacao?.title || 'Nova Orientação')
  const [content, setContent] = useState(orientacao?.content || '')
  const [templateId, setTemplateId] = useState(orientacao?.templateId || 'blank')
  const [previewModelId, setPreviewModelId] = useState(
    orientacao?.previewModelId || 'florescer',
  )
  const [blankMode, setBlankMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [skipTemplateApply, setSkipTemplateApply] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<RichEditorHandle>(null)
  const previewRef = useRef<HTMLElement>(null)

  const patientName = user?.name || '—'
  const patientCpf = formatCpf(String(profile?.cpf || ''))
  const authorName = getCachedUser()?.name?.trim() || orientacao?.authorName || 'Nutricionista'
  const canSave = Boolean(String(title || '').trim() || htmlToPlain(content))

  // ── Open / seed effect ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'

    setError('')
    setSuccess('')
    setBlankMode(false)
    setSkipTemplateApply(true)

    if (!orientacao?.id) {
      setEditingId('')
      setTitle('Nova Orientação')
      setContent('')
      setTemplateId('blank')
      setPreviewModelId('florescer')
      setTimeout(() => {
        editorRef.current?.setHtml('')
        titleRef.current?.focus()
      }, 50)
    } else {
      setEditingId(orientacao.id)
      setTitle(orientacao.title || 'Orientação')
      setContent(orientacao.content || '')
      setTemplateId(orientacao.templateId || 'blank')
      setPreviewModelId(orientacao.previewModelId || 'florescer')
      setTimeout(() => {
        editorRef.current?.setHtml(orientacao.content || '')
        titleRef.current?.focus()
      }, 50)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open, orientacao?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape key ────────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // ── blankMode watcher ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!blankMode) return
    applyTemplate('blank', true)
  }, [blankMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Template helpers ───────────────────────────────────────────────────────

  function applyTemplate(id: string, force = false) {
    const tmpl = findTemplate(id)
    setTemplateId(tmpl.id)
    if (!force && htmlToPlain(content)) return
    setTitle(tmpl.title)
    setContent(tmpl.content)
    editorRef.current?.setHtml(tmpl.content)
  }

  function onTemplateChange(id: string) {
    if (skipTemplateApply) {
      setSkipTemplateApply(false)
      return
    }
    if (
      htmlToPlain(content) &&
      !confirm('Substituir o conteúdo atual pelo modelo selecionado?')
    ) {
      setSkipTemplateApply(true)
      setTemplateId(orientacao?.templateId || 'blank')
      return
    }
    applyTemplate(id, true)
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!canSave || !user?.id) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const now = new Date().toISOString()
      const id = editingId || crypto.randomUUID()
      const existing = orientacoes.find((o) => o.id === id)
      const item: Orientacao = {
        id,
        title: String(title || '').trim() || 'Orientação',
        content,
        templateId,
        previewModelId,
        status: 'published',
        authorName,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      }
      await onSave(item)
      setEditingId(item.id)
      setSuccess('Orientação salva com sucesso.')
    } catch (err: unknown) {
      setError(
        (err as { data?: { error?: string; message?: string } })?.data?.error ||
          (err as { data?: { message?: string } })?.data?.message ||
          (err as { message?: string })?.message ||
          'Erro ao salvar orientação.',
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Print ──────────────────────────────────────────────────────────────────

  function printPreview() {
    const el = previewRef.current
    if (!el) return
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title || 'Orientação'}</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#fff}@page{size:A4;margin:16mm}</style></head><body>${el.outerHTML}</body></html>`,
    )
    w.document.close()
    w.focus()
    w.print()
  }

  if (!open) return null

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Nova orientação' : 'Editar orientação'}
    >
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={s.head}>
          <div className={s.headMain}>
            <input
              ref={titleRef}
              className={s.titleInput}
              type="text"
              maxLength={160}
              placeholder="Nova Orientação"
              aria-label="Título da orientação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className={s.tools}>
              <label className={s.templateField}>
                <span className={s.templateLabel}>Modelo</span>
                <select
                  className={s.templateSelect}
                  value={templateId}
                  onChange={(e) => onTemplateChange(e.target.value)}
                >
                  {ORIENTACAO_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={`btn-secondary ${s.toolBtn}`}
                disabled
                title="Em breve"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
          <button
            type="button"
            className={s.closeBtn}
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className={s.body}>
          <div className={s.editorCol}>
            <PatientAnamneseRichEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              placeholder="Escreva aqui orientações nutricionais para o paciente"
              ariaLabel="Conteúdo da orientação"
              actions={
                <button
                  type="button"
                  className={s.rewriteBtn}
                  disabled
                  title="Em breve"
                >
                  <Sparkles size={14} />
                  Rewrite
                </button>
              }
            />
          </div>

          <aside className={s.previewCol}>
            <label className={s.previewModel}>
              <span>Visualização</span>
              <select
                value={previewModelId}
                onChange={(e) => setPreviewModelId(e.target.value)}
              >
                {ORIENTACAO_PREVIEW_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <PatientOrientacaoPreview
              ref={previewRef}
              title={title}
              content={content}
              patientName={patientName}
              patientCpf={patientCpf}
              authorName={authorName}
            />
          </aside>
        </div>

        {/* Footer */}
        <footer className={s.foot}>
          <div className={s.footLeft}>
            <button
              type="button"
              className={`btn-secondary ${s.footBtn}`}
              onClick={printPreview}
            >
              <Printer size={15} />
              Imprimir
            </button>
            <label className={s.blankToggle}>
              <input
                type="checkbox"
                checked={blankMode}
                onChange={(e) => setBlankMode(e.target.checked)}
              />
              <span>Criar modelo em branco</span>
            </label>
          </div>
          <div className={s.footRight}>
            {error && <p className={s.msgError}>{error}</p>}
            {!error && success && <p className={s.msgOk}>{success}</p>}
            <button
              type="button"
              className={`btn-secondary ${s.footBtn}`}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`btn-primary ${s.footBtn}`}
              disabled={saving || !canSave}
              onClick={handleSave}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
