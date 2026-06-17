import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public/pwa')
const pngSource = join(outDir, 'icon-source.png')
const svgSource = join(outDir, 'icon-source.svg')

/** Fundo creme da logo oficial do app paciente. */
const BRAND_BG = { r: 247, g: 243, b: 240, alpha: 1 }

function loadSource() {
  if (existsSync(pngSource)) {
    return readFileSync(pngSource)
  }
  if (existsSync(svgSource)) {
    return readFileSync(svgSource)
  }
  throw new Error('Nenhuma fonte encontrada em public/pwa/icon-source.png ou icon-source.svg')
}

async function writeSquareIcon(name, size) {
  const png = await sharp(loadSource())
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  await writeFile(join(outDir, name), png)
}

async function writeMaskableIcon(name, size, padding = 48) {
  const inner = size - padding * 2
  const png = await sharp(loadSource())
    .resize(inner, inner, { fit: 'contain', background: BRAND_BG })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: BRAND_BG,
    })
    .png()
    .toBuffer()

  await writeFile(join(outDir, name), png)
}

await mkdir(outDir, { recursive: true })
await writeSquareIcon('apple-touch-icon.png', 180)
await writeSquareIcon('icon-192.png', 192)
await writeSquareIcon('icon-512.png', 512)
await writeMaskableIcon('icon-512-maskable.png', 512)

console.log('PWA icons generated in public/pwa/')
