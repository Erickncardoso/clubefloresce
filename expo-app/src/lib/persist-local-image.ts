import * as FileSystem from 'expo-file-system/legacy';

/** Copia a foto para o cache do app — a URI da câmera/galeria pode expirar após o upload. */
export async function persistLocalImageUri(uri: string, prefix = 'bella-meal'): Promise<string> {
  const source = String(uri || '').trim();
  if (!source) return source;
  if (source.startsWith('data:') || source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }

  const base = FileSystem.cacheDirectory;
  if (!base) return source;

  const dest = `${base}${prefix}-${Date.now()}.jpg`;
  try {
    await FileSystem.copyAsync({ from: source, to: dest });
    return dest;
  } catch {
    return source;
  }
}
