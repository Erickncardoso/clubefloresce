/**
 * Papel de parede do chat (presets + upload local).
 */
import { computed, ref } from 'vue'

export const WA_WALLPAPER_STORAGE_KEY = 'wa-chat-wallpaper-v1'
export const WA_WALLPAPER_CUSTOM_MAX_BYTES = 1_500_000

const DEFAULT_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d0c6' fill-opacity='0.45'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"

const dotPattern = (color, opacity = 0.35) =>
  `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='${encodeURIComponent(color)}' fill-opacity='${opacity}'/%3E%3C/svg%3E")`

export const WA_WALLPAPER_PRESETS = [
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
    backgroundImage: dotPattern('%2398c9b8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'sky',
    label: 'Céu',
    backgroundColor: '#dce8f3',
    backgroundImage: dotPattern('%2388a8c8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'lavender',
    label: 'Lavanda',
    backgroundColor: '#e8e0f0',
    backgroundImage: dotPattern('%23a894c8'),
    backgroundSize: '20px 20px',
    backgroundRepeat: 'repeat',
  },
  {
    id: 'rose',
    label: 'Rosa',
    backgroundColor: '#f0e0e4',
    backgroundImage: dotPattern('%23c894a8'),
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
    backgroundImage: dotPattern('%23ffffff', 0.08),
    backgroundSize: '24px 24px',
    backgroundRepeat: 'repeat',
  },
]

export const wallpaperPickerOpen = ref(false)
export const wallpaperSelectedId = ref('default')
export const wallpaperCustomDataUrl = ref('')
export const wallpaperUploadError = ref('')

const wallpaperLoaded = ref(false)

const readStorage = () => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(WA_WALLPAPER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const writeStorage = (payload) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(WA_WALLPAPER_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    wallpaperUploadError.value = 'Não foi possível salvar o papel de parede. Tente uma imagem menor.'
  }
}

export const loadWhatsappWallpaper = () => {
  if (wallpaperLoaded.value) return
  wallpaperLoaded.value = true
  const saved = readStorage()
  if (!saved) return
  const presetId = String(saved.presetId || 'default')
  wallpaperSelectedId.value = presetId
  wallpaperCustomDataUrl.value = String(saved.customDataUrl || '')
}

const resolvePresetById = (id) =>
  WA_WALLPAPER_PRESETS.find((item) => item.id === id) || WA_WALLPAPER_PRESETS[0]

export const resolveActiveWallpaper = () => {
  const id = wallpaperSelectedId.value
  if (id === 'custom' && wallpaperCustomDataUrl.value) {
    return {
      id: 'custom',
      label: 'Personalizado',
      backgroundColor: '#efeae2',
      backgroundImage: `url(${JSON.stringify(wallpaperCustomDataUrl.value)})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    }
  }
  return resolvePresetById(id)
}

export const chatWallpaperStyle = computed(() => {
  const wp = resolveActiveWallpaper()
  const style = {
    backgroundColor: wp.backgroundColor,
    backgroundPosition: 'center',
  }
  if (wp.backgroundImage && wp.backgroundImage !== 'none') {
    style.backgroundImage = wp.backgroundImage
    style.backgroundSize = wp.backgroundSize || 'cover'
    style.backgroundRepeat = wp.backgroundRepeat || 'no-repeat'
  } else {
    style.backgroundImage = 'none'
  }
  return style
})

export const openWallpaperPicker = () => {
  loadWhatsappWallpaper()
  wallpaperUploadError.value = ''
  wallpaperPickerOpen.value = true
}

export const closeWallpaperPicker = () => {
  wallpaperPickerOpen.value = false
  wallpaperUploadError.value = ''
}

export const selectWallpaperPreset = (presetId) => {
  wallpaperSelectedId.value = String(presetId || 'default')
  wallpaperUploadError.value = ''
}

export const applyWallpaperSelection = () => {
  writeStorage({
    presetId: wallpaperSelectedId.value,
    customDataUrl: wallpaperSelectedId.value === 'custom' ? wallpaperCustomDataUrl.value : '',
  })
  closeWallpaperPicker()
}

export const setCustomWallpaperFromFile = (file) =>
  new Promise((resolve, reject) => {
    wallpaperUploadError.value = ''
    if (!file) {
      reject(new Error('Nenhum arquivo selecionado.'))
      return
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(String(file.type || ''))) {
      const err = 'Use uma imagem JPG, PNG ou WebP.'
      wallpaperUploadError.value = err
      reject(new Error(err))
      return
    }
    if (Number(file.size || 0) > WA_WALLPAPER_CUSTOM_MAX_BYTES) {
      const err = 'A imagem deve ter no máximo 1,5 MB.'
      wallpaperUploadError.value = err
      reject(new Error(err))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl.startsWith('data:image/')) {
        const err = 'Não foi possível ler a imagem.'
        wallpaperUploadError.value = err
        reject(new Error(err))
        return
      }
      wallpaperCustomDataUrl.value = dataUrl
      wallpaperSelectedId.value = 'custom'
      resolve(dataUrl)
    }
    reader.onerror = () => {
      const err = 'Falha ao carregar a imagem.'
      wallpaperUploadError.value = err
      reject(new Error(err))
    }
    reader.readAsDataURL(file)
  })

export const resetWallpaperToDefault = () => {
  wallpaperSelectedId.value = 'default'
  wallpaperCustomDataUrl.value = ''
  writeStorage({ presetId: 'default', customDataUrl: '' })
}
