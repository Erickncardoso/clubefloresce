import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source = join(root, 'public/pwa/icon-source.svg')
const outDir = join(root, 'public/pwa')
const svg = readFileSync(source)

async function writeIcon(name, size, padding = 0) {
  const inner = size - padding * 2
  const png = await sharp(svg)
    .resize(inner, inner, { fit: 'contain', background: { r: 193, g: 123, b: 128, alpha: 1 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 193, g: 123, b: 128, alpha: 1 },
    })
    .png()
    .toBuffer()

  await writeFile(join(outDir, name), png)
}

await mkdir(outDir, { recursive: true })
await writeIcon('apple-touch-icon.png', 180)
await writeIcon('icon-192.png', 192)
await writeIcon('icon-512.png', 512)
await writeIcon('icon-512-maskable.png', 512, 64)

console.log('PWA icons generated in public/pwa/')
