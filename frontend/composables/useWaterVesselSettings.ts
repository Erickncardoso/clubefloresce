const STORAGE_KEY = 'cf-water-vessel-settings-v1'

type WaterVesselSettings = {
  glassMl: number
  bottleMl: number
}

const DEFAULT_SETTINGS: WaterVesselSettings = {
  glassMl: 250,
  bottleMl: 500,
}

function clampVolume(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Math.round(Number(value) || fallback)
  return Math.max(min, Math.min(max, parsed))
}

export function useWaterVesselSettings() {
  const settings = useState<WaterVesselSettings>('water-vessel-settings', () => ({ ...DEFAULT_SETTINGS }))
  const hydrated = useState('water-vessel-settings-hydrated', () => false)

  function normalizeWaterVessels(value: Partial<WaterVesselSettings>) {
    return {
      glassMl: clampVolume(value.glassMl, 100, 750, DEFAULT_SETTINGS.glassMl),
      bottleMl: clampVolume(value.bottleMl, 250, 2000, DEFAULT_SETTINGS.bottleMl),
    }
  }

  function hydrateWaterVessels() {
    if (!import.meta.client || hydrated.value) return
    hydrated.value = true

    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      settings.value = normalizeWaterVessels(stored)
    } catch {
      settings.value = { ...DEFAULT_SETTINGS }
    }
  }

  function updateWaterVessels(value: Partial<WaterVesselSettings>) {
    settings.value = normalizeWaterVessels({ ...settings.value, ...value })
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    }
  }

  return {
    waterVesselSettings: readonly(settings),
    hydrateWaterVessels,
    updateWaterVessels,
  }
}
