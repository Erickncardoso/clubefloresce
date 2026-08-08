'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { MEAL_PLAN_METHODOLOGIES } from '@/lib/meal-plan/prescription'
import type { MealPlanMethodology } from '@/lib/meal-plan/types'
import styles from './PatientMealPlanNewModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (args: { title: string; methodology: MealPlanMethodology }) => void
}

export function PatientMealPlanNewModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [methodology, setMethodology] = useState<MealPlanMethodology>('foods')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setMethodology('foods')
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    onSubmit({ title: trimmed || 'Nova prescrição', methodology })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="mpnew-title" onKeyDown={handleKeyDown}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 id="mpnew-title" className={styles.heading}>Novo plano alimentar</h2>
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className={styles.body} onSubmit={handleSubmit}>
          <div className="field field--float">
            <label htmlFor="mpnew-title-input">Título do plano</label>
            <input
              ref={titleRef}
              id="mpnew-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ex.: Plano de emagrecimento"
            />
          </div>

          <fieldset className={styles.methodSet}>
            <legend className={styles.methodLegend}>Metodologia</legend>
            <div className={styles.methodGrid}>
              {MEAL_PLAN_METHODOLOGIES.map((m) => (
                <label
                  key={m.id}
                  className={`${styles.methodCard} ${methodology === m.id ? styles.methodCardActive : ''}`}
                >
                  <input
                    type="radio"
                    name="methodology"
                    value={m.id}
                    checked={methodology === m.id}
                    onChange={() => setMethodology(m.id)}
                    className={styles.methodRadio}
                  />
                  <strong className={styles.methodName}>{m.label}</strong>
                  <span className={styles.methodDesc}>{m.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Criar plano
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
