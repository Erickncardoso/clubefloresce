import { Platform } from 'react-native';

type LiveActivityNativeModule = {
  isSupported(): boolean;
  startWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean>;
  updateWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean>;
  endWaterActivity(): Promise<boolean>;
  syncWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean>;
};

/**
 * Lê o módulo nativo direto do host Expo, sem `requireNativeModule`.
 * O development build atual não expõe essa API — OTA/JS não pode forçar o nativo.
 */
function getNativeModule(): LiveActivityNativeModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const expo = (globalThis as typeof globalThis & {
      expo?: { modules?: Record<string, LiveActivityNativeModule | undefined> };
    }).expo;
    const mod = expo?.modules?.LiveActivityModule;
    if (!mod || typeof mod.isSupported !== 'function') return null;
    return mod;
  } catch {
    return null;
  }
}

const NativeModule = getNativeModule();

export function isLiveActivitySupported(): boolean {
  try {
    return NativeModule?.isSupported() ?? false;
  } catch {
    return false;
  }
}

export async function startWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean> {
  if (!NativeModule) return false;
  try {
    return await NativeModule.startWaterActivity(currentLiters, goalLiters);
  } catch {
    return false;
  }
}

export async function updateWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean> {
  if (!NativeModule) return false;
  try {
    return await NativeModule.updateWaterActivity(currentLiters, goalLiters);
  } catch {
    return false;
  }
}

export async function endWaterActivity(): Promise<boolean> {
  if (!NativeModule) return false;
  try {
    return await NativeModule.endWaterActivity();
  } catch {
    return false;
  }
}

export async function syncWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean> {
  if (!NativeModule) return false;
  try {
    return await NativeModule.syncWaterActivity(currentLiters, goalLiters);
  } catch {
    return false;
  }
}
