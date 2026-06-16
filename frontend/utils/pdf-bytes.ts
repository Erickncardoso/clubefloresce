import { markRaw, toRaw } from 'vue'

/** Evita proxy do Vue e garante bytes estáveis para o PDF.js. */
export function toPdfByteArray(source: unknown): Uint8Array | null {
  const raw = toRaw(source)
  if (!raw) return null

  if (raw instanceof Uint8Array) {
    return raw.byteLength ? new Uint8Array(raw) : null
  }

  if (raw instanceof ArrayBuffer) {
    return raw.byteLength ? new Uint8Array(raw) : null
  }

  if (ArrayBuffer.isView(raw)) {
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  }

  return null
}

export function storePdfBytes(buffer: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(buffer)
  return markRaw(bytes) as Uint8Array
}
