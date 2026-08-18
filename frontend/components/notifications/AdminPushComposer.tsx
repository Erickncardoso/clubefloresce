'use client'

import { type FormEvent, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { FloatField } from '@/components/ui/FloatField'
import {
  ADMIN_PUSH_AUDIENCES,
  ADMIN_PUSH_BUTTONS,
  ADMIN_PUSH_DESTINATIONS,
  ADMIN_PUSH_TYPES,
  sendAdminPush,
  uploadAdminPushImage,
} from '@/lib/admin-push'
import styles from './AdminPushComposer.module.scss'

const SEARCH_MIN = 2
const VISIBLE_LIMIT = 80

type Patient = { id: string; name: string }

type Props = {
  patients: Patient[]
  initialUserId?: string
  onSubmitted?: () => void
}

export function AdminPushComposer({ patients, initialUserId, onSubmitted }: Props) {
  const [title, setTitle] = useState('Isabella Jardim')
  const [body, setBody] = useState('')
  const [type, setType] = useState('general')
  const [actionPath, setActionPath] = useState('/inicio')
  const [buttonKey, setButtonKey] = useState('')
  const [audience, setAudience] = useState(initialUserId ? 'one' : 'all')
  const [userIds, setUserIds] = useState<string[]>(initialUserId ? [initialUserId] : [])
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')

  const needsPicker = audience === 'one' || audience === 'selected'
  const selected = useMemo(
    () => patients.filter((patient) => userIds.includes(patient.id)),
    [patients, userIds],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const all = patients
    if (all.length > VISIBLE_LIMIT && query.length < SEARCH_MIN) return []
    if (!query) return all
    return all.filter((patient) => patient.name.toLowerCase().includes(query))
  }, [patients, search])

  const visible = filtered.slice(0, VISIBLE_LIMIT)

  function togglePatient(id: string) {
    setUserIds((prev) => {
      if (audience === 'one') return prev[0] === id ? [] : [id]
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    })
  }

  async function handleImage(file: File | undefined) {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadAdminPushImage(file)
      if (!url) throw new Error('Falha no upload da imagem.')
      setImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setFeedback('')
    if (needsPicker && !userIds.length) {
      setError(audience === 'one' ? 'Escolha a paciente.' : 'Selecione pelo menos uma paciente.')
      return
    }
    if (mode === 'schedule' && !scheduledAt) {
      setError('Escolha data e hora do envio.')
      return
    }

    setSending(true)
    try {
      const result = await sendAdminPush({
        title: title.trim() || 'Isabella Jardim',
        body: body.trim(),
        type,
        actionPath,
        imageUrl: imageUrl || null,
        buttonKey: buttonKey || undefined,
        audience,
        userId: audience === 'one' ? userIds[0] : undefined,
        userIds: audience === 'selected' ? userIds : undefined,
        scheduledAt: mode === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
      })
      setFeedback(result.message || 'Notificação enviada.')
      setBody('')
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
      <div className={styles.grid}>
        <FloatField label="Título" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <FloatField as="select" label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
          {ADMIN_PUSH_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </FloatField>
        <FloatField as="select" label="Ao tocar, abrir" value={actionPath} onChange={(e) => setActionPath(e.target.value)}>
          {ADMIN_PUSH_DESTINATIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </FloatField>
        <FloatField
          as="textarea"
          label="Mensagem"
          value={body}
          maxLength={200}
          rows={3}
          className={styles.full}
          placeholder="Ex: Nova aula no ar — entra pra assistir?"
          onChange={(e) => setBody(e.target.value)}
        />
        <FloatField as="select" label="Botão extra" value={buttonKey} onChange={(e) => setButtonKey(e.target.value)}>
          {ADMIN_PUSH_BUTTONS.map((item) => (
            <option key={item.value || 'none'} value={item.value}>
              {item.label}
            </option>
          ))}
        </FloatField>
        <FloatField as="select" label="Para quem" value={audience} onChange={(e) => setAudience(e.target.value)}>
          {ADMIN_PUSH_AUDIENCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </FloatField>
        <FloatField
          as="select"
          label="Quando"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'now' | 'schedule')}
        >
          <option value="now">Agora</option>
          <option value="schedule">Programar data e hora</option>
        </FloatField>
        {mode === 'schedule' ? (
          <FloatField
            label="Data e hora (Brasília)"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        ) : null}
      </div>

      <div className={styles.media}>
        <label className={styles.upload}>
          <span>{uploading ? 'Enviando imagem…' : imageUrl ? 'Trocar imagem' : 'Anexar imagem'}</span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => void handleImage(event.target.files?.[0])}
          />
        </label>
        {imageUrl ? (
          <div className={styles.previewWrap}>
            <img src={imageUrl} alt="Prévia da notificação" className={styles.preview} />
            <button type="button" className="btn-secondary" onClick={() => setImageUrl('')}>
              Remover
            </button>
          </div>
        ) : (
          <p className={styles.hint}>
            A imagem aparece na lista do app e no Android. No iOS o banner remoto com foto precisa de
            extensão nativa — o toque e a inbox continuam funcionando.
          </p>
        )}
      </div>

      {needsPicker ? (
        <div className={styles.patients}>
          {selected.length ? (
            <div className={styles.chips}>
              {selected.map((patient) => (
                <span key={patient.id} className={styles.chip}>
                  {patient.name}
                  <button type="button" aria-label={`Remover ${patient.name}`} onClick={() => togglePatient(patient.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.search}>
            <Search className={styles.searchIcon} size={16} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente por nome..."
              aria-label="Buscar paciente"
            />
          </div>
          <div className={styles.panel}>
            {patients.length > VISIBLE_LIMIT && search.trim().length < SEARCH_MIN ? (
              <p className={styles.hint}>Digite pelo menos {SEARCH_MIN} caracteres para buscar.</p>
            ) : visible.length ? (
              <ul className={styles.list}>
                {visible.map((patient) => (
                  <li key={patient.id}>
                    <label className={styles.item}>
                      <input
                        type={audience === 'one' ? 'radio' : 'checkbox'}
                        name="admin-push-patient"
                        checked={userIds.includes(patient.id)}
                        onChange={() => togglePatient(patient.id)}
                      />
                      <span>{patient.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>Nenhuma paciente encontrada.</p>
            )}
          </div>
        </div>
      ) : (
        <p className={styles.hint}>
          {audience === 'all'
            ? 'Vai para todas as pacientes ativas com acesso válido.'
            : audience === 'female'
              ? 'Só quem cadastrou sexo feminino no perfil.'
              : 'Só quem cadastrou sexo masculino no perfil.'}
        </p>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
      {feedback ? <p className={styles.ok}>{feedback}</p> : null}

      <button type="submit" className="btn-primary" disabled={sending || uploading}>
        {sending ? 'Enviando…' : mode === 'schedule' ? 'Agendar' : 'Enviar agora'}
      </button>
    </form>
  )
}
