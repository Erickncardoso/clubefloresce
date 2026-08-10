'use client'

import { useEffect, useState } from 'react'
import { AnimatedDialog } from '@/components/overlays'
import { ShoppingCart, Sparkles, X } from 'lucide-react'
import {
  SHOPPING_LIST_PERIODS,
  SHOPPING_LIST_SMART_LIMIT,
  ShoppingList,
  buildShoppingListFromPlan,
  normalizeShoppingList,
  organizeShoppingListLocally,
  smartListRemainingUses,
} from '@/lib/meal-plan/shopping-list'
import { apiFetch } from '@/lib/api'
import type { MealEntry } from '@/lib/meal-plan/types'
import styles from './PatientMealPlanShoppingListModal.module.scss'

interface Props {
  open: boolean
  shoppingList: Partial<ShoppingList> | null | undefined
  meals: MealEntry[]
  methodology?: string
  planTitle?: string
  onClose: () => void
  onSave: (shoppingList: ShoppingList) => void
}

export function PatientMealPlanShoppingListModal({
  open,
  shoppingList,
  meals,
  methodology = 'foods',
  planTitle = '',
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ShoppingList>(() => normalizeShoppingList(shoppingList))
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [smartLoading, setSmartLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setNotice('')
    setErrorMessage('')
    const normalized = normalizeShoppingList(shoppingList)
    setDraft(normalized)
    if (!normalized.customText.trim()) {
      applyGeneratedList(normalized, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function updateDraft(patch: Partial<ShoppingList>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function applyGeneratedList(base: ShoppingList, showNotice = true) {
    const generated = buildShoppingListFromPlan(meals, { methodology, periodDays: base.periodDays })
    const next = {
      ...base,
      customText: generated.text,
      generatedAt: new Date().toISOString(),
      isSmartOrganized: false,
    }
    setDraft(next)
    if (showNotice) setNotice(`${generated.entries.length} itens gerados a partir do plano.`)
    return next
  }

  function setPeriod(periodDays: number) {
    setDraft((prev) => ({ ...prev, periodDays }))
  }

  function regenerateFromPlan() {
    if (draft.customText.trim() && !window.confirm('Substituir a lista atual pelos itens do plano?')) return
    applyGeneratedList(draft, true)
  }

  async function runSmartList() {
    setErrorMessage('')
    setNotice('')
    const rawText = draft.customText.trim()
    if (!rawText) { setErrorMessage('Gere ou adicione itens antes de usar a Lista Inteligente.'); return }
    const remaining = smartListRemainingUses(draft)
    if (!remaining) { setErrorMessage('Limite de usos da Lista Inteligente atingido neste plano.'); return }

    setSmartLoading(true)
    try {
      const data = await apiFetch<{ text?: string; smartListUses?: number }>('/meal-plan/shopping-list/smart', {
        method: 'POST',
        body: JSON.stringify({ itemsText: rawText, planTitle, periodDays: draft.periodDays, smartListUses: draft.smartListUses }),
      })
      setDraft((prev) => ({
        ...prev,
        customText: String(data?.text || '').trim() || prev.customText,
        smartListUses: Number(data?.smartListUses) || (prev.smartListUses + 1),
        isSmartOrganized: true,
      }))
      setNotice('Lista organizada por categoria. Revise antes de salvar.')
    } catch (err) {
      const fallback = organizeShoppingListLocally(rawText.split('\n'))
      if (fallback.sections.length) {
        setDraft((prev) => ({ ...prev, customText: fallback.text, isSmartOrganized: true }))
        setNotice('Organização local aplicada (IA indisponível).')
      } else {
        const e = err as { data?: { message?: string }; message?: string }
        setErrorMessage(e?.data?.message || e?.message || 'Não foi possível organizar a lista.')
      }
    } finally {
      setSmartLoading(false)
    }
  }

  async function copyList() {
    const text = draft.customText.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Lista copiada para a área de transferência.')
    } catch {
      setErrorMessage('Não foi possível copiar a lista.')
    }
  }

  function handleSave() {
    onSave(normalizeShoppingList({ ...draft }))
    onClose()
  }

  const remainingUses = smartListRemainingUses(draft)

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Lista de Compras"
      contentClassName={styles.panel}
    >
      <header className={styles.head}>
        <div className={styles.titleWrap}>
          <ShoppingCart aria-hidden="true" />
          <h2 id="mpsl-title">Lista de Compras</h2>
        </div>
        <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>

      <div className={styles.body}>
        {/* Title field */}
        <div className="field field--float">
          <label htmlFor="mpsl-title-input">Título</label>
          <input
            id="mpsl-title-input"
            type="text"
            maxLength={80}
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
          />
        </div>

        {/* Period pills */}
        <div className={styles.period}>
          <span className={styles.periodLabel}>Período</span>
          <div className={styles.periodPills} role="group" aria-label="Período da lista">
            {SHOPPING_LIST_PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                className={`${styles.periodBtn} ${draft.periodDays === period.id ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>
          <p className={styles.periodHint}>
            Escala a lista para planos de {draft.periodDays} dias (base: 1 semana do plano).
          </p>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <button type="button" className={`btn-secondary ${styles.toolbarBtn}`} onClick={regenerateFromPlan}>
            Atualizar a partir do plano
          </button>
          <button type="button" className={`btn-secondary ${styles.toolbarBtn}`} onClick={copyList}>
            Copiar lista
          </button>
        </div>

        {/* Items textarea */}
        <div className={`field field--float ${styles.listField}`}>
          <label htmlFor="mpsl-items">Itens da lista</label>
          <textarea
            id="mpsl-items"
            rows={10}
            placeholder="Um item por linha. Use ## Categoria para seções."
            value={draft.customText}
            onChange={(e) => updateDraft({ customText: e.target.value })}
          />
        </div>

        {notice && <p className={styles.notice}>{notice}</p>}
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        {/* Smart list */}
        <div className={styles.smartWrap}>
          <button
            type="button"
            className={styles.smartBtn}
            disabled={smartLoading || !remainingUses}
            onClick={runSmartList}
          >
            {!smartLoading && <Sparkles aria-hidden="true" />}
            <span>{smartLoading ? 'Organizando…' : 'Lista Inteligente'}</span>
          </button>
          <span className={styles.smartMeta}>
            {remainingUses}/{SHOPPING_LIST_SMART_LIMIT} usos restantes
          </span>
        </div>
      </div>

      <footer className={styles.foot}>
        <button type="button" className={`btn-secondary ${styles.footBtn}`} onClick={onClose}>Cancelar</button>
        <button type="button" className={`btn-primary ${styles.footBtn}`} onClick={handleSave}>Salvar alterações</button>
      </footer>
    </AnimatedDialog>
  )
}
