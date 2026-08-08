'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Loader, X } from 'lucide-react'
import {
  BROADCAST_DELAY_PRESETS,
  BROADCAST_FLOW_OPTIONS,
  filterDispatchContactsBySearch,
  filterDispatchContactsBySegment,
  type BroadcastFormPayload,
  type DelayPreset,
  type DispatchContact,
  type SegmentFilter,
} from '@/lib/whatsapp/dispatch-contacts'
import styles from './WhatsappBroadcastCreateModal.module.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhatsappLabel {
  id: string
  name: string
  colorHex: string
}

interface Props {
  open: boolean
  contacts: DispatchContact[]
  selectedIds: string[]
  searchQuery: string
  loadingContacts: boolean
  submitting: boolean
  labels?: WhatsappLabel[]
  onClose: () => void
  onToggleContact: (id: string) => void
  onUpdateSearchQuery: (q: string) => void
  onResetSelection: () => void
  onSubmit: (payload: BroadcastFormPayload) => void
}

interface FormState {
  info: string
  flowId: string
  text: string
  delayMode: 'smart' | 'manual'
  delayPreset: string
  manualDelaySeconds: number
  scheduleLater: boolean
  scheduledAt: string
}

const defaultForm = (): FormState => ({
  info: '',
  flowId: 'text',
  text: '',
  delayMode: 'smart',
  delayPreset: 'very_short',
  manualDelaySeconds: 20,
  scheduleLater: false,
  scheduledAt: '',
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scheduleMinValue(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function resolveDelayRange(form: FormState): { delayMin: number; delayMax: number } {
  if (form.delayMode === 'manual') {
    const seconds = Math.max(1, form.manualDelaySeconds || 1)
    return { delayMin: seconds, delayMax: seconds }
  }
  const preset: DelayPreset =
    BROADCAST_DELAY_PRESETS.find((p) => p.id === form.delayPreset) ?? BROADCAST_DELAY_PRESETS[0]
  return { delayMin: preset.min, delayMax: preset.max }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsappBroadcastCreateModal({
  open,
  contacts,
  selectedIds,
  searchQuery,
  loadingContacts,
  submitting,
  labels = [],
  onClose,
  onToggleContact,
  onUpdateSearchQuery,
  onResetSelection,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [segmentFilters, setSegmentFilters] = useState<SegmentFilter[]>([])
  const [applyFiltersTogether, setApplyFiltersTogether] = useState(true)
  const [showContacts, setShowContacts] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [appliedSearch, setAppliedSearch] = useState('')
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const filterMenuAltRef = useRef<HTMLDivElement>(null)

  const resetForm = useCallback(() => {
    setForm(defaultForm())
    setSegmentFilters([])
    setApplyFiltersTogether(true)
    setShowContacts(false)
    setFilterMenuOpen(false)
    setLabelPickerOpen(false)
    setAppliedSearch('')
  }, [])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const refs = [filterMenuRef.current, filterMenuAltRef.current].filter(Boolean)
      if (refs.some((r) => r?.contains(e.target as Node))) return
      setFilterMenuOpen(false)
      setLabelPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const segmentedContacts = filterDispatchContactsBySegment(contacts, segmentFilters, applyFiltersTogether)
  const pickerPool = segmentFilters.length ? segmentedContacts : contacts
  const filteredContacts = filterDispatchContactsBySearch(pickerPool, appliedSearch)

  const selectedSet = new Set(selectedIds)
  const allowedIds = new Set(pickerPool.map((c) => c.id))
  const recipientCount = selectedIds.filter((id) => allowedIds.has(id)).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { delayMin, delayMax } = resolveDelayRange(form)
    const recipientJids = pickerPool
      .filter((c) => selectedSet.has(c.id))
      .map((c) => c.jid)
      .filter(Boolean)

    onSubmit({
      info: form.info.trim(),
      text: form.text.trim(),
      flowId: form.flowId,
      delayMin,
      delayMax,
      scheduleLater: form.scheduleLater,
      scheduledAt: form.scheduledAt,
      segmentFilters: [...segmentFilters],
      applyFiltersTogether,
      recipientJids,
    })
  }

  const addLabelFilter = (label: WhatsappLabel) => {
    if (!label?.id) return
    if (segmentFilters.some((f) => f.type === 'label' && f.labelId === label.id)) return
    setSegmentFilters((prev) => [
      ...prev,
      { id: `label-${label.id}-${Date.now()}`, type: 'label', labelId: label.id, labelName: label.name },
    ])
    setFilterMenuOpen(false)
    setLabelPickerOpen(false)
    onResetSelection()
  }

  const removeFilter = (id: string) => {
    setSegmentFilters((prev) => prev.filter((f) => f.id !== id))
    onResetSelection()
  }

  const resetFilters = () => {
    setSegmentFilters([])
    setFilterMenuOpen(false)
    setLabelPickerOpen(false)
    onResetSelection()
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-labelledby="broadcast-modal-title">
        <header className={styles.header}>
          <h2 id="broadcast-modal-title">Criar Transmissão</h2>
          <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <div className={styles.columns}>
            {/* ── Painel Configurações ── */}
            <section className={`${styles.panel} ${styles.panelSettings}`}>
              <div className={styles.fields}>
                <div className={styles.fieldFloat}>
                  <label htmlFor="bc-name">Nome</label>
                  <input
                    id="bc-name"
                    type="text"
                    className={`${styles.input} ${styles.withLabel}`}
                    placeholder="Nome"
                    required
                    value={form.info}
                    onChange={(e) => setForm((f) => ({ ...f, info: e.target.value }))}
                  />
                </div>

                <div className={styles.fieldFloat}>
                  <label htmlFor="bc-flow">Fluxo</label>
                  <select
                    id="bc-flow"
                    className={`${styles.select} ${styles.withLabel}`}
                    value={form.flowId}
                    onChange={(e) => setForm((f) => ({ ...f, flowId: e.target.value }))}
                  >
                    {BROADCAST_FLOW_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {form.flowId === 'text' && (
                  <div className={styles.fieldFloat}>
                    <label htmlFor="bc-message">Mensagem</label>
                    <textarea
                      id="bc-message"
                      className={`${styles.textarea} ${styles.withLabel}`}
                      rows={3}
                      placeholder="Digite a mensagem da transmissão..."
                      required
                      value={form.text}
                      onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                    />
                  </div>
                )}

                <div className={styles.delayField}>
                  <span className={styles.delayTitle}>Atraso</span>

                  <div className={styles.delayModeRow}>
                    <label className={styles.radio}>
                      <input
                        type="radio"
                        value="smart"
                        checked={form.delayMode === 'smart'}
                        onChange={() => setForm((f) => ({ ...f, delayMode: 'smart' }))}
                      />
                      <span>Atraso inteligente</span>
                    </label>
                    <label className={styles.radio}>
                      <input
                        type="radio"
                        value="manual"
                        checked={form.delayMode === 'manual'}
                        onChange={() => setForm((f) => ({ ...f, delayMode: 'manual' }))}
                      />
                      <span>Atraso manual</span>
                    </label>
                  </div>

                  <p className={styles.helpText}>
                    Defina o atraso com o qual sua transmissão funcionará. Quanto maior o atraso,
                    menos provável que seja confundida com spam, mas transmissões grandes podem levar mais tempo.
                  </p>

                  {form.delayMode === 'smart' ? (
                    <div>
                      {BROADCAST_DELAY_PRESETS.map((preset) => (
                        <label key={preset.id} className={`${styles.radio} ${styles.radioBlock}`}>
                          <input
                            type="radio"
                            value={preset.id}
                            checked={form.delayPreset === preset.id}
                            onChange={() => setForm((f) => ({ ...f, delayPreset: preset.id }))}
                          />
                          <span>{preset.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.manualDelay}>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        className={`${styles.input} ${styles.manualDelayInput}`}
                        value={form.manualDelaySeconds}
                        onChange={(e) => setForm((f) => ({ ...f, manualDelaySeconds: Number(e.target.value) }))}
                        required
                      />
                      <span className={styles.manualDelaySuffix}>Segundos</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Painel Segmentação ── */}
            <section className={`${styles.panel} ${styles.panelSegment}`}>
              <div className={styles.segHead}>
                <h3>Segmentação</h3>
                <button
                  type="button"
                  className={styles.segLink}
                  onClick={() => setShowContacts((v) => !v)}
                >
                  {showContacts ? 'Ocultar pacientes' : 'Mostrar pacientes'}
                </button>
              </div>

              <p className={styles.segCount}>
                Pacientes que receberão esta transmissão:{' '}
                <strong>{recipientCount}</strong>
              </p>

              {segmentFilters.length > 0 && (
                <div className={styles.segToolbar}>
                  <div ref={filterMenuAltRef} className={styles.filterMenuWrap}>
                    <button
                      type="button"
                      className={styles.filterAdd}
                      onClick={(e) => { e.stopPropagation(); setFilterMenuOpen((v) => !v); setLabelPickerOpen(false) }}
                    >
                      Adicionar filtro
                    </button>
                    {filterMenuOpen && (
                      <FilterMenu
                        labels={labels}
                        labelPickerOpen={labelPickerOpen}
                        onOpenLabelPicker={() => setLabelPickerOpen(true)}
                        onAddLabel={addLabelFilter}
                        styles={styles}
                      />
                    )}
                  </div>

                  <label className={`${styles.toggle} ${applyFiltersTogether ? styles.toggleChecked : ''}`}>
                    <input
                      type="checkbox"
                      checked={applyFiltersTogether}
                      onChange={(e) => setApplyFiltersTogether(e.target.checked)}
                    />
                    <span className={styles.toggleTrack} aria-hidden="true" />
                    <span>Aplicar filtros juntos</span>
                  </label>

                  <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                    <X />
                    Redefinir tudo
                  </button>
                </div>
              )}

              {segmentFilters.length > 0 && (
                <div className={styles.filterTags}>
                  {segmentFilters.map((f) => (
                    <span key={f.id} className={styles.filterTag}>
                      {f.type === 'label' ? `Etiqueta: ${f.labelName}` : f.labelName}
                      <button type="button" aria-label="Remover filtro" onClick={() => removeFilter(f.id)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {showContacts ? (
                <div>
                  <div className={styles.contactSearch}>
                    <input
                      type="text"
                      className={styles.contactSearchInput}
                      placeholder="Buscar contato..."
                      value={searchQuery}
                      onChange={(e) => onUpdateSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setAppliedSearch(searchQuery.trim()) } }}
                    />
                    <button
                      type="button"
                      className={styles.filterAdd}
                      onClick={() => setAppliedSearch(searchQuery.trim())}
                    >
                      Buscar
                    </button>
                  </div>
                  <ContactList
                    contacts={filteredContacts}
                    selectedSet={selectedSet}
                    loading={loadingContacts}
                    onToggle={onToggleContact}
                    styles={styles}
                  />
                </div>
              ) : segmentFilters.length === 0 ? (
                <div className={styles.segEmpty}>
                  <p>Adicionar filtros para refinar seu público</p>
                  <div ref={filterMenuRef} className={styles.filterMenuWrap}>
                    <button
                      type="button"
                      className={`${styles.filterAdd} ${styles.filterAddDashed}`}
                      onClick={(e) => { e.stopPropagation(); setFilterMenuOpen((v) => !v); setLabelPickerOpen(false) }}
                    >
                      Adicionar filtro
                    </button>
                    {filterMenuOpen && (
                      <FilterMenu
                        labels={labels}
                        labelPickerOpen={labelPickerOpen}
                        onOpenLabelPicker={() => setLabelPickerOpen(true)}
                        onAddLabel={addLabelFilter}
                        styles={styles}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          {/* ── Footer ── */}
          <footer className={styles.footer}>
            <label className={styles.scheduleCheck}>
              <input
                type="checkbox"
                checked={form.scheduleLater}
                onChange={(e) => setForm((f) => ({ ...f, scheduleLater: e.target.checked }))}
              />
              <span>Definir hora e executar depois</span>
            </label>

            <div className={styles.footerRight}>
              {form.scheduleLater && (
                <div className={styles.scheduleField}>
                  <label htmlFor="bc-scheduled-at">Agendar para</label>
                  <input
                    id="bc-scheduled-at"
                    type="datetime-local"
                    className={styles.scheduleInput}
                    min={scheduleMinValue()}
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  />
                </div>
              )}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || recipientCount === 0}
              >
                {submitting && <Loader className={styles.spin} />}
                Iniciar agora
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FilterMenuProps {
  labels: WhatsappLabel[]
  labelPickerOpen: boolean
  onOpenLabelPicker: () => void
  onAddLabel: (label: WhatsappLabel) => void
  styles: Record<string, string>
}

function FilterMenu({ labels, labelPickerOpen, onOpenLabelPicker, onAddLabel, styles }: FilterMenuProps) {
  return (
    <div className={styles.filterMenu}>
      <p className={styles.filterMenuSection}>Adicionar filtros</p>
      <button
        type="button"
        className={styles.filterMenuItem}
        onClick={(e) => { e.stopPropagation(); onOpenLabelPicker() }}
      >
        Etiqueta
        <ChevronRight />
      </button>
      {['Sequências', 'Telefone', 'Data criação', 'Campo personalizado'].map((item) => (
        <button
          key={item}
          type="button"
          className={styles.filterMenuItem}
          disabled
        >
          {item}
          <ChevronRight />
        </button>
      ))}
      {labelPickerOpen && (
        <div className={`${styles.submenu} ${styles.submenuOpen}`}>
          {labels.length === 0 ? (
            <p className={styles.submenuEmpty}>Nenhuma etiqueta cadastrada.</p>
          ) : (
            labels.map((label) => (
              <button
                key={label.id}
                type="button"
                className={styles.submenuItem}
                onClick={(e) => { e.stopPropagation(); onAddLabel(label) }}
              >
                <span className={styles.submenuDot} style={{ background: label.colorHex }} />
                {label.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface ContactListProps {
  contacts: DispatchContact[]
  selectedSet: Set<string>
  loading: boolean
  onToggle: (id: string) => void
  styles: Record<string, string>
}

function ContactList({ contacts, selectedSet, loading, onToggle, styles }: ContactListProps) {
  if (loading) {
    return (
      <div className={styles.contactsLoading}>
        <Loader className={styles.spin} style={{ width: 18, height: 18 }} />
        Carregando contatos...
      </div>
    )
  }
  if (contacts.length === 0) {
    return <div className={styles.contactsEmpty}>Nenhum contato encontrado.</div>
  }
  return (
    <div className={styles.contactList}>
      {contacts.map((contact) => {
        const selected = selectedSet.has(contact.id)
        const initial = String(contact.name || '?').charAt(0).toUpperCase()
        return (
          <div
            key={contact.id}
            className={`${styles.contactItem} ${selected ? styles.contactItemSelected : ''}`}
            onClick={() => onToggle(contact.id)}
          >
            <div className={styles.contactAvatar}>
              {contact.avatarUrl ? (
                <img src={contact.avatarUrl} alt={contact.name} />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className={styles.contactMeta}>
              <strong>{contact.name}</strong>
              <small>{contact.displayNumber}</small>
            </div>
            <div className={`${styles.contactCheck} ${selected ? styles.contactCheckSelected : ''}`}>
              {selected && <Check />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
