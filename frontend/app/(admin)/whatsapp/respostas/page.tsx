'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquarePlus,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from 'lucide-react'
import { whatsappHasAuth } from '@/lib/whatsapp/api'
import {
  deleteQuickReply,
  filterQuickReplies,
  loadQuickReplies,
  quickReplyPreviewText,
  saveQuickReply,
  type QuickReply,
  type SaveQuickReplyPayload,
} from '@/lib/whatsapp/quick-replies'
import { QuickReplyFormModal } from '@/components/whatsapp/panels/QuickReplyFormModal'
import { QuickReplyDeleteConfirmModal } from '@/components/whatsapp/panels/QuickReplyDeleteConfirmModal'
import styles from './respostas.module.scss'

function typeLabel(type: string): string {
  const t = String(type || 'text').toLowerCase()
  if (t === 'text') return 'Texto'
  if (t === 'image') return 'Imagem'
  if (t === 'video') return 'Vídeo'
  if (t === 'document') return 'Documento'
  if (['audio', 'ptt', 'myaudio'].includes(t)) return 'Áudio'
  return t
}

function MediaIcon({ type }: { type: string }) {
  const t = String(type || 'text').toLowerCase()
  if (t === 'image') return <ImageIcon size={20} />
  if (t === 'video') return <Video size={20} />
  if (t === 'document') return <FileText size={20} />
  if (['audio', 'ptt', 'myaudio'].includes(t)) return <Mic size={20} />
  return <MessageSquarePlus size={20} />
}

export default function WhatsappRespostasPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [replyToEdit, setReplyToEdit] = useState<QuickReply | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [replyToDelete, setReplyToDelete] = useState<QuickReply | null>(null)

  const loadReplies = useCallback(async () => {
    try {
      setLoading(true)
      const list = await loadQuickReplies()
      setReplies(list)
    } catch (err) {
      console.error('Erro ao carregar respostas rápidas', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!whatsappHasAuth()) {
      router.replace('/whatsapp/conexao')
      return
    }
    setAuthReady(true)
    void loadReplies()
  }, [router, loadReplies])

  const filtered = useMemo(
    () => filterQuickReplies(replies, searchQuery),
    [replies, searchQuery],
  )

  const openCreate = () => {
    setReplyToEdit(null)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (reply: QuickReply) => {
    setReplyToEdit(reply)
    setFormError('')
    setFormOpen(true)
  }

  const openDelete = (reply: QuickReply) => {
    setReplyToDelete(reply)
    setDeleteOpen(true)
  }

  const handleSave = async (payload: SaveQuickReplyPayload) => {
    setFormSaving(true)
    setFormError('')
    try {
      await saveQuickReply(payload)
      setFormOpen(false)
      setReplyToEdit(null)
      await loadReplies()
    } catch (err) {
      setFormError((err as Error)?.message || 'Falha ao salvar resposta rápida')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!replyToDelete?.id) return
    setDeleteSaving(true)
    try {
      await deleteQuickReply(replyToDelete.id)
      setDeleteOpen(false)
      setReplyToDelete(null)
      await loadReplies()
    } catch (err) {
      alert((err as Error)?.message || 'Falha ao apagar resposta rápida')
    } finally {
      setDeleteSaving(false)
    }
  }

  if (!authReady) {
    return (
      <div className={styles.page}>
        <div className={`admin-shell-card ${styles.stateCard}`}>
          <Loader2 className={styles.spin} size={28} />
          <p>Verificando sessão…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Respostas Rápidas</h1>
          <p className={styles.subtitle}>
            Automatize e padronize seu atendimento criando templates de respostas.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nova Resposta
        </button>
      </header>

      <section className={`admin-shell-card ${styles.mainCard}`}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={16} aria-hidden />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar atalho ou texto..."
              aria-label="Buscar respostas rápidas"
            />
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            title="Atualizar"
            aria-label="Atualizar lista"
            onClick={() => void loadReplies()}
          >
            <RefreshCw size={16} className={loading ? styles.spin : undefined} />
          </button>
        </div>

        {loading ? (
          <div className={styles.stateCard}>
            <Loader2 className={styles.spin} size={28} />
            <p>Carregando templates...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.stateCard}>
            <MessageSquarePlus size={40} />
            <p>Nenhuma resposta rápida encontrada.</p>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Adicionar resposta
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((reply) => {
              const isText = String(reply.type || 'text').toLowerCase() === 'text'
              return (
                <article key={reply.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.shortcut}>/{reply.shortCut}</span>
                    <div className={styles.cardActions}>
                      {!reply.onWhatsApp ? (
                        <>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            title="Editar"
                            aria-label={`Editar /${reply.shortCut}`}
                            onClick={() => openEdit(reply)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconDanger}`}
                            title="Excluir"
                            aria-label={`Excluir /${reply.shortCut}`}
                            onClick={() => openDelete(reply)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <span className={styles.wabBadge} title="Criado via WhatsApp Business">
                          WAB
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.typeRow}>
                    <span className={styles.typeBadge}>{typeLabel(reply.type)}</span>
                  </div>

                  <div className={styles.preview}>
                    {isText ? (
                      <p>{quickReplyPreviewText(reply)}</p>
                    ) : (
                      <div className={styles.mediaPreview}>
                        <div className={styles.mediaIcon}>
                          <MediaIcon type={reply.type} />
                        </div>
                        <div>
                          <strong>Mídia anexada ({typeLabel(reply.type)})</strong>
                          <p>{quickReplyPreviewText(reply)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <QuickReplyFormModal
        open={formOpen}
        saving={formSaving}
        error={formError}
        reply={replyToEdit}
        onCancel={() => {
          setFormOpen(false)
          setReplyToEdit(null)
          setFormError('')
        }}
        onSave={(payload) => void handleSave(payload)}
      />

      <QuickReplyDeleteConfirmModal
        open={deleteOpen}
        saving={deleteSaving}
        reply={replyToDelete}
        onCancel={() => {
          setDeleteOpen(false)
          setReplyToDelete(null)
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
