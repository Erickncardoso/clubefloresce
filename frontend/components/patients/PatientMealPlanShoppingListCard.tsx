'use client'

import { Pencil, ShoppingCart } from 'lucide-react'
import {
  buildShoppingListFromPlan,
  normalizeShoppingList,
} from '@/lib/meal-plan/shopping-list'
import type { ShoppingList } from '@/lib/meal-plan/shopping-list'
import type { MealEntry, MealPlanMethodology } from '@/lib/meal-plan/types'
import styles from './PatientMealPlanShoppingListCard.module.scss'

const PREVIEW_LIMIT = 6

interface Props {
  shoppingList: Partial<ShoppingList> | null | undefined
  meals: MealEntry[]
  methodology: MealPlanMethodology
  onEdit: () => void
}

function formatItemCount(count: number): string {
  if (count === 0) return 'Sem itens'
  if (count === 1) return '1 item'
  return `${count} itens`
}

export function PatientMealPlanShoppingListCard({
  shoppingList,
  meals,
  methodology,
  onEdit,
}: Props) {
  const normalized = normalizeShoppingList(shoppingList)
  const title = normalized.title || 'Lista de Compras'

  // Build live preview items from meals
  const { entries } = buildShoppingListFromPlan(meals, {
    methodology,
    periodDays: normalized.periodDays,
  })

  const allNames = entries.map((e) => e.name)
  const previewItems = allNames.slice(0, PREVIEW_LIMIT)
  const countLabel = formatItemCount(allNames.length)

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div
          className={styles.titleWrap}
          role="button"
          tabIndex={0}
          onClick={onEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onEdit()
            }
          }}
        >
          <ShoppingCart size={15} className={styles.icon} aria-hidden="true" />
          <h4 className={styles.title}>{title}</h4>
          <span className={styles.editIcon} aria-hidden="true">
            <Pencil size={12} />
          </span>
        </div>
        <span className={styles.count}>{countLabel}</span>
      </header>

      {previewItems.length > 0 ? (
        <ul className={styles.list}>
          {previewItems.map((name) => (
            <li key={name}>{name}</li>
          ))}
          {allNames.length > PREVIEW_LIMIT && (
            <li className={styles.more}>
              + {allNames.length - PREVIEW_LIMIT} itens
            </li>
          )}
        </ul>
      ) : (
        <p className={styles.empty}>Adicione alimentos para gerar a lista.</p>
      )}

      <div className={styles.foot}>
        <button
          type="button"
          className={styles.openBtn}
          onClick={onEdit}
        >
          Ver lista completa
        </button>
      </div>
    </article>
  )
}
