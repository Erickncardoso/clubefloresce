import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cf-water-vessel-settings-v1';

export type WaterVesselSettings = {
  glassMl: number;
  bottleMl: number;
};

const DEFAULT_SETTINGS: WaterVesselSettings = {
  glassMl: 250,
  bottleMl: 500,
};

function clampVolume(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Math.round(Number(value) || fallback);
  return Math.max(min, Math.min(max, parsed));
}

export function normalizeWaterVessels(value: Partial<WaterVesselSettings>): WaterVesselSettings {
  return {
    glassMl: clampVolume(value.glassMl, 100, 750, DEFAULT_SETTINGS.glassMl),
    bottleMl: clampVolume(value.bottleMl, 250, 2000, DEFAULT_SETTINGS.bottleMl),
  };
}

export async function loadWaterVesselSettings(): Promise<WaterVesselSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeWaterVessels(JSON.parse(raw) as Partial<WaterVesselSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveWaterVesselSettings(value: WaterVesselSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeWaterVessels(value)));
}
