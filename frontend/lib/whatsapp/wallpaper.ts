/**
 * Papel de parede do chat WhatsApp — presets e persistência em localStorage.
 * Portado de useWhatsappWallpaper.js (composable Vue). Cliente apenas.
 */

export const WA_WALLPAPER_STORAGE_KEY = 'wa-chat-wallpaper-v1'
export const WA_WALLPAPER_CUSTOM_MAX_BYTES = 1_500_000

const DEFAULT_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d0c6' fill-opacity='0.45'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"

const dotPattern = (color: string, opacity = 0.35): string =>
  `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='${encodeURIComponent(color)}' fill-opacity='${opacity}'/%3E%3C/svg%3E")`

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WallpaperPreset {
  id: string
  label: string
  backgroundColor: string
  backgroundImage: string
  backgroundSize: string
  backgroundRepeat: string
}

export interface WallpaperStyle {
  backgroundColor: string
  backgroundImage?: string
  backgroundSize?: string
  backgroundRepeat?: string
  backgroundPosition: string
}

// ─── Presets ────────────────────────────────────────────────────────────────

export const WA_WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'default',
    label: 'Padrão',
    backgroundColor: '#efeae2',
    backgroundImage: DEFAULT_PATTERN,
    backgroundSize: 'auto',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'warm',
    label: 'Bege',
    backgroundColor: '#e6ddd3',
    backgroundImage: DEFAULT_PATTERN,
    backgroundSize: 'auto',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'mint',
    label: 'Menta',
    backgroundColor: '#d8ece3',
    backgroundImage: dotPattern('#98c9b8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'sky',
    label: 'Céu',
    backgroundColor: '#dce8f3',
    backgroundImage: dotPattern('#88a8c8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'lavender',
    label: 'Lavanda',
    backgroundColor: '#e8e0f0',
    backgroundImage: dotPattern('#a894c8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'rose',
    label: 'Rosa',
    backgroundColor: '#f0e0e4',
    backgroundImage: dotPattern('#c894a8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'sand',
    label: 'Areia',
    backgroundColor: '#f2eadf',
    backgroundImage: 'none',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  },
  {
    id: 'dark',
    label: 'Escuro',
    backgroundColor: '#0b141a',
    backgroundImage: dotPattern('#ffffff', 0.08),
    backgroundSize: '24px 24px',
    backgroundRepeat: 'repeat',
  },
]

// ─── Storage ────────────────────────────────────────────────────────────────

interface StoredWallpaper {
  presetId: string
  customDataUrl: string
}

export const readWallpaperStorage = (): StoredWallpaper | null => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(WA_WALLPAPER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredWallpaper
  } catch {
    return null
  }
}

export const writeWallpaperStorage = (payload: StoredWallpaper): void => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(WA_WALLPAPER_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* storage full — silencioso */
  }
}

// ─── Resolve helpers ────────────────────────────────────────────────────────

export const resolvePresetById = (id: string): WallpaperPreset =>
  WA_WALLPAPER_PRESETS.find((p) => p.id === id) ?? WA_WALLPAPER_PRESETS[0]

export const resolveActiveWallpaperStyle = (
  presetId: string,
  customDataUrl: string,
): WallpaperStyle => {
  if (presetId === 'custom' && customDataUrl) {
    return {
      backgroundColor: '#efeae2',
      backgroundImage: `url(${JSON.stringify(customDataUrl)})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    }
  }
  const preset = resolvePresetById(presetId)
  return {
    backgroundColor: preset.backgroundColor,
    backgroundImage: preset.backgroundImage !== 'none' ? preset.backgroundImage : undefined,
    backgroundSize: preset.backgroundSize,
    backgroundRepeat: preset.backgroundRepeat,
    backgroundPosition: 'center',
  }
}

// ─── File validation ────────────────────────────────────────────────────────

export const readCustomWallpaperFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file) { reject(new Error('Nenhum arquivo selecionado.')); return }
    if (!/^image\/(jpeg|png|webp)$/i.test(String(file.type || ''))) {
      reject(new Error('Use uma imagem JPG, PNG ou WebP.'))
      return
    }
    if (Number(file.size || 0) > WA_WALLPAPER_CUSTOM_MAX_BYTES) {
      reject(new Error('A imagem deve ter no máximo 1,5 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl.startsWith('data:image/')) {
        reject(new Error('Não foi possível ler a imagem.'))
        return
      }
      resolve(dataUrl)
    }
    reader.onerror = () => reject(new Error('Falha ao carregar a imagem.'))
    reader.readAsDataURL(file)
  })
