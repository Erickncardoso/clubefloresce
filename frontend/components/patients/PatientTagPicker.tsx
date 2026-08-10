'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { Check, ChevronDown, ChevronLeft, Plus, Search, Trash2, X } from 'lucide-react'
import { AnimatedPopover, AppModal } from '@/components/overlays'
import { ApiError, apiFetch } from '@/lib/api'
import type { PatientTagItem } from '@/lib/quick-add-patient'
import styles from './PatientTagPicker.module.scss'

const TAG_COLORS = [
  '#8B967C',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#0891B2',
  '#2563EB',
  '#4F46E5',
  '#DB2777',
  '#64748B',
  '#92400E',
]

type CatalogTag = {
  id: string
  name: string
  color: string
}

type Props = {
  value: PatientTagItem[]
  onChange: (next: PatientTagItem[]) => void
  placeholder?: string
}

export type PatientTagPickerHandle = {
  openMenu: () => void
}

function softColor(hex?: string) {
  const color = String(hex || '#64748B')
  return `${color}22`
}

function normalizeTagColor(value?: string) {
  const raw = String(value || '').trim().toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw
  return TAG_COLORS[0]
}

function toTagItem(tag: { id?: string; name: string; color?: string }): PatientTagItem {
  return {
    id: tag.id,
    name: tag.name,
    color: normalizeTagColor(tag.color),
  }
}

function sameTag(a: { id?: string; name: string }, b: { id?: string; name: string }) {
  return a.id === b.id || a.name.toLowerCase() === b.name.toLowerCase()
}

export const PatientTagPicker = forwardRef<PatientTagPickerHandle, Props>(
  function PatientTagPicker(
  {
  value,
  onChange,
  placeholder = 'Pesquise/Selecione',
},
  ref,
) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [menuError, setMenuError] = useState('')
  const [createError, setCreateError] = useState('')
  const [search, setSearch] = useState('')
  const [catalog, setCatalog] = useState<CatalogTag[]>([])
  const [createName, setCreateName] = useState('')
  const [createColor, setCreateColor] = useState(TAG_COLORS[0])

  const filteredCatalog = (() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((tag) => tag.name.toLowerCase().includes(q))
  })()

  useEffect(() => {
    if (!menuOpen) return
    const t = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [menuOpen])

  function isSelected(tag: { id?: string; name: string }) {
    return value.some((item) => sameTag(item, tag))
  }

  function removeTag(tag: { id?: string; name: string }) {
    onChange(value.filter((item) => !sameTag(item, tag)))
  }

  function toggleTag(tag: CatalogTag) {
    if (isSelected(tag)) {
      removeTag(tag)
      return
    }
    if (value.length >= 20) return
    onChange([...value, toTagItem(tag)])
  }

  async function loadCatalog() {
    setLoading(true)
    setMenuError('')
    try {
      const data = await apiFetch<{ tags?: CatalogTag[] }>('/users/patient-tags')
      setCatalog(Array.isArray(data?.tags) ? data.tags : [])
    } catch {
      setCatalog([])
    } finally {
      setLoading(false)
    }
  }

  async function handleMenuOpenChange(next: boolean) {
    setMenuOpen(next)
    if (next) {
      setSearch('')
      setMenuError('')
      await loadCatalog()
    }
  }

  useImperativeHandle(ref, () => ({
    openMenu: () => {
      void handleMenuOpenChange(true)
    },
  }))

  async function deleteCatalogTag(tag: CatalogTag, event: MouseEvent) {
    event.stopPropagation()
    if (!tag?.id || deletingId) return
    const ok = window.confirm(`Excluir a tag "${tag.name}"?`)
    if (!ok) return

    setDeletingId(tag.id)
    setMenuError('')
    try {
      await apiFetch(`/users/patient-tags/${encodeURIComponent(tag.id)}`, {
        method: 'DELETE',
      })
      setCatalog((prev) => prev.filter((item) => item.id !== tag.id))
      removeTag(tag)
    } catch (err) {
      setMenuError(err instanceof ApiError ? err.message : 'Erro ao excluir tag.')
    } finally {
      setDeletingId('')
    }
  }

  function openCreate() {
    setCreateName(search.trim())
    setCreateColor(TAG_COLORS[0])
    setCreateError('')
    setCreateOpen(true)
    setMenuOpen(false)
  }

  async function submitCreate() {
    const name = createName.trim()
    if (!name) return
    setCreating(true)
    setCreateError('')
    try {
      const data = await apiFetch<{ tag?: CatalogTag }>('/users/patient-tags', {
        method: 'POST',
        body: JSON.stringify({ name, color: normalizeTagColor(createColor) }),
      })
      const tag = data?.tag
      if (tag) {
        const saved = toTagItem(tag)
        setCatalog((prev) =>
          [...prev.filter((item) => item.id !== saved.id), { ...saved, id: saved.id || tag.id }]
            .filter((item): item is CatalogTag => Boolean(item.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        )
        if (!isSelected(saved) && value.length < 20) {
          onChange([...value, saved])
        }
      }
      setCreateOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setCreateError('Sessão expirada. Faça login novamente.')
        } else if (err.message) {
          setCreateError(err.message)
        } else if (err.status >= 500) {
          setCreateError('Servidor indisponível. Tente novamente em instantes.')
        } else {
          setCreateError('Erro ao criar tag.')
        }
      } else {
        setCreateError('Servidor indisponível. Tente novamente em instantes.')
      }
    } finally {
      setCreating(false)
    }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setMenuOpen(false)
    }
  }

  return (
    <div className={styles.root}>
      <AnimatedPopover
        open={menuOpen}
        onOpenChange={handleMenuOpenChange}
        side="bottom"
        align="start"
        sideOffset={6}
        contentClassName={styles.menu}
        trigger={
          <div
            role="button"
            tabIndex={0}
            className={`${styles.field} cf-squircle cf-squircle--control ${menuOpen ? styles.fieldOpen : ''}`}
            aria-expanded={menuOpen}
            aria-label={value.length ? 'Adicionar tag' : placeholder}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                void handleMenuOpenChange(!menuOpen)
              }
            }}
          >
            <div className={styles.selected}>
              {value.map((tag) => (
                <span
                  key={tag.id || tag.name}
                  className={styles.chip}
                  style={{
                    background: softColor(tag.color),
                    color: tag.color || '#64748B',
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {tag.name}
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label="Remover tag"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeTag(tag)
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {!value.length ? <span className={styles.placeholder}>{placeholder}</span> : null}
            </div>
            <span className={styles.trigger} aria-hidden>
              <ChevronDown size={16} className={styles.triggerSvg} />
            </span>
          </div>
        }
      >
        <div role="listbox">
          <div className={styles.menuHead}>Selecionar Tags</div>

          <div className={styles.search}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={searchRef}
              className={styles.searchInput}
              type="search"
              value={search}
              placeholder="Buscar tags..."
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </div>

          <div className={styles.menuBody}>
            {loading ? (
              <p className={styles.empty}>Carregando…</p>
            ) : !filteredCatalog.length ? (
              <p className={styles.empty}>Nenhuma tag criada.</p>
            ) : (
              filteredCatalog.map((tag) => {
                const active = isSelected(tag)
                return (
                  <div
                    key={tag.id}
                    role="option"
                    tabIndex={0}
                    className={`${styles.option} ${active ? styles.optionActive : ''}`}
                    aria-selected={active}
                    onClick={() => toggleTag(tag)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleTag(tag)
                      }
                    }}
                  >
                    <span className={styles.dot} style={{ background: tag.color }} />
                    <span className={styles.optionName}>{tag.name}</span>
                    <span className={styles.optionActions}>
                      {active ? <Check size={14} className={styles.check} /> : null}
                      <button
                        type="button"
                        className={styles.optionDelete}
                        aria-label={`Excluir tag ${tag.name}`}
                        disabled={deletingId === tag.id}
                        onClick={(event) => deleteCatalogTag(tag, event)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {menuError ? <p className={styles.menuError}>{menuError}</p> : null}

          <button type="button" className={styles.createRow} onClick={openCreate}>
            <Plus size={15} />
            Criar tag
          </button>
        </div>
      </AnimatedPopover>

      <AppModal open={createOpen} onOpenChange={setCreateOpen} title="Criar Tag">
        <div className={styles.createBody}>
          <button type="button" className={styles.back} onClick={() => setCreateOpen(false)}>
            <ChevronLeft size={14} />
            Voltar
          </button>

          <div className="field field--float">
            <label htmlFor="ptp-name">Nome</label>
            <input
              id="ptp-name"
              value={createName}
              maxLength={40}
              placeholder="Ex: VIP"
              onChange={(event) => setCreateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submitCreate()
                }
              }}
            />
          </div>

          <div>
            <span className={styles.colorsLabel}>Cor</span>
            <div className={styles.swatches}>
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.swatch} ${createColor === color ? styles.swatchActive : ''}`}
                  style={{ background: color }}
                  aria-label={`Cor ${color}`}
                  onClick={() => setCreateColor(color)}
                />
              ))}
            </div>
          </div>

          {createError ? <p className={styles.createError}>{createError}</p> : null}

          <button
            type="button"
            className={`btn-primary ${styles.createSubmit}`}
            disabled={creating || !createName.trim()}
            onClick={() => void submitCreate()}
          >
            {creating ? 'Criando…' : 'Criar Tag'}
          </button>
        </div>
      </AppModal>
    </div>
  )
})
