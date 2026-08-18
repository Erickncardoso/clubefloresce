const JITSI_CONSOLE_NOISE = [
  'ClearedQueueError',
  'removeRemoteStreamsOnLeave',
  'The queue has been cleared',
  'StropheErrorHandler',
  'get STUN/TURN credentials',
  'extdisco:',
  'getting turn credentials',
  'mod_turncredentials',
  'BridgeChannel',
  'Channel closed',
  '[rtc:',
]

function isJitsiConsoleNoise(args: unknown[]) {
  const text = args
    .map((value) => {
      if (typeof value === 'string') return value
      if (value instanceof Error) return `${value.name} ${value.message}`
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    })
    .join(' ')
  return JITSI_CONSOLE_NOISE.some((token) => text.includes(token))
}

let depth = 0
let originalError: typeof console.error | null = null
let originalWarn: typeof console.warn | null = null

/** Impede o overlay do Next de tratar log interno do Jitsi como erro da app. */
export function installJitsiConsoleFilter() {
  if (typeof window === 'undefined') return () => {}
  if (depth === 0) {
    originalError = console.error
    originalWarn = console.warn
    console.error = (...args: unknown[]) => {
      if (isJitsiConsoleNoise(args)) return
      originalError?.apply(console, args)
    }
    console.warn = (...args: unknown[]) => {
      if (isJitsiConsoleNoise(args)) return
      originalWarn?.apply(console, args)
    }
  }
  depth += 1
  return () => {
    depth = Math.max(0, depth - 1)
    if (depth !== 0 || !originalError || !originalWarn) return
    console.error = originalError
    console.warn = originalWarn
    originalError = null
    originalWarn = null
  }
}
