'use client'

import { useEffect } from 'react'
import { Download, ExternalLink, X } from 'lucide-react'
import styles from './EbookReaderModal.module.scss'

type Props = {
  open: boolean
  title: string
  fileUrl: string
  onClose: () => void
}

function encodePdfUrl(url: string) {
  try {
    const parsed = new URL(url)
    parsed.pathname = parsed.pathname
      .split('/')
      .map((part) => encodeURIComponent(decodeURIComponent(part)))
      .join('/')
    return parsed.toString()
  } catch {
    return encodeURI(url)
  }
}

export function EbookReaderModal({ open, title, fileUrl, onClose }: Props) {
  const src = fileUrl ? `${encodePdfUrl(fileUrl)}#view=FitH` : ''

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !fileUrl) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title || 'Ebook'}>
      <div className={`${styles.panel} cf-admin-radius cf-squircle cf-squircle--control`}>
        <header className={styles.head}>
          <div className={styles.headText}>
            <p>Ebook</p>
            <h2>{title || 'Material'}</h2>
          </div>
          <div className={styles.actions}>
            <a
              href={encodePdfUrl(fileUrl)}
              download
              className={styles.ghost}
              title="Baixar PDF"
            >
              <Download size={16} />
              <span>Baixar</span>
            </a>
            <a
              href={encodePdfUrl(fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ghost}
              title="Abrir em nova aba"
            >
              <ExternalLink size={16} />
            </a>
            <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>
        <div className={styles.frameWrap}>
          <iframe title={title || 'PDF'} src={src} className={styles.frame} />
        </div>
      </div>
    </div>
  )
}
