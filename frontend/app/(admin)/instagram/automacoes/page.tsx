'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { TileActionsMenu } from '@/components/courses/TileActionsMenu'
import {
  AutomationFlowBuilder,
  type AutomationFormState,
} from '@/components/instagram/AutomationFlowBuilder'
import {
  ApiError,
  createInstagramAutomation,
  deleteInstagramAutomation,
  fetchInstagramAutomations,
  fetchInstagramMedia,
  toggleInstagramAutomation,
  updateInstagramAutomation,
  type InstagramAutomation,
  type InstagramAutomationPayload,
  type InstagramMediaItem,
} from '@/lib/instagram/api'
import styles from './automacoes.module.scss'

function emptyForm(): AutomationFormState {
  return {
    name: '',
    active: true,
    triggerComment: true,
    triggerStory: false,
    triggerDm: false,
    matchType: 'CONTAINS',
    targetMediaId: '',
    welcomeMessage: '',
    quickReplyLabel: 'Quero o link!',
    linkText: '',
    linkButtonLabel: 'Acessar',
    linkUrl: '',
    reminderText: '',
    reminderDelayMinutes: 60,
  }
}

export default function InstagramAutomacoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [automations, setAutomations] = useState<InstagramAutomation[]>([])
  const [media, setMedia] = useState<InstagramMediaItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AutomationFormState>(emptyForm)
  const [keywordsText, setKeywordsText] = useState('')
  const [publicRepliesText, setPublicRepliesText] = useState('')
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadAutomations = useCallback(async () => {
    setLoading(true)
    try {
      setAutomations(await fetchInstagramAutomations())
    } catch {
      setFlash({ type: 'err', text: 'Não foi possível carregar as automações.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadAutomations(), fetchInstagramMedia().then(setMedia)])
  }, [loadAutomations])

  function patchForm<K extends keyof AutomationFormState>(
    key: K,
    value: AutomationFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function startCreate() {
    setForm(emptyForm())
    setKeywordsText('')
    setPublicRepliesText('')
    setEditingId(null)
    setShowForm(true)
    setFlash(null)
  }

  function startEdit(automation: InstagramAutomation) {
    setForm({
      ...emptyForm(),
      name: automation.name,
      active: automation.active,
      triggerComment: automation.triggerComment,
      triggerStory: automation.triggerStory,
      triggerDm: automation.triggerDm,
      matchType: automation.matchType === 'EXACT' ? 'EXACT' : 'CONTAINS',
      targetMediaId: automation.targetMediaId || '',
      welcomeMessage: automation.welcomeMessage || '',
      quickReplyLabel: automation.quickReplyLabel || 'Quero o link!',
      linkText: automation.linkText || '',
      linkButtonLabel: automation.linkButtonLabel || 'Acessar',
      linkUrl: automation.linkUrl || '',
      reminderText: automation.reminderText || '',
      reminderDelayMinutes: Number(automation.reminderDelayMinutes || 60),
    })
    setKeywordsText((automation.keywords || []).join(', '))
    setPublicRepliesText((automation.publicReplyVariations || []).join('\n'))
    setEditingId(automation.id)
    setShowForm(true)
    setFlash(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
  }

  function buildPayload(): InstagramAutomationPayload {
    return {
      ...form,
      targetMediaId: form.targetMediaId || null,
      keywords: keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      publicReplyVariations: publicRepliesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    }
  }

  async function save() {
    const payload = buildPayload()
    if (!payload.name) {
      setFlash({ type: 'err', text: 'Dê um nome para a automação.' })
      return
    }
    if (!payload.keywords.length) {
      setFlash({ type: 'err', text: 'Informe ao menos uma palavra-chave.' })
      return
    }
    if (!payload.welcomeMessage.trim()) {
      setFlash({ type: 'err', text: 'Escreva a mensagem de boas-vindas.' })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateInstagramAutomation(editingId, payload)
        setFlash({ type: 'ok', text: 'Automação atualizada.' })
      } else {
        await createInstagramAutomation(payload)
        setFlash({ type: 'ok', text: 'Automação criada!' })
      }
      setShowForm(false)
      await loadAutomations()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Falha ao salvar a automação.'
      setFlash({ type: 'err', text: message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(automation: InstagramAutomation) {
    try {
      await toggleInstagramAutomation(automation.id, !automation.active)
      await loadAutomations()
    } catch {
      setFlash({ type: 'err', text: 'Falha ao alterar o status.' })
    }
  }

  async function remove(automation: InstagramAutomation) {
    if (!window.confirm(`Excluir a automação "${automation.name}"?`)) return
    try {
      await deleteInstagramAutomation(automation.id)
      setFlash({ type: 'ok', text: 'Automação excluída.' })
      await loadAutomations()
    } catch {
      setFlash({ type: 'err', text: 'Falha ao excluir.' })
    }
  }

  if (showForm) {
    return (
      <div className={styles.page} style={{ maxWidth: '100%' }}>
        {flash ? (
          <div
            className={`${styles.flash} ${flash.type === 'ok' ? styles.flashOk : styles.flashErr}`}
            role="status"
          >
            {flash.text}
          </div>
        ) : null}
        <AutomationFlowBuilder
          editingId={editingId}
          form={form}
          keywordsText={keywordsText}
          publicRepliesText={publicRepliesText}
          media={media}
          saving={saving}
          onPatch={patchForm}
          onKeywordsChange={setKeywordsText}
          onPublicRepliesChange={setPublicRepliesText}
          onCancel={cancelForm}
          onSave={() => void save()}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Automações do Instagram</h1>
          <p>Palavra-chave no comentário, story ou DM → mensagem automática com seu link.</p>
        </div>
        <button type="button" className="btn-primary" onClick={startCreate}>
          Nova automação
        </button>
      </header>

      {flash ? (
        <div
          className={`${styles.flash} ${flash.type === 'ok' ? styles.flashOk : styles.flashErr}`}
          role="status"
        >
          {flash.text}
        </div>
      ) : null}

      <section className={styles.list}>
        {loading ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <Loader2 className={styles.spin} size={32} aria-hidden />
            <p>Carregando automações…</p>
          </div>
        ) : !automations.length ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <Zap size={32} aria-hidden />
            <h2>Nenhuma automação ainda</h2>
            <p>
              Crie a primeira: escolha uma palavra-chave e a mensagem que a pessoa recebe na DM.
            </p>
            <button type="button" className="btn-primary" onClick={startCreate}>
              Criar automação
            </button>
          </div>
        ) : (
          automations.map((automation) => (
            <article key={automation.id} className={`${styles.card} ${styles.item}`}>
              <div className={styles.itemMain}>
                <div className={styles.itemHead}>
                  <h2>{automation.name}</h2>
                  <span
                    className={`${styles.badge} ${automation.active ? styles.badgeOn : styles.badgeOff}`}
                  >
                    {automation.active ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
                <p className={styles.keywords}>
                  <strong>Palavras:</strong>
                  {(automation.keywords || []).map((keyword) => (
                    <span key={keyword} className={styles.chip}>
                      {keyword}
                    </span>
                  ))}
                </p>
                <p className={styles.meta}>
                  {automation.targetMediaId ? 'Post específico' : 'Todos os posts'}
                </p>
                <div className={styles.triggerPills}>
                  {automation.triggerComment ? (
                    <span className={styles.triggerPill}>Comentários</span>
                  ) : null}
                  {automation.triggerStory ? (
                    <span className={styles.triggerPill}>Stories</span>
                  ) : null}
                  {automation.triggerDm ? (
                    <span className={styles.triggerPill}>DMs</span>
                  ) : null}
                </div>
              </div>

              <TileActionsMenu menuKey={`iga-${automation.id}`}>
                <button
                  type="button"
                  className="cf-tile-actions-item cf-tile-actions-item--edit"
                  role="menuitem"
                  onClick={() => startEdit(automation)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="cf-tile-actions-item"
                  role="menuitem"
                  onClick={() => void toggleActive(automation)}
                >
                  {automation.active ? 'Pausar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  className="cf-tile-actions-item cf-tile-actions-item--danger"
                  role="menuitem"
                  onClick={() => void remove(automation)}
                >
                  Excluir
                </button>
              </TileActionsMenu>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
