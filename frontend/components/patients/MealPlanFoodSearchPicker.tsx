'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, Clock, CornerDownLeft, Star } from 'lucide-react'
import {
  FoodBankItem,
  formatFoodSourceLabel,
  formatPer100gKcal,
  getFoodById,
  loadFavoriteIds,
  searchFoods,
  sortWithFavorites,
  toggleFavoriteId,
} from '@/lib/meal-plan/food-bank'
import styles from './MealPlanFoodSearchPicker.module.scss'

interface Props {
  value: string
  placeholder?: string
  autofocus?: boolean
  onChange: (value: string) => void
  onSelect: (food: FoodBankItem) => void
  onRecipeTrigger?: () => void
}

function formatMacro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}g`
}

export function MealPlanFoodSearchPicker({
  value,
  placeholder = 'Digite para buscar na TBCA / TACO',
  autofocus = false,
  onChange,
  onSelect,
  onRecipeTrigger,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value || '')
  const [results, setResults] = useState<FoodBankItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoriteIds())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function updatePanelPosition() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.max(rect.width, 420)
    const maxLeft = Math.max(8, window.innerWidth - width - 8)
    setPanelStyle({
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${Math.min(rect.left, maxLeft)}px`,
      width: `${width}px`,
      zIndex: 10200,
    })
  }

  const runSearch = useCallback(async (query: string) => {
    setLoading(true)
    setSearchError('')
    setActiveIndex(-1)
    const q = String(query || '').trim()
    try {
      const favIds = loadFavoriteIds()
      let items = await searchFoods(q, 20)
      if (!q) {
        const favItems = (await Promise.all(favIds.slice(0, 10).map((id) => getFoodById(id)))).filter(Boolean) as FoodBankItem[]
        const seen = new Set(favItems.map((f) => f.id))
        items = [...favItems, ...items.filter((f) => !seen.has(f.id))].slice(0, 10)
      } else {
        const favItems = (await Promise.all(favIds.slice(0, 50).map((id) => getFoodById(id)))).filter(Boolean) as FoodBankItem[]
        const qLower = q.toLowerCase()
        const matchingFavs = favItems.filter((f) => String(f.name || '').toLowerCase().includes(qLower))
        const seen = new Set<string>()
        const merged: FoodBankItem[] = []
        for (const item of [...matchingFavs, ...items]) {
          if (!item?.id || seen.has(item.id)) continue
          seen.add(item.id)
          merged.push(item)
        }
        items = sortWithFavorites(merged, favIds).slice(0, 10)
      }
      setResults(items)
    } catch {
      setResults([])
      setSearchError('Erro ao buscar alimentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  function scheduleSearch(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 260)
  }

  function openPanel() {
    setOpen(true)
    setSearchQuery(value || '')
    scheduleSearch(value || '')
    requestAnimationFrame(() => {
      updatePanelPosition()
      inputRef.current?.focus()
    })
  }

  function closePanel() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function selectFood(food: FoodBankItem) {
    const label = food.displayName || food.name
    onChange(label)
    onSelect(food)
    setSearchQuery(label)
    closePanel()
  }

  function handleToggleFavorite(food: FoodBankItem, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = toggleFavoriteId(food.id)
    setFavoriteIds(next)
    setResults((prev) => sortWithFavorites(prev, next))
  }

  function moveActive(delta: number) {
    setActiveIndex((prev) => {
      if (!results.length) return prev
      const next = prev + delta
      if (next < 0) return results.length - 1
      if (next >= results.length) return 0
      return next
    })
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (String(v).trimStart().startsWith('$')) {
      onChange('')
      onRecipeTrigger?.()
      closePanel()
      return
    }
    onChange(v)
    setSearchQuery(v)
    if (!open) setOpen(true)
    scheduleSearch(v)
    requestAnimationFrame(updatePanelPosition)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      openPanel()
      e.preventDefault()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectFood(results[activeIndex]) }
    else if (e.key === 'Escape') { e.preventDefault(); closePanel() }
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (document.querySelector(`.${styles.panel}`)?.contains(target)) return
      closePanel()
    }
    function onViewportChange() {
      if (open) updatePanelPosition()
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (autofocus) inputRef.current?.focus()
  }, [autofocus])

  const favSet = new Set(favoriteIds)

  const panel = open && mounted ? createPortal(
    <div className={styles.panel} style={panelStyle} role="listbox">
      <div className={styles.panelHead}>
        <Clock aria-hidden="true" />
        <span>Itens encontrados</span>
        <small>{results.length} opções</small>
      </div>

      {loading && <p className={styles.status}>Buscando…</p>}
      {!loading && searchError && <p className={`${styles.status} ${styles.statusError}`}>{searchError}</p>}
      {!loading && !searchError && results.length === 0 && (
        <p className={styles.status}>
          {searchQuery.trim()
            ? (<>Nenhum alimento encontrado. <small className={styles.statusHint}>Tente termos da TBCA/TACO, ex.: <strong>pão forma glúten</strong> ou <strong>pão integral</strong>.</small></>)
            : 'Digite o nome do alimento.'}
        </p>
      )}
      {!loading && results.length > 0 && (
        <ul className={styles.list}>
          {results.map((food, idx) => (
            <li
              key={food.id}
              role="option"
              aria-selected={idx === activeIndex}
              className={`${styles.item} ${idx === activeIndex ? styles.itemActive : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectFood(food)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <div className={styles.itemMain}>
                <button
                  type="button"
                  className={`${styles.starBtn} ${favSet.has(food.id) ? styles.starBtnActive : ''}`}
                  aria-label={favSet.has(food.id) ? 'Remover dos favoritos' : 'Favoritar alimento'}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleToggleFavorite(food, e)}
                >
                  <Star aria-hidden="true" />
                </button>
                <div className={styles.itemCopy}>
                  <strong>{food.displayName || food.name}</strong>
                  <span className={styles.itemMeta}>
                    <span className={styles.badge}>{formatFoodSourceLabel(food.source)}</span>
                    Gramas
                  </span>
                  {food.displayName && food.displayName !== food.name && (
                    <small className={styles.itemSubname}>{food.name}</small>
                  )}
                </div>
              </div>
              <div className={styles.itemMacros}>
                <span className={styles.kcal}>{formatPer100gKcal(food.per100g?.caloriesKcal)} kcal</span>
                <span className={styles.macroLine}>
                  <span className={`${styles.macro} ${styles.macroC}`}>C: {formatMacro(food.per100g?.carbsG)}</span>
                  <span className={`${styles.macro} ${styles.macroP}`}>P: {formatMacro(food.per100g?.proteinG)}</span>
                  <span className={`${styles.macro} ${styles.macroF}`}>L: {formatMacro(food.per100g?.fatG)}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <footer className={styles.shortcuts}>
        <span><ArrowUpDown aria-hidden="true" /> Navegar</span>
        <span><CornerDownLeft aria-hidden="true" /> Enter Selecionar</span>
        <span>Esc Fechar</span>
      </footer>
    </div>,
    document.body,
  ) : null

  return (
    <div ref={rootRef} className={`${styles.root} ${open ? styles.rootOpen : ''}`}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleInput}
        onFocus={openPanel}
        onKeyDown={handleKeyDown}
      />
      {panel}
    </div>
  )
}
