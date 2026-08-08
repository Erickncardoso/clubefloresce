/**
 * Virtual background estilo Jitsi Meet V1:
 * TFLite selfie_segmentation_landscape (256×144) + Canvas 2D compositing.
 * Assets em /jitsi-vb (frontend/public).
 */

const SEG_W = 256
const SEG_H = 144
const SEG_PIXELS = SEG_W * SEG_H

/** Assets locais — mesma origem do PWA (sem CORS/CDN externo) */
const VB_BASE = '/jitsi-vb'

let tflitePromise = null
let sharedTflite = null
let modelLoaded = false

const PRESET_GRADIENTS = {
  office: ['#1a2433', '#3d5668'],
  shelf: ['#2a2218', '#6a5340'],
  plant: ['#142e24', '#3d7a58'],
  soft: ['#e6e2d8', '#b8c9d9'],
}

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

async function detectSimd() {
  try {
    return typeof WebAssembly === 'object'
      && typeof WebAssembly.validate === 'function'
      && WebAssembly.validate(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
      ]))
  } catch {
    return false
  }
}

/** Safari/iOS PWA não suporta bem dynamic import(blob:) — usa <script> */
function loadTfliteScript(code) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([code], { type: 'text/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    const script = document.createElement('script')
    script.src = blobUrl
    script.async = true
    script.onload = () => {
      URL.revokeObjectURL(blobUrl)
      script.remove()
      resolve()
    }
    script.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      script.remove()
      reject(new Error('Falha ao carregar motor TFLite.'))
    }
    document.head.appendChild(script)
  })
}

async function loadTfliteFactory(simd) {
  const file = simd ? 'tflite-simd.js' : 'tflite.js'
  const url = `${VB_BASE}/${file}`
  const res = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' })
  if (!res.ok) throw new Error(`TFLite JS indisponível (${res.status}). Verifique /jitsi-vb no PWA.`)

  let code = await res.text()
  code = code
    .replace(/export\s+default\s+createTFLiteSIMDModule\s*;?/g, '')
    .replace(/export\s+default\s+createTFLiteModule\s*;?/g, '')

  const factoryName = simd ? 'createTFLiteSIMDModule' : 'createTFLiteModule'
  const wrapped = `${code}\n;globalThis.__cfCreateTFLite = ${factoryName};`
  await loadTfliteScript(wrapped)

  const factory = globalThis.__cfCreateTFLite
  delete globalThis.__cfCreateTFLite
  if (typeof factory !== 'function') throw new Error('Factory TFLite inválida.')
  return factory
}

async function ensureTflite() {
  if (typeof window === 'undefined') throw new Error('Só no navegador.')
  if (sharedTflite && modelLoaded) return sharedTflite
  if (tflitePromise) return tflitePromise

  tflitePromise = (async () => {
    const simd = await detectSimd()
    let factory
    let usedSimd = simd
    try {
      factory = await loadTfliteFactory(simd)
    } catch (err) {
      if (!simd) throw err
      usedSimd = false
      factory = await loadTfliteFactory(false)
    }

    const wasmName = usedSimd ? 'tflite-simd.wasm' : 'tflite.wasm'
    const tflite = await factory({
      locateFile: (path) => {
        const name = String(path).split('/').pop()
        if (name.endsWith('.wasm')) return `${VB_BASE}/${wasmName}`
        return `${VB_BASE}/${name}`
      },
    })

    if (!modelLoaded) {
      const modelRes = await fetch(`${VB_BASE}/selfie_segmentation_landscape.tflite`, {
        credentials: 'same-origin',
        cache: 'force-cache',
      })
      if (!modelRes.ok) throw new Error('Modelo de segmentação indisponível.')
      const modelBuffer = await modelRes.arrayBuffer()
      tflite.HEAPU8.set(new Uint8Array(modelBuffer), tflite._getModelBufferMemoryOffset())
      tflite._loadModel(modelBuffer.byteLength)
      modelLoaded = true
    }

    sharedTflite = tflite
    return tflite
  })().catch((err) => {
    tflitePromise = null
    sharedTflite = null
    modelLoaded = false
    throw err
  })

  return tflitePromise
}

/** Pré-carrega WASM + modelo (chamar no toque “Permitir câmera” no PWA). */
export async function preloadVirtualBackgroundEngine() {
  if (typeof window === 'undefined') return false
  try {
    await ensureTflite()
    return true
  } catch (err) {
    console.warn('[jitsi-vb] preload failed', err)
    return false
  }
}

export function createGradientDataUrl(colors = ['#1a2433', '#3d5668']) {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 540
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, colors[0] || '#1a2433')
  gradient.addColorStop(1, colors[1] || colors[0] || '#3d5668')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.88)
}

export function resolveBackgroundPresetUrl(preset) {
  if (!preset) return ''
  const url = String(preset.url || '').trim()
  if (url.startsWith('/') || url.startsWith('data:')) return url
  const colors = preset.colors || PRESET_GRADIENTS[preset.id]
  if (colors) return createGradientDataUrl(colors)
  return url
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!String(url).startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem de fundo.'))
    img.src = url
  })
}

function createTimerWorker() {
  const src = `
    let t = 0;
    onmessage = (e) => {
      if (e.data.id === 1) {
        clearTimeout(t);
        t = setTimeout(() => postMessage({ id: 3 }), e.data.timeMs);
      } else if (e.data.id === 2) {
        clearTimeout(t);
      }
    };
  `
  const blob = new Blob([src], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob), { name: 'cf-vb-timer' })
}

function createFrameScheduler(onFrame, fps = 24) {
  let running = false
  let worker = null
  let rafId = 0
  let last = 0
  const interval = 1000 / fps

  function startRafFallback() {
    const tick = (now) => {
      if (!running) return
      if (now - last >= interval) {
        last = now
        onFrame()
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    start() {
      running = true
      last = 0
      if (!isMobileBrowser()) {
        try {
          worker = createTimerWorker()
          worker.onmessage = (ev) => {
            if (ev.data?.id === 3 && running) {
              onFrame()
              worker?.postMessage({ id: 1, timeMs: interval })
            }
          }
          worker.postMessage({ id: 1, timeMs: interval })
          return
        } catch {
          worker = null
        }
      }
      startRafFallback()
    },
    stop() {
      running = false
      if (worker) {
        try { worker.postMessage({ id: 2 }) } catch { /* ignore */ }
        try { worker.terminate() } catch { /* ignore */ }
        worker = null
      }
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    },
  }
}

/**
 * @param {{ blurValue?: number, backgroundType?: 'blur'|'image', backgroundImageUrl?: string }} options
 */
export async function createBackgroundBlurEffect(options = {}) {
  const backgroundType = options.backgroundType === 'image' ? 'image' : 'blur'
  const blurValue = Math.max(8, Math.min(40, Number(options.blurValue) || 25))
  const imageUrl = String(options.backgroundImageUrl || '').trim()
  const tflite = await ensureTflite()

  let bgImage = null
  if (backgroundType === 'image' && imageUrl) {
    bgImage = await loadImage(imageUrl)
  }

  let inputVideo = null
  let outputCanvas = null
  let outputCtx = null
  let maskCanvas = null
  let maskCtx = null
  let segmentationMask = null
  let frameScheduler = null
  let running = false
  let outputStream = null
  let sourceStream = null

  function resizeSource() {
    if (!maskCtx || !inputVideo) return
    maskCtx.drawImage(
      inputVideo,
      0, 0, inputVideo.width, inputVideo.height,
      0, 0, SEG_W, SEG_H,
    )
    const imageData = maskCtx.getImageData(0, 0, SEG_W, SEG_H)
    const inputOffset = tflite._getInputMemoryOffset() / 4
    for (let i = 0; i < SEG_PIXELS; i++) {
      tflite.HEAPF32[inputOffset + (i * 3)] = imageData.data[i * 4] / 255
      tflite.HEAPF32[inputOffset + (i * 3) + 1] = imageData.data[(i * 4) + 1] / 255
      tflite.HEAPF32[inputOffset + (i * 3) + 2] = imageData.data[(i * 4) + 2] / 255
    }
  }

  function runInference() {
    tflite._runInference()
    const outputOffset = tflite._getOutputMemoryOffset() / 4
    for (let i = 0; i < SEG_PIXELS; i++) {
      const person = tflite.HEAPF32[outputOffset + i]
      segmentationMask.data[(i * 4) + 3] = 255 * person
    }
    maskCtx.putImageData(segmentationMask, 0, 0)
  }

  function runPostProcessing() {
    if (!outputCtx || !inputVideo || !sourceStream) return

    const track = sourceStream.getVideoTracks()[0]
    const settings = track?.getSettings?.() || track?.getConstraints?.() || {}
    const mobile = isMobileBrowser()
    const capW = mobile ? 640 : 1280
    const capH = mobile ? 480 : 720
    const width = Math.min(capW, Math.max(160, Number(settings.width) || inputVideo.width || 640))
    const height = Math.min(capH, Math.max(120, Number(settings.height) || inputVideo.height || 480))

    outputCanvas.width = width
    outputCanvas.height = height
    inputVideo.width = width
    inputVideo.height = height

    outputCtx.globalCompositeOperation = 'copy'
    outputCtx.filter = backgroundType === 'image' ? 'blur(4px)' : 'blur(8px)'
    outputCtx.drawImage(
      maskCanvas,
      0, 0, SEG_W, SEG_H,
      0, 0, inputVideo.width, inputVideo.height,
    )

    outputCtx.globalCompositeOperation = 'source-in'
    outputCtx.filter = 'none'
    outputCtx.drawImage(inputVideo, 0, 0)

    outputCtx.globalCompositeOperation = 'destination-over'
    if (bgImage) {
      outputCtx.drawImage(bgImage, 0, 0, outputCanvas.width, outputCanvas.height)
    } else {
      outputCtx.filter = `blur(${blurValue}px)`
      outputCtx.drawImage(inputVideo, 0, 0)
      outputCtx.filter = 'none'
    }
  }

  function renderFrame() {
    if (!running || !inputVideo || inputVideo.readyState < 2) return
    try {
      resizeSource()
      runInference()
      runPostProcessing()
    } catch {
      // frame skip
    }
  }

  function startTimer() {
    frameScheduler = createFrameScheduler(renderFrame, isMobileBrowser() ? 20 : 24)
    const kick = () => frameScheduler.start()
    if (inputVideo.readyState >= 2) kick()
    else inputVideo.onloadeddata = kick
  }

  return {
    isEnabled(track) {
      if (!track) return false
      try {
        if (typeof track.getType === 'function' && track.getType() !== 'video') return false
        if (typeof track.isVideoTrack === 'function' && !track.isVideoTrack()) return false
        if (track.videoType === 'desktop') return false
        return true
      } catch {
        return true
      }
    },

    startEffect(stream) {
      const videoTrack = stream?.getVideoTracks?.()?.[0]
      if (!videoTrack) return stream

      sourceStream = stream
      const settings = videoTrack.getSettings?.() || videoTrack.getConstraints?.() || {}
      const mobile = isMobileBrowser()
      const capW = mobile ? 640 : 1280
      const capH = mobile ? 480 : 720
      const width = Math.min(capW, Math.max(320, Number(settings.width) || 640))
      const height = Math.min(capH, Math.max(240, Number(settings.height) || 480))
      const frameRate = Math.min(mobile ? 24 : 30, Number(settings.frameRate) || 24)

      inputVideo = document.createElement('video')
      inputVideo.autoplay = true
      inputVideo.muted = true
      inputVideo.playsInline = true
      inputVideo.setAttribute('playsinline', 'true')
      inputVideo.width = width
      inputVideo.height = height
      inputVideo.srcObject = stream
      void inputVideo.play?.().catch(() => {})

      outputCanvas = document.createElement('canvas')
      outputCanvas.width = width
      outputCanvas.height = height
      outputCtx = outputCanvas.getContext('2d')

      maskCanvas = document.createElement('canvas')
      maskCanvas.width = SEG_W
      maskCanvas.height = SEG_H
      maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
      segmentationMask = new ImageData(SEG_W, SEG_H)

      running = true
      startTimer()

      if (typeof outputCanvas.captureStream !== 'function') {
        throw new Error('Seu navegador não suporta efeitos de fundo nesta chamada.')
      }
      outputStream = outputCanvas.captureStream(frameRate)
      return outputStream
    },

    stopEffect() {
      running = false
      if (frameScheduler) {
        frameScheduler.stop()
        frameScheduler = null
      }
      if (inputVideo) {
        inputVideo.onloadeddata = null
        try { inputVideo.srcObject = null } catch { /* ignore */ }
        inputVideo = null
      }
      if (outputStream) {
        try {
          outputStream.getTracks().forEach((t) => {
            try { t.stop() } catch { /* ignore */ }
          })
        } catch { /* ignore */ }
        outputStream = null
      }
      sourceStream = null
      outputCanvas = null
      outputCtx = null
      maskCanvas = null
      maskCtx = null
      segmentationMask = null
    },
  }
}

export const CF_BACKGROUND_PRESETS = [
  { id: 'office', label: 'Consultório', colors: PRESET_GRADIENTS.office },
  { id: 'shelf', label: 'Estante', colors: PRESET_GRADIENTS.shelf },
  { id: 'plant', label: 'Plantas', colors: PRESET_GRADIENTS.plant },
  { id: 'soft', label: 'Sala clara', colors: PRESET_GRADIENTS.soft },
]
