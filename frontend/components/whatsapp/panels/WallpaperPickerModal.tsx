'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import { AnimatedDialog } from '@/components/overlays'
import {
  WA_WALLPAPER_PRESETS,
  readWallpaperStorage,
  readCustomWallpaperFile,
  type WallpaperPreset,
} from '@/lib/whatsapp/wallpaper'
import styles from './WallpaperPickerModal.module.scss'

interface Props {
  open: boolean
  onCancel: () => void
  onApply: (presetId: string, customDataUrl: string) => void
}

export function WallpaperPickerModal({ open, onCancel, onApply }: Props) {
  const [selectedId, setSelectedId] = useState('default')
  const [customDataUrl, setCustomDataUrl] = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const saved = readWallpaperStorage()
    setSelectedId(saved?.presetId || 'default')
    setCustomDataUrl(saved?.customDataUrl || '')
    setUploadError('')
  }, [open])

  const previewStyle = (preset: WallpaperPreset) => ({
    backgroundColor: preset.backgroundColor,
    backgroundImage:
      preset.backgroundImage && preset.backgroundImage !== 'none'
        ? preset.backgroundImage
        : undefined,
    backgroundSize: preset.backgroundSize || 'cover',
    backgroundRepeat: preset.backgroundRepeat || 'no-repeat',
    backgroundPosition: 'center' as const,
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    try {
      const dataUrl = await readCustomWallpaperFile(file)
      setCustomDataUrl(dataUrl)
      setSelectedId('custom')
    } catch (err) {
      setUploadError((err as Error).message)
    }
  }

  return (
    <AnimatedDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title="Papel de parede"
      overlayClassName={styles.waOverlay}
      contentClassName={styles.modal}
    >
      <header className={styles.header}>
        <button type="button" className={styles.closeBtn} aria-label="Fechar" onClick={onCancel}>
          <X size={20} />
        </button>
        <h2 className={styles.title}>Papel de parede</h2>
      </header>

      <div className={styles.body}>
        <p className={styles.hint}>Escolha um fundo padrão ou envie uma foto do seu computador.</p>

        <div className={styles.grid} role="listbox" aria-label="Papéis de parede padrão">
          {WA_WALLPAPER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`${styles.tile}${selectedId === preset.id ? ` ${styles.selected}` : ''}`}
              aria-selected={selectedId === preset.id}
              role="option"
              onClick={() => setSelectedId(preset.id)}
            >
              <span className={styles.tilePreview} style={previewStyle(preset)} />
              <span className={styles.tileLabel}>{preset.label}</span>
            </button>
          ))}

          <button
            type="button"
            className={`${styles.tile}${selectedId === 'custom' ? ` ${styles.selected}` : ''}`}
            aria-selected={selectedId === 'custom'}
            role="option"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={`${styles.tilePreview} ${styles.tilePreviewUpload}`}>
              {customDataUrl && selectedId === 'custom' ? (
                <img src={customDataUrl} alt="" className={styles.uploadImg} />
              ) : (
                <Upload size={28} className={styles.uploadIcon} aria-hidden />
              )}
            </span>
            <span className={styles.tileLabel}>
              {customDataUrl && selectedId === 'custom' ? 'Personalizado' : 'Enviar foto'}
            </span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.fileInput}
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className={styles.errorMsg} role="alert">
            {uploadError}
          </p>
        )}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => onApply(selectedId, selectedId === 'custom' ? customDataUrl : '')}
        >
          Definir papel de parede
        </button>
      </footer>
    </AnimatedDialog>
  )
}
