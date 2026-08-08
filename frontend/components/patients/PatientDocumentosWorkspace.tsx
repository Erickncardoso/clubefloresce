'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import {
  DOCUMENTO_LIMIT,
  documentoPreviewText,
  documentoStatusLabel,
} from '@/lib/documento-templates'
import type { Documento, PatientUser, PatientProfile } from '@/lib/types'
import { PatientChartEmptyState } from './PatientChartEmptyState'
import { TileActionsMenu } from '@/components/courses/TileActionsMenu'
import s from './PatientDocumentosWorkspace.module.scss'

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function documentEditorPath(patientId: string, documentoId: string): string {
  return `/pacientes/${patientId}/documentos/${documentoId}`
}

function badgeClass(status?: string | null): string {
  if (status === 'published') return s.published
  return s.draft
}

// ── PatientDocumentosWorkspace ────────────────────────────────────────────────

export type PatientDocumentosWorkspaceProps = {
  user: PatientUser
  profile?: PatientProfile | null
  onSaved: (updated: PatientUser) => void
}

export function PatientDocumentosWorkspace({
  user,
  profile: profileProp,
  onSaved,
}: PatientDocumentosWorkspaceProps) {
  const profile = profileProp ?? (user?.patientProfileData as PatientProfile | undefined)
  const [listError, setListError] = useState('')

  const patientId = String(user?.id || '')

  const documentos: (Documento & { category?: string })[] = [
    ...(Array.isArray(user?.patientProfileData?.documentos)
      ? (user.patientProfileData!.documentos! as (Documento & { category?: string })[])
      : Array.isArray(profile?.documentos)
        ? (profile!.documentos! as (Documento & { category?: string })[])
        : []),
  ].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))

  const canCreate = Boolean(patientId) && documentos.length < DOCUMENTO_LIMIT
  const createBlockedReason = !patientId
    ? 'Paciente não identificado.'
    : documentos.length >= DOCUMENTO_LIMIT
      ? `Limite de ${DOCUMENTO_LIMIT} documentos por paciente.`
      : ''

  async function removeItem(id: string) {
    if (!id || !patientId) return
    if (!confirm('Excluir este documento?')) return
    setListError('')
    try {
      const next = documentos.filter((item) => item.id !== id)
      const updated = await apiFetch<PatientUser>(`/users/${patientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ patientProfile: { documentos: next } }),
      })
      onSaved(updated)
    } catch (err: unknown) {
      setListError(
        (err as { data?: { message?: string } })?.data?.message ||
          (err as { message?: string })?.message ||
          'Não foi possível excluir o documento.',
      )
    }
  }

  const newDocPath = documentEditorPath(patientId, 'novo')

  return (
    <div className={s.pawork}>
      <div className={s.head}>
        <div>
          <h2>Documentos</h2>
          <p>
            {documentos.length} registro(s) · limite {DOCUMENTO_LIMIT} por paciente
          </p>
        </div>
        <div className={s.actions}>
          {canCreate ? (
            <Link
              href={newDocPath}
              className={`btn-primary ${s.btn} ${s.btnLink}`}
            >
              + Novo documento
            </Link>
          ) : (
            <button
              type="button"
              className={`btn-primary ${s.btn}`}
              disabled
              title={createBlockedReason}
            >
              + Novo documento
            </button>
          )}
        </div>
      </div>

      {listError && <p className={s.error}>{listError}</p>}

      {documentos.length === 0 ? (
        <div className={s.emptyWrap}>
          <PatientChartEmptyState
            icon={ScrollText}
            title="Crie documentos para seu paciente"
            description="Atestados, declarações, encaminhamentos e outros documentos com cabeçalho personalizável, prontos para imprimir ou enviar."
            actionLabel="+ Novo documento"
            actionHref={canCreate ? newDocPath : undefined}
            counter={`${documentos.length}/${DOCUMENTO_LIMIT}`}
          />
        </div>
      ) : (
        <div className={s.list}>
          {documentos.map((item) => (
            <article
              key={item.id}
              className={`${s.card}${item.status !== 'published' ? ` ${s.cardDraft}` : ''}`}
            >
              <Link
                href={documentEditorPath(patientId, item.id)}
                className={s.cardMain}
              >
                <div className={s.cardTop}>
                  <strong>{item.title || 'Documento'}</strong>
                  <span className={`${s.badge} ${badgeClass(item.status)}`}>
                    {documentoStatusLabel(item.status)}
                  </span>
                </div>
                <p className={s.cardPreview}>{documentoPreviewText(item)}</p>
                <small>Atualizado {formatDate(item.updatedAt || item.createdAt)}</small>
              </Link>
              <div className={s.cardActions} onClick={(e) => e.stopPropagation()}>
                <TileActionsMenu menuKey={`documento-${item.id}`}>
                  <Link
                    href={documentEditorPath(patientId, item.id)}
                    role="menuitem"
                    className={s.menuItem}
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    className={`${s.menuItem} ${s.menuItemDanger}`}
                    role="menuitem"
                    onClick={() => removeItem(item.id)}
                  >
                    Excluir
                  </button>
                </TileActionsMenu>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
