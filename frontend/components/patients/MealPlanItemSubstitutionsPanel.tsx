'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { MealPlanFoodSearchPicker } from './MealPlanFoodSearchPicker'
import type { MealItem } from '@/lib/meal-plan/types'
import type { FoodBankItem } from '@/lib/meal-plan/food-bank'
import { FOOD_EQUIVALENT_GROUPS } from '@/lib/meal-plan/prescription'
import styles from './MealPlanItemSubstitutionsPanel.module.scss'

type SubstitutionType = 'food' | 'group'
type ActiveTab = 'food' | 'group'

interface Substitution {
  id: string
  type: SubstitutionType
  name?: string
  display?: string
  foodId?: string
  per100g?: MealItem['per100g']
  portionAmount?: number | null
  portionMeasure?: string
  groupId?: string
  amount?: string
  unit?: string
  [key: string]: unknown
}

interface Props {
  item: MealItem
  onChange: (patch: Partial<MealItem>) => void
}

function createFoodSub(): Substitution {
  return { id: crypto.randomUUID(), type: 'food', name: '', display: '', foodId: '', per100g: null }
}

function createGroupSub(): Substitution {
  const group = FOOD_EQUIVALENT_GROUPS[0]
  return { id: crypto.randomUUID(), type: 'group', groupId: group.id, name: group.label, amount: '1', unit: 'porção' }
}

function getSubstitutions(item: MealItem): Substitution[] {
  return (Array.isArray(item.substitutions) ? item.substitutions : []) as Substitution[]
}

export function MealPlanItemSubstitutionsPanel({ item, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('food')

  const subs = getSubstitutions(item)
  const foodSubs = subs.filter((s) => (s.type || 'food') === 'food')
  const groupSubs = subs.filter((s) => s.type === 'group')

  function pushChange(nextSubs: Substitution[]) {
    onChange({ substitutions: nextSubs as MealItem['substitutions'] })
  }

  function addFoodSub() {
    pushChange([...subs, createFoodSub()])
    setActiveTab('food')
  }

  function addGroupSub() {
    pushChange([...subs, createGroupSub()])
    setActiveTab('group')
  }

  function removeSub(id: string) {
    pushChange(subs.filter((s) => s.id !== id))
  }

  function updateSub(id: string, patch: Partial<Substitution>) {
    pushChange(subs.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function onFoodSelect(sub: Substitution, food: FoodBankItem) {
    updateSub(sub.id, {
      foodId: food.id,
      name: food.displayName || food.name,
      display: food.displayName || food.name,
      per100g: food.per100g,
    })
  }

  function onGroupChange(sub: Substitution, groupId: string) {
    const group = FOOD_EQUIVALENT_GROUPS.find((g) => g.id === groupId)
    updateSub(sub.id, { groupId, name: group?.label || groupId, unit: 'porção' })
  }

  const totalCount = subs.length
  const tabs: Array<{ id: ActiveTab; label: string; count: number }> = [
    { id: 'food', label: 'Alimento', count: foodSubs.length },
    { id: 'group', label: 'Grupo', count: groupSubs.length },
  ]

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <strong>Opções de substituição</strong>
        {totalCount > 0 && <span className={styles.total}>{totalCount} selecionada(s)</span>}
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Tipo de substituição">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'food' && (
        <div className={styles.pane}>
          <div className={styles.actions}>
            <button type="button" className={`btn-secondary ${styles.addBtn}`} onClick={addFoodSub}>
              + Alimento manual
            </button>
          </div>

          {foodSubs.length === 0 && (
            <p className={styles.empty}>Nenhum alimento alternativo ainda. Use <strong>+ Alimento manual</strong> ou adicione manualmente.</p>
          )}

          {foodSubs.map((sub) => (
            <article key={sub.id} className={styles.row}>
              <div className={styles.rowMain}>
                <MealPlanFoodSearchPicker
                  value={sub.name || ''}
                  placeholder="Buscar alimento substituto…"
                  onChange={(v) => updateSub(sub.id, { name: v })}
                  onSelect={(food) => onFoodSelect(sub, food)}
                />
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                aria-label="Remover alternativa"
                onClick={() => removeSub(sub.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'group' && (
        <div className={styles.pane}>
          {groupSubs.length === 0 && <p className={styles.empty}>Nenhum grupo alternativo ainda.</p>}

          {groupSubs.map((sub) => (
            <article key={sub.id} className={styles.row}>
              <div className={`${styles.rowMain} ${styles.rowMainGroup}`}>
                <div className="field field--float" style={{ margin: 0 }}>
                  <label htmlFor={`mpis-group-${sub.id}`}>Grupo alimentar</label>
                  <select
                    id={`mpis-group-${sub.id}`}
                    value={sub.groupId || ''}
                    onChange={(e) => onGroupChange(sub, e.target.value)}
                  >
                    {FOOD_EQUIVALENT_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field field--float" style={{ margin: 0, maxWidth: '6rem' }}>
                  <label htmlFor={`mpis-group-qty-${sub.id}`}>Quantidade</label>
                  <input
                    id={`mpis-group-qty-${sub.id}`}
                    type="text"
                    inputMode="decimal"
                    value={sub.amount || ''}
                    onChange={(e) => updateSub(sub.id, { amount: e.target.value, unit: Number(e.target.value) > 1 ? 'porções' : 'porção' })}
                  />
                </div>
                <span className={styles.unit}>{sub.unit || 'porção'}</span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                aria-label="Remover alternativa"
                onClick={() => removeSub(sub.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))}

          <button type="button" className={`btn-secondary ${styles.addBtn}`} onClick={addGroupSub}>
            + Grupo alimentar
          </button>
        </div>
      )}

      {totalCount > 0 && (
        <p className={styles.preview}>{totalCount} opção(ões) visíveis para o paciente</p>
      )}
    </div>
  )
}
