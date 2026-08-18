'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppModal } from '@/components/overlays'
import { CfSelect } from '@/components/ui/CfSelect'
import {
  ADMIN_PUSH_BUTTONS,
  ADMIN_PUSH_DESTINATIONS,
  ADMIN_PUSH_TYPES,
  sendAdminPush,
  uploadAdminPushImage,
} from '@/lib/admin-push'
import styles from './PatientPushModal.module.scss'

type Props = {
  open: boolean
  patientId: string
  patientName?: string | null
  onOpenChange: (open: boolean) => void
}

export function PatientPushModal({ open, patientId, patientName, onOpenChange }: Props) {
  const [title, setTitle] = useState('Isabella Jardim')
  const [body, setBody] = useState('')
  const [type, setType] = useState('bella')
  const [actionPath, setActionPath] = useState('/inicio')
  const [buttonKey, setButtonKey] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [mode, setMode] = useState('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

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

  async function handleSend() {
    setError('')
    setFeedback('')
    const message = body.trim()
    if (message.length < 2) {
      setError('Escreva a mensagem da notificação.')
      return
    }
    if (mode === 'schedule' && !scheduledAt) {
      setError('Escolha data e hora do envio.')
      return
    }
    setSending(true)
    try {
      const result = await sendAdminPush({
        userId: patientId,
        audience: 'one',
        title: title.trim() || 'Isabella Jardim',
        body: message,
        type,
        actionPath,
        imageUrl: imageUrl || null,
        buttonKey: buttonKey || undefined,
        scheduledAt: mode === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
      })
      setFeedback(result.message || 'Notificação enviada.')
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Enviar notificação"
      description={`Aviso no celular de ${patientName || 'paciente'}.`}
    >
      <div className={styles.form}>
        <div className="field field--float">
          <label htmlFor="cf-push-title">Título</label>
          <input
            id="cf-push-title"
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="field field--float">
          <label htmlFor="cf-push-body">Mensagem</label>
          <textarea
            id="cf-push-body"
            value={body}
            maxLength={200}
            rows={4}
            placeholder="Ex: Vi seu diário de hoje — parabéns pela constância!"
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <div className="field field--float">
          <label htmlFor="cf-push-type">Tipo</label>
          <CfSelect id="cf-push-type" value={type} options={[...ADMIN_PUSH_TYPES]} onChange={setType} />
        </div>

        <div className="field field--float">
          <label htmlFor="cf-push-path">Ao tocar, abrir</label>
          <CfSelect
            id="cf-push-path"
            value={actionPath}
            options={[...ADMIN_PUSH_DESTINATIONS]}
            onChange={setActionPath}
          />
        </div>

        <div className="field field--float">
          <label htmlFor="cf-push-btn">Botão extra</label>
          <CfSelect
            id="cf-push-btn"
            value={buttonKey}
            options={[...ADMIN_PUSH_BUTTONS]}
            onChange={setButtonKey}
          />
        </div>

        <div className="field field--float">
          <label htmlFor="cf-push-when">Quando</label>
          <CfSelect
            id="cf-push-when"
            value={mode}
            options={[
              { value: 'now', label: 'Agora' },
              { value: 'schedule', label: 'Programar' },
            ]}
            onChange={setMode}
          />
        </div>

        {mode === 'schedule' ? (
          <div className="field field--float">
            <label htmlFor="cf-push-at">Data e hora (Brasília)</label>
            <input
              id="cf-push-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
        ) : null}

        <label className={styles.upload}>
          <span>{uploading ? 'Enviando imagem…' : imageUrl ? 'Trocar imagem' : 'Anexar imagem'}</span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => void handleImage(event.target.files?.[0])}
          />
        </label>
        {imageUrl ? <img src={imageUrl} alt="" className={styles.preview} /> : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        {feedback ? <p className={styles.ok}>{feedback}</p> : null}

        <p className={styles.more}>
          <Link href="/notificacoes">Enviar para todas, mulheres ou homens</Link>
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className="btn-secondary"
            disabled={sending}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
          <button type="button" className="btn-primary" disabled={sending || uploading} onClick={() => void handleSend()}>
            {sending ? 'Enviando…' : mode === 'schedule' ? 'Agendar' : 'Enviar push'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
