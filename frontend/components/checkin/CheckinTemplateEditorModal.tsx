'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { FloatField } from '@/components/ui/FloatField'
import {
  CHECKIN_STEP_TYPE_OPTIONS,
  buildStepPayload,
  buildStepPreviewPayload,
  defaultEditorStep,
  editorStepFromApi,
  type EditorStep,
} from '@/lib/checkin-step-schema'
import type { CheckinTemplate, TemplatePayload } from '@/lib/checkin'
import { CheckinTemplateEditorPreview } from './CheckinTemplateEditorPreview'
import styles from './CheckinTemplateEditorModal.module.scss'

export type CheckinTemplateEditorModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  template?: CheckinTemplate | null
  saving?: boolean
  error?: string
  onClose: () => void
  onSave: (payload: TemplatePayload) => void | Promise<void>
}

export function CheckinTemplateEditorModal({
  open,
  mode,
  template,
  saving = false,
  error = '',
  onClose,
  onSave,
}: CheckinTemplateEditorModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [active, setActive] = useState(true)
  const [steps, setSteps] = useState<EditorStep[]>([defaultEditorStep()])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setLocalError('')
    if (mode === 'edit' && template) {
      setTitle(template.title || '')
      setDescription(template.description || '')
      setFrequency(template.frequency || 'weekly')
      setActive(template.active !== false)
      const mapped = (Array.isArray(template.steps) ? template.steps : []).map((s) =>
        editorStepFromApi(s),
      )
      setSteps(mapped.length ? mapped : [defaultEditorStep()])
      setPreviewIndex(0)
      return
    }
    setTitle('')
    setDescription('')
    setFrequency('weekly')
    setActive(true)
    setSteps([defaultEditorStep()])
    setPreviewIndex(0)
  }, [open, mode, template])

  const previewSteps = useMemo(
    () => steps.map((step, index) => buildStepPreviewPayload(step, index)),
    [steps],
  )

  if (!open) return null

  function updateStep(index: number, patch: Partial<EditorStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function onStepTypeChange(index: number, type: string) {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        const next = { ...s, type }
        if (type === 'choice' && !next.optionsText) next.optionsText = 'Sim\nNão'
        if (type === 'water') {
          if (!next.question) next.question = 'Quantos litros de água você bebeu?'
          if (!next.hint) next.hint = 'Conte o total do dia (água pura, chás sem açúcar, etc.).'
        }
        if (type === 'exercise') {
          if (!next.yesLabel) next.yesLabel = 'Sim, pratiquei hoje'
          if (!next.noLabel) next.noLabel = 'Não pratiquei hoje'
        }
        if (type === 'text' && !next.placeholder) next.placeholder = 'Sua resposta...'
        return next
      }),
    )
  }

  function addStep() {
    if (steps.length >= 20) {
      setLocalError('Máximo de 20 perguntas.')
      return
    }
    const step = defaultEditorStep()
    step.id = `step_${steps.length + 1}`
    setSteps((prev) => [...prev, step])
    setPreviewIndex(steps.length)
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : [defaultEditorStep()]
    })
    setPreviewIndex((cur) => {
      if (cur >= steps.length - 1) return Math.max(0, steps.length - 2)
      if (cur > index) return cur - 1
      return cur
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError('')
    try {
      const payload: TemplatePayload = {
        title: title.trim(),
        description: description.trim() || null,
        frequency,
        active,
        steps: steps.map((step, index) => buildStepPayload(step, index)),
      }
      if (!payload.title) throw new Error('Título obrigatório.')
      await onSave(payload)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  const displayError = localError || error

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Novo check-in' : 'Editar check-in'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <h2>{mode === 'create' ? 'Novo check-in' : 'Editar check-in'}</h2>
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.layout}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <FloatField
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="Ex: Check-in semanal"
            />
            <FloatField
              as="textarea"
              label="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Breve explicação para o paciente"
            />
            <div className={styles.rowInline}>
              <FloatField
                as="select"
                label="Frequência"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className={styles.grow}
              >
                <option value="weekly">Semanal</option>
                <option value="daily">Diário</option>
                <option value="monthly">Mensal</option>
              </FloatField>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>Ativo para pacientes</span>
              </label>
            </div>

            <div className={styles.stepsBlock}>
              <div className={styles.stepsHead}>
                <h3>Perguntas</h3>
                <button type="button" className="btn-ghost btn-sm" onClick={addStep}>
                  + Pergunta
                </button>
              </div>

              {steps.map((step, index) => (
                <div
                  key={step._key}
                  className={`${styles.stepCard} ${previewIndex === index ? styles.stepCardActive : ''}`}
                  onClick={() => setPreviewIndex(index)}
                  role="presentation"
                >
                  <div className={styles.stepHead}>
                    <strong>Pergunta {index + 1}</strong>
                    {steps.length > 1 ? (
                      <button
                        type="button"
                        className="btn-danger-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeStep(index)
                        }}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>

                  <FloatField
                    as="select"
                    label="Tipo"
                    value={step.type}
                    onChange={(e) => onStepTypeChange(index, e.target.value)}
                  >
                    {CHECKIN_STEP_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FloatField>

                  <FloatField
                    label="Pergunta"
                    value={step.question}
                    onChange={(e) => updateStep(index, { question: e.target.value })}
                    required
                    maxLength={200}
                    placeholder="Texto exibido para o paciente"
                  />
                  <FloatField
                    label="Dica (opcional)"
                    value={step.hint}
                    onChange={(e) => updateStep(index, { hint: e.target.value })}
                    maxLength={200}
                    placeholder="Texto de apoio abaixo da pergunta"
                  />

                  {step.type === 'choice' ? (
                    <FloatField
                      as="textarea"
                      label="Opções de resposta (uma por linha)"
                      value={step.optionsText}
                      onChange={(e) => updateStep(index, { optionsText: e.target.value })}
                      rows={4}
                      placeholder={'Ótimo\nRegular\nRuim'}
                    />
                  ) : null}

                  {step.type === 'scale' ? (
                    <div className={styles.row}>
                      <FloatField
                        label="Escala — mínimo"
                        type="number"
                        min={0}
                        max={20}
                        value={step.scaleMin}
                        onChange={(e) => updateStep(index, { scaleMin: Number(e.target.value) })}
                        className={styles.grow}
                      />
                      <FloatField
                        label="Escala — máximo"
                        type="number"
                        min={1}
                        max={20}
                        value={step.scaleMax}
                        onChange={(e) => updateStep(index, { scaleMax: Number(e.target.value) })}
                        className={styles.grow}
                      />
                    </div>
                  ) : null}

                  {step.type === 'water' ? (
                    <>
                      <div className={styles.row}>
                        <FloatField
                          label="Mín. (L)"
                          type="number"
                          min={0}
                          step={0.25}
                          value={step.waterMin}
                          onChange={(e) => updateStep(index, { waterMin: Number(e.target.value) })}
                          className={styles.grow}
                        />
                        <FloatField
                          label="Máx. (L)"
                          type="number"
                          min={0.25}
                          step={0.25}
                          value={step.waterMax}
                          onChange={(e) => updateStep(index, { waterMax: Number(e.target.value) })}
                          className={styles.grow}
                        />
                      </div>
                      <div className={styles.row}>
                        <FloatField
                          label="Incremento (+/−)"
                          type="number"
                          min={0.05}
                          step={0.05}
                          value={step.waterStep}
                          onChange={(e) => updateStep(index, { waterStep: Number(e.target.value) })}
                          className={styles.grow}
                        />
                        <FloatField
                          label="Valor inicial"
                          type="number"
                          min={0}
                          step={0.25}
                          value={step.waterDefault}
                          onChange={(e) =>
                            updateStep(index, { waterDefault: Number(e.target.value) })
                          }
                          className={styles.grow}
                        />
                      </div>
                    </>
                  ) : null}

                  {step.type === 'number' ? (
                    <>
                      <div className={styles.row}>
                        <FloatField
                          label="Mínimo"
                          type="number"
                          value={step.numberMin}
                          onChange={(e) => updateStep(index, { numberMin: Number(e.target.value) })}
                          className={styles.grow}
                        />
                        <FloatField
                          label="Máximo"
                          type="number"
                          value={step.numberMax}
                          onChange={(e) => updateStep(index, { numberMax: Number(e.target.value) })}
                          className={styles.grow}
                        />
                      </div>
                      <div className={styles.row}>
                        <FloatField
                          label="Incremento (+/−)"
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={step.numberStep}
                          onChange={(e) =>
                            updateStep(index, { numberStep: Number(e.target.value) })
                          }
                          className={styles.grow}
                        />
                        <FloatField
                          label="Valor inicial"
                          type="number"
                          value={step.numberDefault}
                          onChange={(e) =>
                            updateStep(index, { numberDefault: Number(e.target.value) })
                          }
                          className={styles.grow}
                        />
                      </div>
                      <FloatField
                        label="Unidade (opcional)"
                        value={step.numberUnit}
                        onChange={(e) => updateStep(index, { numberUnit: e.target.value })}
                        maxLength={24}
                        placeholder="Ex: horas, copos, km"
                      />
                    </>
                  ) : null}

                  {step.type === 'exercise' ? (
                    <div className={styles.row}>
                      <FloatField
                        label="Texto da opção positiva"
                        value={step.yesLabel}
                        onChange={(e) => updateStep(index, { yesLabel: e.target.value })}
                        maxLength={80}
                        placeholder="Sim, pratiquei hoje"
                        className={styles.grow}
                      />
                      <FloatField
                        label="Texto da opção negativa"
                        value={step.noLabel}
                        onChange={(e) => updateStep(index, { noLabel: e.target.value })}
                        maxLength={80}
                        placeholder="Não pratiquei hoje"
                        className={styles.grow}
                      />
                    </div>
                  ) : null}

                  {step.type === 'text' ? (
                    <FloatField
                      label="Placeholder do campo"
                      value={step.placeholder}
                      onChange={(e) => updateStep(index, { placeholder: e.target.value })}
                      maxLength={120}
                      placeholder="Sua resposta..."
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {displayError ? <p className={styles.error}>{displayError}</p> : null}

            <footer className={styles.foot}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </footer>
          </form>

          <aside className={styles.previewAside} aria-label="Prévia do check-in no app">
            <CheckinTemplateEditorPreview
              steps={previewSteps}
              stepIndex={previewIndex}
              onStepIndexChange={setPreviewIndex}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
