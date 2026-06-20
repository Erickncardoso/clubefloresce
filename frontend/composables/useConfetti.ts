type ConfettiParticle = {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  rot: number
  vr: number
  color: string
  opacity: number
  released: boolean
}

const CONFETTI_COLORS = ['#5ba4d9', '#8B967C', '#6f7863', '#f5c842', '#8ed4f5', '#9aa88f', '#6eb5e0']

let activeCanvas: HTMLCanvasElement | null = null
let activeRaf = 0

function prefersReducedMotion() {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function createParticle(width: number): ConfettiParticle {
  return {
    x: Math.random() * width,
    y: -20,
    w: 5 + Math.random() * 8,
    h: 3 + Math.random() * 6,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 0.4 + Math.random() * 1,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    opacity: 1,
    released: false,
  }
}

function createParticles(width: number): ConfettiParticle[] {
  const count = Math.max(240, Math.min(400, Math.round(width / 1.8)))
  const particles: ConfettiParticle[] = []

  for (let i = 0; i < count; i += 1) {
    particles.push(createParticle(width))
  }

  return particles
}

function releaseBatch(particles: ConfettiParticle[], width: number, height: number, batchSize: number) {
  let released = 0
  for (let i = 0; i < particles.length && released < batchSize; i += 1) {
    const p = particles[i]
    if (p.released) continue
    p.released = true
    p.x = Math.random() * width
    p.y = -16 - Math.random() * height * 0.25
    released += 1
  }
}

function stopActiveConfetti() {
  if (activeRaf) cancelAnimationFrame(activeRaf)
  activeRaf = 0
  activeCanvas?.remove()
  activeCanvas = null
}

export function useConfetti() {
  function burstRain(durationMs = 7500) {
    if (!import.meta.client || prefersReducedMotion()) return

    stopActiveConfetti()

    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.className = 'cf-confetti-canvas'
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999',
    })
    document.body.appendChild(canvas)
    activeCanvas = canvas

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      stopActiveConfetti()
      return
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const particles = createParticles(canvas.width)
    const batchSize = Math.max(22, Math.round(particles.length / 14))
    const spawnInterval = 320
    const start = performance.now()
    let nextSpawnAt = start

    const tick = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      while (now >= nextSpawnAt) {
        releaseBatch(particles, canvas.width, canvas.height, batchSize)
        nextSpawnAt += spawnInterval
        if (nextSpawnAt - start > durationMs * 0.55) break
      }

      let alive = 0
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        if (!p.released) continue

        p.x += p.vx
        p.y += p.vy
        p.vy += 0.012
        p.vx += Math.sin((now + i * 60) / 1000) * 0.01
        p.rot += p.vr

        if (p.y < canvas.height + 60) alive += 1

        if (elapsed > durationMs * 0.75) {
          p.opacity = Math.max(0, 1 - (elapsed - durationMs * 0.75) / (durationMs * 0.25))
        }

        if (p.opacity <= 0) continue

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (elapsed < durationMs && alive > 0) {
        activeRaf = requestAnimationFrame(tick)
        return
      }

      window.removeEventListener('resize', resize)
      stopActiveConfetti()
    }

    releaseBatch(particles, canvas.width, canvas.height, batchSize)
    nextSpawnAt = start + spawnInterval

    window.addEventListener('resize', resize)
    activeRaf = requestAnimationFrame(tick)
  }

  return { burstRain }
}
