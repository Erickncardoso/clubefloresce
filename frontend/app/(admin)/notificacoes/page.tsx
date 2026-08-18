'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminPushComposer } from '@/components/notifications/AdminPushComposer'
import { listPatientsForDispatch, formatScheduleWhen } from '@/lib/checkin'
import {
  ADMIN_PUSH_AUDIENCE_LABEL,
  ADMIN_PUSH_STATUS_LABEL,
  ADMIN_PUSH_TYPES,
  cancelAdminPushCampaign,
  listAdminPushCampaigns,
  type AdminPushCampaign,
} from '@/lib/admin-push'
import styles from './notificacoes.module.scss'

function AdminNotificacoesInner() {
  const searchParams = useSearchParams()
  const initialUserId = searchParams.get('userId') || ''
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([])
  const [campaigns, setCampaigns] = useState<AdminPushCampaign[]>([])

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaigns(await listAdminPushCampaigns())
    } catch {
      setCampaigns([])
    }
  }, [])

  useEffect(() => {
    void listPatientsForDispatch()
      .then(setPatients)
      .catch(() => setPatients([]))
    void loadCampaigns()
  }, [loadCampaigns])

  async function handleCancel(id: string) {
    try {
      await cancelAdminPushCampaign(id)
      await loadCampaigns()
    } catch {
      /* lista recarrega no próximo ciclo */
    }
  }

  const pending = campaigns.filter((item) => item.status === 'pending')
  const history = campaigns.filter((item) => item.status !== 'pending')

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Push</h1>
          <p>
            Crie e envie notificações no celular das pacientes: uma, várias, todas, só mulheres ou só
            homens. Dá para anexar imagem, escolher o tipo, um botão e programar o horário.
          </p>
        </div>
      </header>

      <section className={`admin-shell-card ${styles.card}`}>
        <div className={styles.copy}>
          <h2>Criar e enviar</h2>
          <p>A paciente precisa ter as notificações ligadas no app para o push chegar no aparelho.</p>
        </div>
        <AdminPushComposer
          patients={patients}
          initialUserId={initialUserId}
          onSubmitted={() => void loadCampaigns()}
        />
      </section>

      {pending.length ? (
        <section className={`admin-shell-card ${styles.card}`}>
          <h2>Programadas</h2>
          <ul className={styles.list}>
            {pending.map((item) => (
              <li key={item.id} className={styles.item}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatScheduleWhen(item.scheduledAt)}</span>
                  <small>
                    {ADMIN_PUSH_AUDIENCE_LABEL[item.audience] || item.audience}
                    {item.userIds.length ? ` · ${item.userIds.length}` : ''}
                  </small>
                </div>
                <button type="button" className={styles.cancelBtn} onClick={() => void handleCancel(item.id)}>
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {history.length ? (
        <section className={`admin-shell-card ${styles.card}`}>
          <h2>Envios recentes</h2>
          <ul className={styles.list}>
            {history.map((item) => {
              const type = ADMIN_PUSH_TYPES.find((entry) => entry.value === item.type)?.label || item.type
              return (
                <li key={item.id} className={styles.item}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {ADMIN_PUSH_STATUS_LABEL[item.status] || item.status}
                      {' · '}
                      {formatScheduleWhen(item.sentAt || item.createdAt)}
                    </span>
                    <small>
                      {type} · {ADMIN_PUSH_AUDIENCE_LABEL[item.audience] || item.audience}
                      {item.result?.recipients != null ? ` · ${item.result.recipients} paciente(s)` : ''}
                      {item.result?.sent != null ? ` · ${item.result.sent} aparelho(s)` : ''}
                    </small>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export default function AdminNotificacoesPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <header className={styles.head}>
            <h1>Push</h1>
            <p>Carregando compositor de envios…</p>
          </header>
        </div>
      }
    >
      <AdminNotificacoesInner />
    </Suspense>
  )
}
