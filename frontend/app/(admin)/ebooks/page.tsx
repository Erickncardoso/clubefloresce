'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Download, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  type Ebook,
  createEbook,
  deleteEbook,
  listEbooks,
} from '@/lib/courses'
import { EbookFormModal, type EbookSavePayload } from '@/components/courses/EbookFormModal'
import { EbookReaderModal } from '@/components/courses/EbookReaderModal'
import styles from './ebooks.module.scss'

function EbooksPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [reader, setReader] = useState<{ title: string; fileUrl: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listEbooks()
      setEbooks(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar ebooks.')
      setEbooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setModalOpen(true)
    }
  }, [searchParams])

  async function saveEbook(payload: EbookSavePayload) {
    setSaving(true)
    setModalError('')
    try {
      await createEbook(payload)
      setModalOpen(false)
      await load()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Erro ao salvar ebook.')
    } finally {
      setSaving(false)
    }
  }

  async function removeEbook(id: string) {
    if (!window.confirm('Excluir este ebook?')) return
    try {
      await deleteEbook(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <button type="button" className={styles.back} onClick={() => router.push('/cursos')}>
            ← Cursos
          </button>
          <h1>Ebooks</h1>
          <p>Biblioteca de PDFs e materiais complementares.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Adicionar ebook
        </button>
      </header>

      {loading ? <p className={styles.state}>Carregando…</p> : null}
      {!loading && error ? <p className={`${styles.state} ${styles.error}`}>{error}</p> : null}

      {!loading && !error && ebooks.length === 0 ? (
        <div className={styles.empty}>
          <BookOpen size={28} />
          <p>Nenhum ebook ainda.</p>
          <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
            Adicionar primeiro ebook
          </button>
        </div>
      ) : null}

      {!loading && ebooks.length > 0 ? (
        <div className={styles.grid}>
          {ebooks.map((ebook) => (
            <article key={ebook.id} className={styles.card}>
              <div className={styles.cover}>
                {ebook.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ebook.thumbnail} alt="" />
                ) : (
                  <div className={styles.coverEmpty}>
                    <BookOpen size={28} />
                  </div>
                )}
              </div>
              <div className={styles.info}>
                <h3>{ebook.title}</h3>
                <p>{ebook.description || 'Material complementar exclusivo.'}</p>
                <div className={styles.foot}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!ebook.fileUrl) return
                      setReader({ title: ebook.title, fileUrl: ebook.fileUrl })
                    }}
                  >
                    <BookOpen size={14} />
                    Ler material
                  </button>
                  <a
                    href={ebook.fileUrl}
                    download
                    className={styles.download}
                    title="Baixar PDF"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    type="button"
                    className={styles.danger}
                    title="Excluir"
                    onClick={() => void removeEbook(ebook.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <EbookFormModal
        open={modalOpen}
        saving={saving}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onSave={saveEbook}
      />

      <EbookReaderModal
        open={Boolean(reader)}
        title={reader?.title || ''}
        fileUrl={reader?.fileUrl || ''}
        onClose={() => setReader(null)}
      />
    </div>
  )
}

export default function EbooksPage() {
  return (
    <Suspense fallback={<p className={styles.state}>Carregando…</p>}>
      <EbooksPageInner />
    </Suspense>
  )
}
