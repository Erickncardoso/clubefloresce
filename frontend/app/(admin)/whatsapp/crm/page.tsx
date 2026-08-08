'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  User,
  UserCircle,
  Users,
} from 'lucide-react'
import { whatsappHasAuth } from '@/lib/whatsapp/api'
import {
  blockCrmContact,
  contactDisplayName,
  contactPhoneDigits,
  listCrmContacts,
  saveCrmLead,
  setCrmLabels,
  type CrmContact,
} from '@/lib/whatsapp/contacts-crm'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import styles from './crm.module.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomFieldRow {
  key: string
  value: string
}

interface LeadFormState {
  name: string
  labels: string
  notes: string
  customFields: CustomFieldRow[]
}

const PAGE_LIMIT = 50

const EMPTY_FORM: LeadFormState = {
  name: '',
  labels: '',
  notes: '',
  customFields: [],
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsappCrmPage() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [listUnsupported, setListUnsupported] = useState(false)

  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null)
  const [leadForm, setLeadForm] = useState<LeadFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [blocking, setBlocking] = useState(false)

  const loadContacts = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    if (!reset && !hasMore) return

    const nextPage = reset ? 1 : page
    loadingRef.current = true
    setLoadingList(true)
    if (reset) {
      setHasMore(true)
      setPage(1)
      setListError('')
      setListUnsupported(false)
    }

    try {
      const result = await listCrmContacts({
        page: nextPage,
        limit: PAGE_LIMIT,
        search: searchQuery.trim() || undefined,
      })

      if (result.error && result.contacts.length === 0 && reset) {
        setListError(result.error)
        setListUnsupported(Boolean(result.unsupported))
        setContacts([])
        setHasMore(false)
        setPage(1)
        return
      }

      if (result.contacts.length > 0) {
        setContacts((prev) => (reset ? result.contacts : [...prev, ...result.contacts]))
        setPage(nextPage + 1)
        setHasMore(result.contacts.length >= PAGE_LIMIT)
        setListError('')
        setListUnsupported(false)
      } else {
        if (reset) setContacts([])
        setHasMore(false)
      }
    } finally {
      loadingRef.current = false
      setLoadingList(false)
    }
  }, [hasMore, page, searchQuery])

  useEffect(() => {
    if (!whatsappHasAuth()) {
      router.replace('/login')
      return
    }
    setReady(true)
    void loadContacts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      void loadContacts(false)
    }
  }

  const selectContact = (contact: CrmContact) => {
    setSelectedContact(contact)
    const fields = contact.customFields
      ? Object.entries(contact.customFields).map(([key, value]) => ({ key, value: String(value ?? '') }))
      : []
    const labelIds = contact.labelids || contact.labels || []
    setLeadForm({
      name: contact.name || '',
      labels: Array.isArray(labelIds) ? labelIds.map(String).join(', ') : '',
      notes: contact.notes || '',
      customFields: fields,
    })
  }

  const addField = () => {
    setLeadForm((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { key: '', value: '' }],
    }))
  }

  const removeField = (index: number) => {
    setLeadForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }))
  }

  const updateField = (index: number, patch: Partial<CustomFieldRow>) => {
    setLeadForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }))
  }

  const saveLeadData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact || saving) return

    const number = contactPhoneDigits(selectedContact)
    const customFieldsObj: Record<string, string> = {}
    for (const f of leadForm.customFields) {
      const key = f.key.trim()
      if (key && f.value.trim()) customFieldsObj[key] = f.value.trim()
    }

    setSaving(true)
    try {
      const leadResult = await saveCrmLead({
        number,
        name: leadForm.name.trim(),
        notes: leadForm.notes.trim(),
        customFields: customFieldsObj,
      })

      if (!leadResult.ok) {
        window.alert(leadResult.error || 'Erro ao salvar dados do CRM.')
        return
      }

      const labelsArr = leadForm.labels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)

      if (labelsArr.length > 0) {
        const labelsResult = await setCrmLabels({ number, labelids: labelsArr })
        if (!labelsResult.ok) {
          window.alert(
            labelsResult.error ||
              'Dados do lead salvos, mas falhou ao atualizar etiquetas.',
          )
          return
        }
      }

      window.alert('Dados do CRM atualizados com sucesso!')
      setSelectedContact((prev) =>
        prev
          ? {
              ...prev,
              name: leadForm.name.trim() || prev.name,
              notes: leadForm.notes.trim(),
              customFields: customFieldsObj,
            }
          : prev,
      )
    } finally {
      setSaving(false)
    }
  }

  const handleBlock = async () => {
    if (!selectedContact || blocking) return
    const number = contactPhoneDigits(selectedContact)
    if (!window.confirm('Deseja realmente bloquear este contato?')) return

    setBlocking(true)
    try {
      const result = await blockCrmContact(number)
      if (!result.ok) {
        window.alert(result.error || 'Erro ao bloquear contato.')
        return
      }
      window.alert('Contato bloqueado com sucesso.')
    } finally {
      setBlocking(false)
    }
  }

  if (!ready) {
    return (
      <div className={`${styles.page} admin-shell`}>
        <div className={`admin-shell-card ${styles.stateBlock}`}>
          <Loader2 className={`${styles.iconLg} ${styles.spin}`} />
          <p>Carregando CRM…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.page} admin-shell`}>
      <header className={`admin-shell-header ${styles.header}`}>
        <div className={styles.headerCopy}>
          <div className={styles.titleRow}>
            <span className={styles.brandMark} aria-hidden="true">
              <WhatsAppIcon />
            </span>
            <h1>CRM e Contatos</h1>
          </div>
          <p>
            Gerencie seus leads, etiquetas e campos personalizados integrados ao WhatsApp.
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* ── Lista ─────────────────────────────────────────────────────── */}
        <section className={`admin-shell-card ${styles.listCard}`}>
          <div className={styles.listToolbar}>
            <div className={styles.searchBox}>
              <Search className={styles.iconSm} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                placeholder="Buscar por número ou nome…"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadContacts(true)
                }}
                aria-label="Buscar contatos"
              />
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              title="Atualizar lista"
              disabled={loadingList}
              onClick={() => void loadContacts(true)}
            >
              <RefreshCw className={`${styles.iconSm} ${loadingList ? styles.spin : ''}`} />
            </button>
          </div>

          {listUnsupported && (
            <p className={styles.listHint}>
              Listagem de contatos pode não ser suportada neste provedor. A interface permanece
              disponível para testes manuais.
            </p>
          )}
          {listError && !listUnsupported && (
            <p className={styles.listHint}>{listError}</p>
          )}

          {loadingList && contacts.length === 0 ? (
            <div className={styles.stateBlock}>
              <Loader2 className={`${styles.iconLg} ${styles.spin}`} />
              <p>Buscando contatos…</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className={styles.stateBlock}>
              <Users className={styles.iconLg} />
              <p>Nenhum contato encontrado.</p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className={styles.contactsScroll}
              onScroll={handleScroll}
            >
              {contacts.map((contact) => {
                const active = selectedContact?.id === contact.id
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`${styles.contactCard} ${active ? styles.contactCardActive : ''}`}
                    onClick={() => selectContact(contact)}
                  >
                    <span className={styles.contactAvatar} aria-hidden="true">
                      <User className={styles.iconMd} />
                    </span>
                    <span className={styles.contactInfo}>
                      <h4>{contactDisplayName(contact)}</h4>
                      <p>{contactPhoneDigits(contact)}</p>
                    </span>
                  </button>
                )
              })}
              {loadingList && (
                <div className={styles.loadingMore}>Carregando mais…</div>
              )}
            </div>
          )}
        </section>

        {/* ── Detalhe ───────────────────────────────────────────────────── */}
        <section className={`admin-shell-card ${styles.detailCard}`}>
          {!selectedContact ? (
            <div className={styles.stateBlock}>
              <UserCircle className={styles.iconLg} />
              <h3>Selecione um contato</h3>
              <p>
                Clique em um contato na lista para enriquecer os dados e gerenciar o
                relacionamento.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailIdentity}>
                  <span className={styles.bigAvatar} aria-hidden="true">
                    <User className={styles.iconLg} />
                  </span>
                  <div>
                    <h2>{contactDisplayName(selectedContact)}</h2>
                    <p className={styles.phoneMono}>{contactPhoneDigits(selectedContact)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn-secondary ${styles.btn} ${styles.btnBlock}`}
                  disabled={blocking}
                  onClick={() => void handleBlock()}
                >
                  {blocking ? (
                    <Loader2 className={`${styles.iconSm} ${styles.spin}`} />
                  ) : null}
                  Bloquear
                </button>
              </div>

              <h3 className={styles.sectionTitle}>
                <Database className={styles.iconSm} />
                Dados do Lead (CRM)
              </h3>

              <form className={styles.crmForm} onSubmit={(e) => void saveLeadData(e)}>
                <div className={styles.formRow}>
                  <div className="field field--float">
                    <label htmlFor="crm-name">Nome CRM (Sobrescreve o do zap)</label>
                    <input
                      id="crm-name"
                      type="text"
                      value={leadForm.name}
                      placeholder="Nome completo"
                      onChange={(e) =>
                        setLeadForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field field--float">
                    <label htmlFor="crm-labels">Etiquetas (IDs separados por vírgula)</label>
                    <input
                      id="crm-labels"
                      type="text"
                      value={leadForm.labels}
                      placeholder="Ex: 10,20"
                      onChange={(e) =>
                        setLeadForm((prev) => ({ ...prev, labels: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className={styles.fieldGroupLabel}>Campos Personalizados (Custom Fields)</p>
                  <div className={styles.customFields}>
                    {leadForm.customFields.map((field, index) => (
                      <div key={`cf-${index}`} className={styles.customFieldRow}>
                        <div className="field field--float" style={{ margin: 0 }}>
                          <label htmlFor={`crm-cf-key-${index}`}>Nome do campo</label>
                          <input
                            id={`crm-cf-key-${index}`}
                            type="text"
                            value={field.key}
                            placeholder="ex: email"
                            onChange={(e) => updateField(index, { key: e.target.value })}
                          />
                        </div>
                        <div className="field field--float" style={{ margin: 0 }}>
                          <label htmlFor={`crm-cf-val-${index}`}>Valor</label>
                          <input
                            id={`crm-cf-val-${index}`}
                            type="text"
                            value={field.value}
                            placeholder="ex: joao@gmail.com"
                            onChange={(e) => updateField(index, { value: e.target.value })}
                          />
                        </div>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Remover campo"
                          onClick={() => removeField(index)}
                        >
                          <Trash2 className={`${styles.iconSm} ${styles.dangerIcon}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className={styles.ghostBtn} onClick={addField}>
                    <Plus className={styles.iconSm} />
                    Adicionar Campo
                  </button>
                </div>

                <div className="field field--float">
                  <label htmlFor="crm-notes">Observações do Atendente</label>
                  <textarea
                    id="crm-notes"
                    rows={3}
                    value={leadForm.notes}
                    placeholder="Cliente entrou em contato sobre…"
                    onChange={(e) =>
                      setLeadForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={`btn-primary ${styles.btn}`} disabled={saving}>
                    {saving ? (
                      <Loader2 className={`${styles.iconSm} ${styles.spin}`} />
                    ) : (
                      <Save className={styles.iconSm} />
                    )}
                    Salvar Dados do CRM
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
