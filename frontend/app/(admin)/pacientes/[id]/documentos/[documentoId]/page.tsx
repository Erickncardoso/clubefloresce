'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getCachedUser } from '@/lib/auth'
import {
  DOCUMENTO_LIMIT,
  DOCUMENTO_PREVIEW_MODELS,
  type DocumentoTemplate,
  findDocumentoTemplate,
  getAllDocumentoTemplates,
  htmlToPlainText,
  saveCustomDocumentoTemplate,
} from '@/lib/documento-templates'
import type { Documento, PatientUser, PatientProfile } from '@/lib/types'
import {
  PatientAnamneseRichEditor,
  type RichEditorHandle,
} from '@/components/patients/PatientAnamneseRichEditor'
import { PatientDocumentoPreview } from '@/components/patients/PatientDocumentoPreview'
import { PatientDocumentoTemplatePicker } from '@/components/patients/PatientDocumentoTemplatePicker'
import styles from './documento.module.scss'

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export default function DocumentoEditorPage() {
  const params = useParams<{ id: string; documentoId: string }>()
  const router = useRouter()
  const patientId = params?.id ?? ''
  const documentoRouteId = params?.documentoId ?? ''
  const isNew = documentoRouteId === 'novo'

  const [user, setUser] = useState<PatientUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Draft state
  const [category, setCategory] = useState('Documento')
  const [title, setTitle] = useState('Novo documento')
  const [content, setContent] = useState('')
  const [templateId, setTemplateId] = useState('blank')
  const [previewModelId, setPreviewModelId] = useState('florescer')
  const [editingId, setEditingId] = useState('')
  const [templateOptions, setTemplateOptions] = useState<DocumentoTemplate[]>(
    getAllDocumentoTemplates,
  )

  // UI state
  const [saving, setSaving] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [skipTemplateApply, setSkipTemplateApply] = useState(false)

  const editorRef = useRef<RichEditorHandle>(null)
  const rewriteMenuRef = useRef<HTMLDivElement>(null)
  const previewArticleRef = useRef<HTMLElement>(null)

  // Derived
  const profile = user?.patientProfileData as PatientProfile | undefined
  const patientName = user?.name || '—'
  const patientCpf = formatCpf(String(profile?.cpf || ''))
  const authorName = getCachedUser()?.name || 'Nutricionista'
  const activeTemplate = findDocumentoTemplate(templateId)
  const canSave = Boolean(title.trim() || htmlToPlainText(content))

  function refreshTemplateOptions() {
    setTemplateOptions(getAllDocumentoTemplates())
  }

  const applyTemplate = useCallback(
    (tmplId: string, force = false) => {
      const template = findDocumentoTemplate(tmplId)
      setTemplateId(template.id)
      if (!force && htmlToPlainText(content)) return
      setCategory(template.category)
      setTitle(template.title)
      setContent(template.content)
      setTimeout(() => editorRef.current?.setHtml(template.content || ''), 0)
    },
    [content],
  )

  function onTemplateChange(newId: string) {
    if (skipTemplateApply) {
      setSkipTemplateApply(false)
      return
    }
    if (
      htmlToPlainText(content) &&
      !window.confirm('Substituir o conteúdo atual pelo modelo selecionado?')
    ) {
      setSkipTemplateApply(true)
      return
    }
    applyTemplate(newId, true)
  }

  // Load patient + seed existing document
  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    apiFetch<PatientUser>(`/users/${patientId}`)
      .then((data) => {
        setUser(data)
        const docs: Documento[] = Array.isArray(
          (data?.patientProfileData as PatientProfile | undefined)?.documentos,
        )
          ? (data.patientProfileData as PatientProfile).documentos!
          : []

        if (!isNew) {
          const existing = docs.find((d) => d.id === documentoRouteId) as
            | (Documento & { category?: string })
            | undefined
          if (existing) {
            setEditingId(existing.id)
            setCategory(
              existing.category ||
                findDocumentoTemplate(existing.templateId || 'blank').category ||
                'Documento',
            )
            setTitle(existing.title || 'Documento')
            setContent(existing.content || '')
            setTemplateId(existing.templateId || 'blank')
            setPreviewModelId(existing.previewModelId || 'florescer')
            setTimeout(() => editorRef.current?.setHtml(existing.content || ''), 0)
          } else {
            setLoadError('Documento não encontrado.')
          }
        } else {
          applyTemplate('blank', true)
        }
      })
      .catch((err: unknown) => {
        setLoadError(
          (err as { message?: string })?.message || 'Erro ao carregar paciente.',
        )
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, documentoRouteId])

  function nextDocumentosList(
    nextItem: Documento & { category?: string },
    removeId = '',
  ): (Documento & { category?: string })[] {
    const current: (Documento & { category?: string })[] = Array.isArray(profile?.documentos)
      ? [...(profile!.documentos as (Documento & { category?: string })[])]
      : []
    if (removeId) return current.filter((item) => item.id !== removeId)
    const idx = current.findIndex((item) => item.id === nextItem.id)
    if (idx >= 0) {
      const copy = [...current]
      copy[idx] = nextItem
      return copy
    }
    return [nextItem, ...current].slice(0, DOCUMENTO_LIMIT)
  }

  async function patchDocumentos(
    nextList: (Documento & { category?: string })[],
  ): Promise<PatientUser> {
    const updated = await apiFetch<PatientUser>(`/users/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify({ patientProfile: { documentos: nextList } }),
    })
    setUser(updated)
    return updated
  }

  async function saveDraft() {
    if (!canSave || !patientId || saving) return
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const now = new Date().toISOString()
      const existingDocs = Array.isArray(profile?.documentos) ? profile!.documentos! : []
      const existing = existingDocs.find((d) => d.id === editingId) as
        | (Documento & { category?: string })
        | undefined
      const itemId = editingId || crypto.randomUUID()
      const item: Documento & { category?: string } = {
        id: itemId,
        category: category.trim() || activeTemplate.category || 'Documento',
        title: title.trim() || 'Documento',
        content,
        templateId,
        previewModelId,
        status: 'published',
        authorName,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      }
      await patchDocumentos(nextDocumentosList(item))
      setEditingId(itemId)
      setSuccessMessage('Documento salvo com sucesso.')
      if (isNew) {
        router.replace(`/pacientes/${patientId}/documentos/${itemId}`)
      }
    } catch (err: unknown) {
      setErrorMessage(
        (err as { data?: { error?: string; message?: string } })?.data?.error ||
          (err as { data?: { message?: string } })?.data?.message ||
          (err as { message?: string })?.message ||
          'Erro ao salvar documento.',
      )
    } finally {
      setSaving(false)
    }
  }

  function printPreview() {
    const el = previewArticleRef.current
    if (!el) return
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title || 'Documento'}</title>`
        + `<style>body{margin:0;font-family:system-ui,sans-serif;background:#fff}@page{size:A4;margin:16mm}</style></head>`
        + `<body>${el.outerHTML}</body></html>`,
    )
    w.document.close()
    w.focus()
    w.print()
  }

  function saveAsTemplate() {
    const label = window.prompt('Nome do modelo:', title || 'Meu modelo')
    if (!label?.trim()) return
    try {
      const saved = saveCustomDocumentoTemplate({
        label: label.trim(),
        title,
        content,
      })
      refreshTemplateOptions()
      setTemplateId(saved.id)
      setSuccessMessage('Modelo salvo e disponível no seletor.')
      setErrorMessage('')
    } catch (err: unknown) {
      setErrorMessage((err as { message?: string })?.message || 'Erro ao salvar modelo.')
    }
  }

  async function rewriteSelection(mode: 'formal' | 'simple' | 'custom') {
    setRewriteOpen(false)
    const html = editorRef.current?.getSelectedHtml()
    if (!html) {
      setErrorMessage('Selecione um trecho de texto no editor para reescrever.')
      return
    }
    setRewriting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await apiFetch<{ html: string }>(
        `/patients/${patientId}/documentos/rewrite`,
        {
          method: 'POST',
          body: JSON.stringify({
            html,
            mode,
            instruction: rewriteInstruction,
            documentTitle: title,
          }),
        },
      )
      editorRef.current?.replaceSelectedHtml(String(data?.html || ''))
      setSuccessMessage('Trecho reescrito. Revise antes de salvar.')
    } catch (err: unknown) {
      setErrorMessage(
        (err as { data?: { message?: string } })?.data?.message ||
          (err as { message?: string })?.message ||
          'Falha ao reescrever trecho.',
      )
    } finally {
      setRewriting(false)
    }
  }

  // Close rewrite menu on outside click
  useEffect(() => {
    if (!rewriteOpen) return
    function onDoc(e: MouseEvent) {
      if (!rewriteMenuRef.current?.contains(e.target as Node)) setRewriteOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [rewriteOpen])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Carregando documento…</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorPage}>
          <p>{loadError}</p>
          <Link href={`/pacientes/${patientId}`} className="btn-secondary">
            Voltar ao paciente
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.split}>
        {/* ── Editor column ── */}
        <section className={styles.editorCol}>
          <nav className={styles.breadcrumb} aria-label="Navegação">
            <Link href="/dashboard" className={styles.crumb}>
              Início
            </Link>
            <span className={styles.crumbSep} aria-hidden>
              ›
            </span>
            <Link href={`/pacientes/${patientId}`} className={styles.crumb}>
              {patientName}
            </Link>
            <span className={styles.crumbSep} aria-hidden>
              ›
            </span>
            <span className={`${styles.crumb} ${styles.crumbCurrent}`} aria-current="page">
              Documentos
            </span>
          </nav>

          <header className={styles.editorHead}>
            <input
              className={styles.categoryInput}
              type="text"
              maxLength={80}
              placeholder="Tipo do documento"
              aria-label="Tipo do documento"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className={styles.titleInput}
              type="text"
              maxLength={160}
              placeholder="Novo documento"
              aria-label="Título do documento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className={styles.headControls}>
              <PatientDocumentoTemplatePicker
                value={templateId}
                templates={templateOptions}
                onChange={onTemplateChange}
              />
              <button
                type="button"
                className={`btn-secondary ${styles.toolbarBtn}`}
                onClick={saveAsTemplate}
              >
                Salvar Modelo
              </button>
            </div>
          </header>

          <div className={styles.editorBody}>
            <PatientAnamneseRichEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              placeholder="Escreva aqui o conteúdo do documento"
              ariaLabel="Conteúdo do documento"
              actions={
                <div ref={rewriteMenuRef} className={styles.rewriteWrap}>
                  <button
                    type="button"
                    className={`${styles.rewriteBtn}${rewriting ? ` ${styles.rewriteBtnLoading}` : ''}`}
                    disabled={rewriting}
                    onClick={() => setRewriteOpen((v) => !v)}
                  >
                    <Sparkles size={14} />
                    {rewriting ? 'Reescrevendo…' : 'Rewrite'}
                  </button>
                  {rewriteOpen ? (
                    <div className={styles.rewriteMenu}>
                      <button
                        type="button"
                        className={styles.rewriteOption}
                        onClick={() => rewriteSelection('formal')}
                      >
                        Mais formal
                      </button>
                      <button
                        type="button"
                        className={styles.rewriteOption}
                        onClick={() => rewriteSelection('simple')}
                      >
                        Mais simples
                      </button>
                      <div className={styles.rewriteCustom}>
                        <textarea
                          rows={2}
                          placeholder="Instrução personalizada…"
                          value={rewriteInstruction}
                          onChange={(e) => setRewriteInstruction(e.target.value)}
                        />
                        <button
                          type="button"
                          className={styles.rewriteOption}
                          onClick={() => rewriteSelection('custom')}
                        >
                          Aplicar instrução
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              }
            />
          </div>

          <footer className={styles.editorFoot}>
            <div className={styles.footLeft}>
              <button type="button" className={styles.linkBtn} onClick={printPreview}>
                Baixar PDF
              </button>
              <span className={styles.footDot} aria-hidden>
                ·
              </span>
              <button type="button" className={styles.linkBtn} onClick={printPreview}>
                Imprimir
              </button>
              {errorMessage ? (
                <p className={`${styles.msg} ${styles.msgError}`}>{errorMessage}</p>
              ) : successMessage ? (
                <p className={`${styles.msg} ${styles.msgOk}`}>{successMessage}</p>
              ) : null}
            </div>
            <div className={styles.footActions}>
              <Link
                href={`/pacientes/${patientId}`}
                className={`btn-secondary ${styles.actionBtn}`}
                style={{ textDecoration: 'none' }}
              >
                Cancelar
              </Link>
              <button
                type="button"
                className={`btn-primary ${styles.actionBtn}`}
                disabled={saving || !canSave}
                onClick={saveDraft}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </footer>
        </section>

        {/* ── Preview column ── */}
        <aside className={styles.previewCol}>
          <div className={styles.previewToolbar}>
            <label className={styles.previewModelLabel}>
              <select
                className={styles.previewModelSelect}
                value={previewModelId}
                aria-label="Modelo de visualização"
                onChange={(e) => setPreviewModelId(e.target.value)}
              >
                {DOCUMENTO_PREVIEW_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.previewStage}>
            <PatientDocumentoPreview
              ref={previewArticleRef}
              variant="large"
              kicker={category || activeTemplate.category}
              title={title}
              content={content}
              patientName={patientName}
              patientCpf={patientCpf}
              authorName={authorName}
              authorCrn=""
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
