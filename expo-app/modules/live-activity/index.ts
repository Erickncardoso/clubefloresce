import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type LiveActivityNativeModule = {
  isSupported(): boolean;
  startWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean>;
  updateWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean>;
  endWaterActivity(): Promise<boolean>;
  syncWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean>;
};

const NativeModule: LiveActivityNativeModule | null =
  Platform.OS === 'ios' ? requireNativeModule('LiveActivityModule') : null;

export function isLiveActivitySupported(): boolean {
  return NativeModule?.isSupported() ?? false;
}

export async function startWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean> {
  if (!NativeModule) return false;
  return NativeModule.startWaterActivity(currentLiters, goalLiters);
}

export async function updateWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean> {
  if (!NativeModule) return false;
  return NativeModule.updateWaterActivity(currentLiters, goalLiters);
}

export async function endWaterActivity(): Promise<boolean> {
  if (!NativeModule) return false;
  return NativeModule.endWaterActivity();
}

export async function syncWaterActivity(currentLiters: number, goalLiters: number): Promise<boolean> {
  if (!NativeModule) return false;
  return NativeModule.syncWaterActivity(currentLiters, goalLiters);
}
