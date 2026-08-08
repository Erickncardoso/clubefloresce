'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { FileUp, ImagePlus, X } from 'lucide-react'
import { FloatField } from '@/components/ui/FloatField'
import type { Ebook } from '@/lib/courses'
import { uploadDocument, uploadImage } from '@/lib/courses'
import styles from './EbookFormModal.module.scss'

export type EbookSavePayload = {
  title: string
  description: string
  fileUrl: string
  thumbnail: string | null
}

type Props = {
  open: boolean
  ebook?: Ebook | null
  saving?: boolean
  error?: string
  onClose: () => void
  onSave: (payload: EbookSavePayload) => void
}

export function EbookFormModal({
  open,
  ebook = null,
  saving = false,
  error = '',
  onClose,
  onSave,
}: Props) {
  const coverRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setLocalError('')
    setCoverFile(null)
    setPdfFile(null)
    setTitle(ebook?.title || '')
    setDescription(ebook?.description || '')
    setThumbnail(ebook?.thumbnail || '')
    setFileUrl(ebook?.fileUrl || '')
    setCoverPreview(ebook?.thumbnail || '')
    setPdfName(ebook?.fileUrl ? 'PDF atual' : '')
  }, [open, ebook])

  if (!open) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setLocalError('Informe o título do ebook.')
      return
    }
    setUploading(true)
    setLocalError('')
    try {
      let nextThumb = thumbnail || null
      let nextFile = fileUrl
      if (coverFile) {
        const uploaded = await uploadImage(coverFile)
        nextThumb = uploaded.url
      }
      if (pdfFile) {
        const uploaded = await uploadDocument(pdfFile)
        nextFile = uploaded.url
      }
      if (!nextFile) {
        throw new Error('Envie o PDF do ebook.')
      }
      onSave({
        title: title.trim(),
        description: description.trim(),
        fileUrl: nextFile,
        thumbnail: nextThumb,
      })
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao enviar arquivos.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div className={`modal-card ${styles.card}`}>
        <header className={styles.head}>
          <div>
            <h2>{ebook ? 'Editar ebook' : 'Novo ebook'}</h2>
            <p>Capa, título e PDF.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.uploads}>
            <button type="button" className={styles.coverBtn} onClick={() => coverRef.current?.click()}>
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="" />
              ) : (
                <span>
                  <ImagePlus size={18} />
                  Capa
                </span>
              )}
            </button>
            <button type="button" className={styles.pdfBtn} onClick={() => pdfRef.current?.click()}>
              <FileUp size={18} />
              <span>{pdfName || 'Enviar PDF'}</span>
            </button>
          </div>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
              setCoverFile(file)
              setCoverPreview(URL.createObjectURL(file))
            }}
          />
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setPdfFile(file)
              setPdfName(file.name)
            }}
          />

          <FloatField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <FloatField
            as="textarea"
            label="Descrição"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {localError || error ? <p className={styles.error}>{localError || error}</p> : null}

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" disabled={saving || uploading} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || uploading}>
              {saving || uploading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
